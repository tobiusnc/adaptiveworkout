// src/store/useAppStore.ts
// Global Zustand store.  Single source of truth for in-memory app state.
//
// Lifecycle:
//   1. _layout.tsx creates OpSqliteStorageService and calls store.initialize(service).
//   2. initialize() opens the DB, loads profile + active plan into the store.
//   3. HomeScreen calls loadSessions(planId) to populate the session list.
//   4. Screens call loadSession(id) when the user selects a session — lazy load only.
//   5. Write-through actions (saveProfile, savePlan, …) are added per phase as needed.
//
// Testability:
//   Inject a mock via useAppStore.setState({ storageService: mockService }) before each test.
//   No import of the concrete OpSqliteStorageService inside this file.

import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import type { StorageService } from '../storage/StorageService';
import type {
  UserProfile,
  Plan,
  Session,
  Exercise,
  GeneratePlanOutput,
  ExerciseDraft,
} from '../types/index';

// ── State shape ───────────────────────────────────────────────────────────────

interface AppState {
  // ── Infrastructure ──────────────────────────────────────────────────────────
  storageService: StorageService | null;

  // ── Startup ─────────────────────────────────────────────────────────────────
  // isInitializing starts true so _layout.tsx renders nothing until init completes.
  isInitializing: boolean;
  initError: string | null;

  // ── User data ────────────────────────────────────────────────────────────────
  profile: UserProfile | null;
  activePlan: Plan | null;

  // ── Home screen session list (loaded after init when activePlan is set) ──────
  planSessions: Session[];

  // ── Active session (lazy — loaded only when user selects a session) ──────────
  currentSession: Session | null;
  currentExercises: Exercise[];
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface AppActions {
  // Called once from _layout.tsx at startup.
  // Stores the service reference, initializes the DB, and loads startup data.
  initialize: (service: StorageService) => Promise<void>;

  // Called from HomeScreen after init when activePlan is available.
  // Populates planSessions for the session list.
  loadSessions: (planId: string) => Promise<void>;

  // Called when the user selects a session to execute.
  // Loads the Session record and all its Exercise records into the store.
  loadSession: (sessionId: string) => Promise<void>;

  // Called when the user leaves the session screen.
  clearCurrentSession: () => void;

  // Called from the onboarding screen after the user answers all questions.
  // Saves the profile to storage and updates store state.
  saveProfile: (profile: UserProfile) => Promise<void>;

  // Called from the onboarding screen after generatePlan() returns successfully.
  // Converts GeneratePlanOutput drafts to full entities (assigns IDs + timestamps),
  // writes them to storage, and updates activePlan in the store.
  //
  // betweenRoundExercise inline in each SessionDraft is extracted into a separate
  // Exercise record (phase: null) and linked via Session.betweenRoundExerciseId.
  //
  // Store state is updated directly — initialize() is NOT re-run — to avoid the
  // isInitializing flash and unnecessary DB re-reads (we already have all data).
  savePlanFromDraft: (output: GeneratePlanOutput) => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
  storageService: null,
  isInitializing: true,
  initError: null,
  profile: null,
  activePlan: null,
  planSessions: [],
  currentSession: null,
  currentExercises: [],

  // ── initialize ───────────────────────────────────────────────────────────────
  initialize: async (service: StorageService): Promise<void> => {
    set({ storageService: service });
    try {
      await service.initialize();
      const profile = await service.getProfile();
      const activePlan = await service.getActivePlan();
      set({ profile, activePlan, isInitializing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isInitializing: false, initError: message });
    }
  },

  // ── loadSessions ─────────────────────────────────────────────────────────────
  loadSessions: async (planId: string): Promise<void> => {
    const { storageService } = get();
    if (storageService === null) {
      throw new Error('StorageService is not initialized — call initialize() first.');
    }
    const sessions = await storageService.getSessionsByPlan(planId);
    set({ planSessions: sessions });
  },

  // ── loadSession ──────────────────────────────────────────────────────────────
  loadSession: async (sessionId: string): Promise<void> => {
    const { storageService } = get();
    if (storageService === null) {
      throw new Error('StorageService is not initialized — call initialize() first.');
    }
    const session = await storageService.getSession(sessionId);
    if (session === null) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const exercises = await storageService.getExercisesBySession(sessionId);
    set({ currentSession: session, currentExercises: exercises });
  },

  // ── clearCurrentSession ──────────────────────────────────────────────────────
  clearCurrentSession: (): void => {
    set({ currentSession: null, currentExercises: [] });
  },

  // ── saveProfile ───────────────────────────────────────────────────────────────
  saveProfile: async (profile: UserProfile): Promise<void> => {
    const { storageService } = get();
    if (storageService === null) {
      throw new Error('StorageService not initialized — call initialize() first.');
    }
    await storageService.saveProfile(profile);
    set({ profile });
  },

  // ── savePlanFromDraft ─────────────────────────────────────────────────────────
  savePlanFromDraft: async (output: GeneratePlanOutput): Promise<void> => {
    const { storageService } = get();
    if (storageService === null) {
      throw new Error('StorageService not initialized — call initialize() first.');
    }

    // ── Phase 1: assemble all entities in memory ──────────────────────────────
    // All UUIDs are generated before any storage call.  If the transaction
    // fails and the caller retries, new UUIDs are generated — the rolled-back
    // rows are gone, so there is no conflict and no orphaned data.

    const now = new Date().toISOString();
    const planId = Crypto.randomUUID();

    const plan: Plan = {
      id: planId,
      schemaVersion: output.schemaVersion,
      userId: null,
      name: output.plan.name,
      description: output.plan.description,
      isActive: true,
      config: output.plan.config,
      createdAt: now,
      updatedAt: now,
    };

    const sessions: Session[] = [];
    const exercises: Exercise[] = [];

    for (const sessionDraft of output.sessions) {
      const sessionId = Crypto.randomUUID();

      // betweenRoundExercise: inline draft → separate Exercise row (phase: null),
      // inserted before its parent session so foreign-key ordering is satisfied.
      let betweenRoundExerciseId: string | null = null;
      if (sessionDraft.betweenRoundExercise !== null) {
        const betweenId = Crypto.randomUUID();
        const src: ExerciseDraft = sessionDraft.betweenRoundExercise;
        exercises.push({
          id: betweenId,
          schemaVersion: output.schemaVersion,
          sessionId,
          phase: src.phase,
          order: src.order,
          name: src.name,
          type: src.type,
          durationSec: src.durationSec,
          reps: src.reps,
          weight: src.weight,
          equipment: src.equipment,
          formCues: src.formCues,
          youtubeSearchQuery: src.youtubeSearchQuery,
          isBilateral: src.isBilateral,
        });
        betweenRoundExerciseId = betweenId;
      }

      sessions.push({
        id: sessionId,
        schemaVersion: output.schemaVersion,
        planId,
        name: sessionDraft.name,
        type: sessionDraft.type,
        orderInPlan: sessionDraft.orderInPlan,
        rounds: sessionDraft.rounds,
        estimatedDurationMinutes: sessionDraft.estimatedDurationMinutes,
        workSec: sessionDraft.workSec,
        restBetweenExSec: sessionDraft.restBetweenExSec,
        stretchBetweenRoundsSec: sessionDraft.stretchBetweenRoundsSec,
        restBetweenRoundsSec: sessionDraft.restBetweenRoundsSec,
        warmupDelayBetweenItemsSec: sessionDraft.warmupDelayBetweenItemsSec,
        cooldownDelayBetweenItemsSec: sessionDraft.cooldownDelayBetweenItemsSec,
        betweenRoundExerciseId,
      });

      for (const exDraft of sessionDraft.exercises) {
        exercises.push({
          id: Crypto.randomUUID(),
          schemaVersion: output.schemaVersion,
          sessionId,
          phase: exDraft.phase,
          order: exDraft.order,
          name: exDraft.name,
          type: exDraft.type,
          durationSec: exDraft.durationSec,
          reps: exDraft.reps,
          weight: exDraft.weight,
          equipment: exDraft.equipment,
          formCues: exDraft.formCues,
          youtubeSearchQuery: exDraft.youtubeSearchQuery,
          isBilateral: exDraft.isBilateral,
        });
      }
    }

    // ── Phase 2: write atomically ─────────────────────────────────────────────
    // savePlanComplete wraps all inserts in a single SQLite transaction.
    // Any failure rolls back everything — DB is clean for a retry.
    await storageService.savePlanComplete(plan, sessions, exercises);

    // Update store directly — no re-run of initialize() to avoid isInitializing flash.
    set({ activePlan: plan });
  },
}));

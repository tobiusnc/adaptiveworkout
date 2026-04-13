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

import { logger } from '../utils/logger';
import type { StorageService } from '../storage/StorageService';
import type {
  UserProfile,
  Plan,
  Session,
  Exercise,
  GeneratePlanOutput,
  ExerciseDraft,
  SessionFeedback,
  PlanContextRecord,
  ModifyPlanOutput,
  ConversationMessage,
} from '../types/index';
import {
  summarizeContextRecord,
  SummarizeContextRecordError,
} from '../ai/summarizeContextRecord';

// ── Entity assembly helpers ───────────────────────────────────────────────────
// Pure functions that build fully-typed entities from AI output drafts.
// Called by savePlanFromDraft before the storage transaction begins.

function buildExerciseEntity(
  draft: ExerciseDraft,
  sessionId: string,
  schemaVersion: number,
): Exercise {
  return {
    id: Crypto.randomUUID(),
    schemaVersion,
    sessionId,
    phase: draft.phase,
    order: draft.order,
    name: draft.name,
    type: draft.type,
    durationSec: draft.durationSec,
    reps: draft.reps,
    weight: draft.weight,
    equipment: draft.equipment,
    formCues: draft.formCues,
    youtubeSearchQuery: draft.youtubeSearchQuery,
    isBilateral: draft.isBilateral,
  };
}

function assemblePlanEntities(
  output: GeneratePlanOutput,
): { plan: Plan; sessions: Session[]; exercises: Exercise[] } {
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
      const betweenExercise = buildExerciseEntity(
        sessionDraft.betweenRoundExercise,
        sessionId,
        output.schemaVersion,
      );
      exercises.push(betweenExercise);
      betweenRoundExerciseId = betweenExercise.id;
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
      exercises.push(buildExerciseEntity(exDraft, sessionId, output.schemaVersion));
    }
  }

  return { plan, sessions, exercises };
}

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

  // ── Post-session feedback ─────────────────────────────────────────────────────
  // Set by the session execution screen before navigating to the feedback screen.
  // Cleared by saveFeedback() or setPendingFeedback(null) (skip).
  // The feedback screen guards against null on mount (direct navigation protection).
  pendingFeedback: { sessionId: string; isComplete: boolean } | null;
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

  // Called from the feedback screen after the user submits a comment.
  // Reads pendingFeedback from state, constructs a SessionFeedback entity,
  // persists it to storage, and clears pendingFeedback to null.
  // Throws if storageService is not initialized or if pendingFeedback is null.
  saveFeedback: (commentText: string | null) => Promise<void>;

  // Sets or clears pendingFeedback. Call before navigating to /session/feedback
  // (set) or when the user taps Skip (null).
  setPendingFeedback: (value: { sessionId: string; isComplete: boolean } | null) => void;

  // Called from plan-chat screen on mount to load all data needed for the
  // modifyPlan API call in a single round-trip.
  loadPlanChatData: (planId: string) => Promise<{
    contextRecord: PlanContextRecord | null;
    recentFeedback: SessionFeedback[];
    allExercises: Exercise[];
  }>;

  // Called from plan-chat screen when the user confirms "Apply Change".
  // Writes the modification to storage, conditionally summarises the context
  // record if it exceeds 3 000 chars, then refreshes planSessions in the store.
  // Summarisation failure is non-blocking: logged and skipped.
  applyModification: (
    planId: string,
    output: ModifyPlanOutput,
    conversation: ConversationMessage[],
  ) => Promise<void>;
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
  pendingFeedback: null,

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
    // All UUIDs are generated before any storage call. If the transaction fails
    // and the caller retries, assemblePlanEntities generates new UUIDs — the
    // rolled-back rows are gone, so there is no conflict and no orphaned data.
    const { plan, sessions, exercises } = assemblePlanEntities(output);

    // savePlanComplete wraps all inserts in a single SQLite transaction.
    // Any failure rolls back everything — DB is clean for a retry.
    await storageService.savePlanComplete(plan, sessions, exercises);

    // Update store directly — no re-run of initialize() to avoid isInitializing flash.
    set({ activePlan: plan });
  },

  // ── setPendingFeedback ────────────────────────────────────────────────────────
  // Lightweight synchronous setter — no storage interaction.
  // Analogous to setting a plain member variable before a function call in C++.
  setPendingFeedback: (value: { sessionId: string; isComplete: boolean } | null): void => {
    set({ pendingFeedback: value });
  },

  // ── saveFeedback ──────────────────────────────────────────────────────────────
  // Reads pendingFeedback from current state, constructs a SessionFeedback entity
  // (all MVP-deferred fields set to null), persists to storage, then clears
  // pendingFeedback so the feedback screen cannot be reached again without a new
  // session completing.
  //
  // Error propagation: throws — the caller (feedback screen) is responsible for
  // catching and displaying the error to the user.
  saveFeedback: async (commentText: string | null): Promise<void> => {
    const { storageService, pendingFeedback } = get();
    if (storageService === null) {
      throw new Error('StorageService not initialized — call initialize() first.');
    }
    if (pendingFeedback === null) {
      throw new Error('saveFeedback called with no pendingFeedback in store.');
    }

    const feedback: SessionFeedback = {
      id: Crypto.randomUUID(),
      schemaVersion: 1,
      sessionId: pendingFeedback.sessionId,
      completedAt: new Date().toISOString(),
      isComplete: pendingFeedback.isComplete,
      commentText,
      effortRating: null,
      hrLog: null,
    };

    await storageService.saveFeedback(feedback);

    // Clear pendingFeedback after successful persistence so the feedback screen
    // cannot double-submit if the user navigates back unexpectedly.
    set({ pendingFeedback: null });
  },

  // ── loadPlanChatData ──────────────────────────────────────────────────────────
  // Fetches the three inputs needed by modifyPlan in parallel.
  loadPlanChatData: async (planId: string): Promise<{
    contextRecord: PlanContextRecord | null;
    recentFeedback: SessionFeedback[];
    allExercises: Exercise[];
  }> => {
    const { storageService } = get();
    if (storageService === null) {
      throw new Error('StorageService not initialized — call initialize() first.');
    }
    const [contextRecord, recentFeedback, allExercises] = await Promise.all([
      storageService.getContextRecord(planId),
      storageService.getRecentFeedback(5),
      storageService.getExercisesByPlan(planId),
    ]);
    return { contextRecord, recentFeedback, allExercises };
  },

  // ── applyModification ─────────────────────────────────────────────────────────
  // 1. Writes the diff to the DB atomically.
  // 2. If contextRecordUpdate is provided and exceeds 3 000 chars, condenses it
  //    via summarizeContextRecord and saves the condensed version.
  // 3. Refreshes planSessions so the home screen shows updated data immediately.
  applyModification: async (
    planId: string,
    output: ModifyPlanOutput,
    conversation: ConversationMessage[],
  ): Promise<void> => {
    const { storageService, loadSessions } = get();
    if (storageService === null) {
      throw new Error('StorageService not initialized — call initialize() first.');
    }

    await storageService.applyPlanModification(planId, output);

    // Refresh activePlan so plan-level changes (name, description, config) are
    // reflected in the store immediately — not just after the next app launch.
    const updatedPlan = await storageService.getPlan(planId);
    if (updatedPlan !== null) {
      set({ activePlan: updatedPlan });
    }

    if (output.contextRecordUpdate !== null && output.contextRecordUpdate.length > 3000) {
      try {
        const summaryResult = await summarizeContextRecord({
          schemaVersion: 1,
          currentRecord: {
            id: '',
            schemaVersion: 1,
            planId,
            content: output.contextRecordUpdate,
            updatedAt: new Date().toISOString(),
          },
          conversation,
        });
        const existing = await storageService.getContextRecord(planId);
        const now = new Date().toISOString();
        if (existing !== null) {
          await storageService.updateContextRecord({
            ...existing,
            content: summaryResult.content,
            updatedAt: now,
          });
        } else {
          await storageService.saveContextRecord({
            id: Crypto.randomUUID(),
            schemaVersion: 1,
            planId,
            content: summaryResult.content,
            updatedAt: now,
          });
        }
      } catch (err) {
        if (!(err instanceof SummarizeContextRecordError)) {
          throw err;
        }
        // SummarizeContextRecordError is non-blocking — log and continue.
        logger.error('summarizeContextRecord failed; retaining full context record.', { err });
      }
    }

    await loadSessions(planId);
  },
}));

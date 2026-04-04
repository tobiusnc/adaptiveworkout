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

import { create } from 'zustand';

import type { StorageService } from '../storage/StorageService';
import type { UserProfile, Plan, Session, Exercise } from '../types/index';

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
}));

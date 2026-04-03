// src/storage/StorageService.ts
// Abstract interface for the storage layer.
// Concrete implementations (e.g. OpSqliteStorageService) implement this interface.
//
// Design contract:
//   - All methods are async (Promise<T>).
//   - "Not found" returns null — never throws.
//   - Actual failures (DB error, crypto failure, corrupt data) throw StorageError.
//   - initialize() must be called exactly once before any other method.

import type {
  UserProfile,
  Plan,
  Session,
  Exercise,
  SessionFeedback,
  PlanContextRecord,
} from '../types/index';

export interface StorageService {
  // Must be called before any other method.
  // Handles: load/generate encryption key → open DB → create tables.
  initialize(): Promise<void>;

  // ── UserProfile ──────────────────────────────────────────────────────────────
  // Single profile — no multi-user in MVP.

  saveProfile(profile: UserProfile): Promise<void>;
  getProfile(): Promise<UserProfile | null>;
  updateProfile(profile: UserProfile): Promise<void>;
  deleteProfile(id: string): Promise<void>;

  // ── Plan ─────────────────────────────────────────────────────────────────────

  savePlan(plan: Plan): Promise<void>;
  getPlan(id: string): Promise<Plan | null>;

  // Returns the single plan where is_active = 1, or null if none is active.
  getActivePlan(): Promise<Plan | null>;

  getAllPlans(): Promise<Plan[]>;
  updatePlan(plan: Plan): Promise<void>;
  deletePlan(id: string): Promise<void>;

  // ── Session ──────────────────────────────────────────────────────────────────

  saveSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  getSessionsByPlan(planId: string): Promise<Session[]>;
  updateSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;

  // ── Exercise ─────────────────────────────────────────────────────────────────

  saveExercise(exercise: Exercise): Promise<void>;
  getExercise(id: string): Promise<Exercise | null>;
  getExercisesBySession(sessionId: string): Promise<Exercise[]>;
  updateExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;

  // ── SessionFeedback ──────────────────────────────────────────────────────────

  saveFeedback(feedback: SessionFeedback): Promise<void>;
  getFeedback(id: string): Promise<SessionFeedback | null>;

  // Returns null if no feedback exists for the given session.
  getFeedbackBySession(sessionId: string): Promise<SessionFeedback | null>;

  // Returns up to `limit` feedback records ordered by completedAt DESC.
  getRecentFeedback(limit: number): Promise<SessionFeedback[]>;

  updateFeedback(feedback: SessionFeedback): Promise<void>;
  deleteFeedback(id: string): Promise<void>;

  // ── PlanContextRecord ────────────────────────────────────────────────────────

  saveContextRecord(record: PlanContextRecord): Promise<void>;
  getContextRecord(planId: string): Promise<PlanContextRecord | null>;
  updateContextRecord(record: PlanContextRecord): Promise<void>;
  deleteContextRecord(id: string): Promise<void>;
}

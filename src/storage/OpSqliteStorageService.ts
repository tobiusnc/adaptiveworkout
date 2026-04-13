// src/storage/OpSqliteStorageService.ts
// Concrete storage implementation using op-sqlite (SQLCipher) + expo-secure-store.
//
// Lifecycle:
//   1. Call initialize() once at app startup.
//   2. initialize() loads (or generates) the encryption key from SecureStore.
//   3. initialize() opens the encrypted SQLite DB.
//   4. initialize() runs CREATE TABLE IF NOT EXISTS for every table.
//   5. All subsequent method calls use the open DB handle.
//
// Threading note: op-sqlite's db.execute() is async (returns Promise<QueryResult>).
// Wrap every call in try/catch and re-throw as StorageError so
// callers never see raw native exceptions.

import { open } from '@op-engineering/op-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type {
  UserProfile,
  Plan,
  PlanConfig,
  Session,
  Exercise,
  ExercisePhase,
  SessionFeedback,
  PlanContextRecord,
  PrimaryGoal,
  TargetDuration,
  FitnessLevel,
  SessionType,
  StepType,
  ModifyPlanOutput,
} from '../types/index';

import type { StorageService } from './StorageService';
import { StorageError } from './StorageError';
import { logger } from '../utils/logger';

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME = 'adaptive_workout.db';
const SECURE_STORE_KEY = 'db_encryption_key';
const ENCRYPTION_KEY_HEX_LENGTH = 64; // 32 bytes expressed as hex

// ── Row shape types ───────────────────────────────────────────────────────────
// op-sqlite returns plain objects. We give them explicit types so the compiler
// can verify every field access — analogous to casting a void* to a typed struct.

interface ProfileRow {
  id: string;
  schema_version: number;
  primary_goal: string;
  equipment: string;
  sessions_per_week: number;
  target_duration: string;
  fitness_level: string;
  limitations: string;
  additional_context: string | null;
  age: number | null;
  biological_sex: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  target_weight_kg: number | null;
  dietary_notes: string | null;
  user_id: string | null;
  created_at: string;
}

interface PlanRow {
  id: string;
  schema_version: number;
  user_id: string | null;
  name: string;
  description: string;
  is_active: number;
  default_work_sec: number;
  rest_between_ex_sec: number;
  stretch_between_rounds_sec: number;
  rest_between_rounds_sec: number;
  warmup_delay_between_items_sec: number;
  cooldown_delay_between_items_sec: number;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  schema_version: number;
  plan_id: string;
  name: string;
  type: string;
  order_in_plan: number;
  rounds: number;
  estimated_duration_minutes: number;
  work_sec: number;
  rest_between_ex_sec: number;
  stretch_between_rounds_sec: number;
  rest_between_rounds_sec: number;
  warmup_delay_between_items_sec: number;
  cooldown_delay_between_items_sec: number;
  between_round_exercise_id: string | null;
}

interface ExerciseRow {
  id: string;
  schema_version: number;
  session_id: string;
  phase: string | null;
  order_num: number;
  name: string;
  type: string;
  duration_sec: number | null;
  reps: number | null;
  weight: string | null;
  equipment: string;
  form_cues: string;
  youtube_search_query: string | null;
  is_bilateral: number;
}

interface FeedbackRow {
  id: string;
  schema_version: number;
  session_id: string;
  completed_at: string;
  is_complete: number;
  comment_text: string | null;
  effort_rating: number | null;
  hr_log: string | null;
}

interface ContextRecordRow {
  id: string;
  schema_version: number;
  plan_id: string;
  content: string;
  updated_at: string;
}

// ── Row → typed object mappers ────────────────────────────────────────────────
// These are pure functions — no DB access. They throw StorageError with tag
// PARSE_FAILED if any value cannot be safely coerced to the expected type.

function rowToProfile(row: ProfileRow): UserProfile {
  let equipment: string[];
  try {
    equipment = JSON.parse(row.equipment) as string[];
  } catch (cause) {
    throw new StorageError(
      `Failed to parse equipment JSON for profile ${row.id}`,
      'PARSE_FAILED',
      cause,
    );
  }

  return {
    id: row.id,
    schemaVersion: row.schema_version,
    primaryGoal: row.primary_goal as PrimaryGoal,
    equipment,
    sessionsPerWeek: row.sessions_per_week,
    targetDuration: row.target_duration as TargetDuration,
    fitnessLevel: row.fitness_level as FitnessLevel,
    limitations: row.limitations,
    additionalContext: row.additional_context,
    age: row.age,
    biologicalSex: row.biological_sex,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    targetWeightKg: row.target_weight_kg,
    dietaryNotes: row.dietary_notes,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

function rowToPlan(row: PlanRow): Plan {
  const config: PlanConfig = {
    defaultWorkSec: row.default_work_sec,
    restBetweenExSec: row.rest_between_ex_sec,
    stretchBetweenRoundsSec: row.stretch_between_rounds_sec,
    restBetweenRoundsSec: row.rest_between_rounds_sec,
    warmupDelayBetweenItemsSec: row.warmup_delay_between_items_sec,
    cooldownDelayBetweenItemsSec: row.cooldown_delay_between_items_sec,
  };

  return {
    id: row.id,
    schemaVersion: row.schema_version,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active !== 0,
    config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    planId: row.plan_id,
    name: row.name,
    type: row.type as SessionType,
    orderInPlan: row.order_in_plan,
    rounds: row.rounds,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    workSec: row.work_sec,
    restBetweenExSec: row.rest_between_ex_sec,
    stretchBetweenRoundsSec: row.stretch_between_rounds_sec,
    restBetweenRoundsSec: row.rest_between_rounds_sec,
    warmupDelayBetweenItemsSec: row.warmup_delay_between_items_sec,
    cooldownDelayBetweenItemsSec: row.cooldown_delay_between_items_sec,
    betweenRoundExerciseId: row.between_round_exercise_id,
  };
}

function rowToExercise(row: ExerciseRow): Exercise {
  let formCues: string[];
  try {
    formCues = JSON.parse(row.form_cues) as string[];
  } catch (cause) {
    throw new StorageError(
      `Failed to parse form_cues JSON for exercise ${row.id}`,
      'PARSE_FAILED',
      cause,
    );
  }

  // ExercisePhase is 'warmup' | 'main' | 'cooldown' | null
  const phase: ExercisePhase =
    row.phase === null ? null : (row.phase as Exclude<ExercisePhase, null>);

  return {
    id: row.id,
    schemaVersion: row.schema_version,
    sessionId: row.session_id,
    phase,
    order: row.order_num,
    name: row.name,
    type: row.type as StepType,
    durationSec: row.duration_sec,
    reps: row.reps,
    weight: row.weight,
    equipment: row.equipment,
    formCues,
    youtubeSearchQuery: row.youtube_search_query,
    isBilateral: row.is_bilateral !== 0,
  };
}

function rowToFeedback(row: FeedbackRow): SessionFeedback {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    sessionId: row.session_id,
    completedAt: row.completed_at,
    isComplete: row.is_complete !== 0,
    commentText: row.comment_text,
    effortRating: row.effort_rating,
    hrLog: row.hr_log,
  };
}

function rowToContextRecord(row: ContextRecordRow): PlanContextRecord {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    planId: row.plan_id,
    content: row.content,
    updatedAt: row.updated_at,
  };
}

// ── Key generation ────────────────────────────────────────────────────────────
// Produces a 64-character lowercase hex string (32 bytes of CSPRNG entropy).

async function generateHexKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(ENCRYPTION_KEY_HEX_LENGTH / 2);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── DB handle type ────────────────────────────────────────────────────────────
// op-sqlite does not export its DB type — we capture it via ReturnType.
// This is the same pattern as storing an opaque handle in C++ (e.g. HANDLE on Win32).

type OPSQLiteDB = ReturnType<typeof open>;

// ── CREATE TABLE statements ───────────────────────────────────────────────────

const CREATE_USER_PROFILE_TABLE = `
  CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    primary_goal TEXT NOT NULL,
    equipment TEXT NOT NULL,
    sessions_per_week INTEGER NOT NULL,
    target_duration TEXT NOT NULL,
    fitness_level TEXT NOT NULL,
    limitations TEXT NOT NULL,
    additional_context TEXT,
    age INTEGER,
    biological_sex TEXT,
    weight_kg REAL,
    height_cm REAL,
    target_weight_kg REAL,
    dietary_notes TEXT,
    user_id TEXT,
    created_at TEXT NOT NULL
  )
`.trim();

const CREATE_PLAN_TABLE = `
  CREATE TABLE IF NOT EXISTS plan (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active INTEGER NOT NULL,
    default_work_sec INTEGER NOT NULL,
    rest_between_ex_sec INTEGER NOT NULL,
    stretch_between_rounds_sec INTEGER NOT NULL,
    rest_between_rounds_sec INTEGER NOT NULL,
    warmup_delay_between_items_sec INTEGER NOT NULL,
    cooldown_delay_between_items_sec INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`.trim();

const CREATE_SESSION_TABLE = `
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    order_in_plan INTEGER NOT NULL,
    rounds INTEGER NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    work_sec INTEGER NOT NULL,
    rest_between_ex_sec INTEGER NOT NULL,
    stretch_between_rounds_sec INTEGER NOT NULL,
    rest_between_rounds_sec INTEGER NOT NULL,
    warmup_delay_between_items_sec INTEGER NOT NULL,
    cooldown_delay_between_items_sec INTEGER NOT NULL,
    between_round_exercise_id TEXT
  )
`.trim();

const CREATE_EXERCISE_TABLE = `
  CREATE TABLE IF NOT EXISTS exercise (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    phase TEXT,
    order_num INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    duration_sec INTEGER,
    reps INTEGER,
    weight TEXT,
    equipment TEXT NOT NULL,
    form_cues TEXT NOT NULL,
    youtube_search_query TEXT,
    is_bilateral INTEGER NOT NULL
  )
`.trim();

const CREATE_SESSION_FEEDBACK_TABLE = `
  CREATE TABLE IF NOT EXISTS session_feedback (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    is_complete INTEGER NOT NULL,
    comment_text TEXT,
    effort_rating INTEGER,
    hr_log TEXT
  )
`.trim();

const CREATE_PLAN_CONTEXT_RECORD_TABLE = `
  CREATE TABLE IF NOT EXISTS plan_context_record (
    id TEXT PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    plan_id TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`.trim();

// ── OpSqliteStorageService ────────────────────────────────────────────────────

export class OpSqliteStorageService implements StorageService {
  // The DB handle is null until initialize() succeeds.
  // Accessing it before initialization is a programming error — assertDb() guards every method.
  private db: OPSQLiteDB | null = null;

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const encryptionKey = await this.loadOrGenerateKey();
    this.db = this.openDatabase(encryptionKey);
    await this.createTables();
  }

  // Loads the encryption key from SecureStore; generates and stores one if absent.
  private async loadOrGenerateKey(): Promise<string> {
    try {
      const existingKey = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (existingKey !== null) {
        return existingKey;
      }
      const newKey = await generateHexKey();
      await SecureStore.setItemAsync(SECURE_STORE_KEY, newKey, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      return newKey;
    } catch (cause) {
      throw new StorageError(
        'Failed to load or generate DB encryption key from SecureStore',
        'CRYPTO_FAILED',
        cause,
      );
    }
  }

  // Opens the SQLCipher-encrypted database. Throws StorageError on failure.
  private openDatabase(encryptionKey: string): OPSQLiteDB {
    try {
      return open({ name: DB_NAME, encryptionKey });
    } catch (cause) {
      throw new StorageError(
        `Failed to open encrypted database "${DB_NAME}"`,
        'DB_INIT_FAILED',
        cause,
      );
    }
  }

  // Runs all CREATE TABLE IF NOT EXISTS statements. Called once after DB open.
  private async createTables(): Promise<void> {
    const db = this.assertDb();
    const statements = [
      CREATE_USER_PROFILE_TABLE,
      CREATE_PLAN_TABLE,
      CREATE_SESSION_TABLE,
      CREATE_EXERCISE_TABLE,
      CREATE_SESSION_FEEDBACK_TABLE,
      CREATE_PLAN_CONTEXT_RECORD_TABLE,
    ];
    try {
      for (const sql of statements) {
        await db.execute(sql);
      }
    } catch (cause) {
      throw new StorageError(
        'Failed to create one or more database tables',
        'DB_INIT_FAILED',
        cause,
      );
    }
  }

  // Asserts that the DB is open and returns the handle.
  // Analogous to a null-check dereference guard — throws if called before initialize().
  private assertDb(): OPSQLiteDB {
    if (this.db === null) {
      throw new StorageError(
        'StorageService.initialize() must be called before any data access',
        'DB_INIT_FAILED',
      );
    }
    return this.db;
  }

  // ── UserProfile ─────────────────────────────────────────────────────────────

  async saveProfile(profile: UserProfile): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `INSERT OR REPLACE INTO user_profile (
          id, schema_version, primary_goal, equipment, sessions_per_week,
          target_duration, fitness_level, limitations, additional_context,
          age, biological_sex, weight_kg, height_cm, target_weight_kg,
          dietary_notes, user_id, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          profile.id,
          profile.schemaVersion,
          profile.primaryGoal,
          JSON.stringify(profile.equipment),
          profile.sessionsPerWeek,
          profile.targetDuration,
          profile.fitnessLevel,
          profile.limitations,
          profile.additionalContext,
          profile.age,
          profile.biologicalSex,
          profile.weightKg,
          profile.heightCm,
          profile.targetWeightKg,
          profile.dietaryNotes,
          profile.userId,
          profile.createdAt,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to save UserProfile', 'QUERY_FAILED', cause);
    }
  }

  async getProfile(): Promise<UserProfile | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM user_profile LIMIT 1');
      const rows = (result.rows ?? []) as unknown as ProfileRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToProfile(rows[0]);
    } catch (cause) {
      if (cause instanceof StorageError) {
        throw cause;
      }
      throw new StorageError('Failed to get UserProfile', 'QUERY_FAILED', cause);
    }
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `UPDATE user_profile SET
          schema_version=?, primary_goal=?, equipment=?, sessions_per_week=?,
          target_duration=?, fitness_level=?, limitations=?, additional_context=?,
          age=?, biological_sex=?, weight_kg=?, height_cm=?, target_weight_kg=?,
          dietary_notes=?, user_id=?
        WHERE id=?`,
        [
          profile.schemaVersion,
          profile.primaryGoal,
          JSON.stringify(profile.equipment),
          profile.sessionsPerWeek,
          profile.targetDuration,
          profile.fitnessLevel,
          profile.limitations,
          profile.additionalContext,
          profile.age,
          profile.biologicalSex,
          profile.weightKg,
          profile.heightCm,
          profile.targetWeightKg,
          profile.dietaryNotes,
          profile.userId,
          profile.id,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to update UserProfile', 'QUERY_FAILED', cause);
    }
  }

  async deleteProfile(id: string): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute('DELETE FROM user_profile WHERE id=?', [id]);
    } catch (cause) {
      throw new StorageError(`Failed to delete UserProfile id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  // ── Plan ────────────────────────────────────────────────────────────────────

  async savePlan(plan: Plan): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `INSERT INTO plan (
          id, schema_version, user_id, name, description, is_active,
          default_work_sec, rest_between_ex_sec, stretch_between_rounds_sec,
          rest_between_rounds_sec, warmup_delay_between_items_sec,
          cooldown_delay_between_items_sec, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          plan.id,
          plan.schemaVersion,
          plan.userId,
          plan.name,
          plan.description,
          plan.isActive ? 1 : 0,
          plan.config.defaultWorkSec,
          plan.config.restBetweenExSec,
          plan.config.stretchBetweenRoundsSec,
          plan.config.restBetweenRoundsSec,
          plan.config.warmupDelayBetweenItemsSec,
          plan.config.cooldownDelayBetweenItemsSec,
          plan.createdAt,
          plan.updatedAt,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to save Plan', 'QUERY_FAILED', cause);
    }
  }

  private static async insertPlanRow(db: OPSQLiteDB, plan: Plan): Promise<void> {
    await db.execute(
      `INSERT INTO plan (
        id, schema_version, user_id, name, description, is_active,
        default_work_sec, rest_between_ex_sec, stretch_between_rounds_sec,
        rest_between_rounds_sec, warmup_delay_between_items_sec,
        cooldown_delay_between_items_sec, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        plan.id, plan.schemaVersion, plan.userId, plan.name, plan.description,
        plan.isActive ? 1 : 0, plan.config.defaultWorkSec, plan.config.restBetweenExSec,
        plan.config.stretchBetweenRoundsSec, plan.config.restBetweenRoundsSec,
        plan.config.warmupDelayBetweenItemsSec, plan.config.cooldownDelayBetweenItemsSec,
        plan.createdAt, plan.updatedAt,
      ],
    );
  }

  private static async insertSessionRow(db: OPSQLiteDB, session: Session): Promise<void> {
    await db.execute(
      `INSERT INTO session (
        id, schema_version, plan_id, name, type, order_in_plan, rounds,
        estimated_duration_minutes, work_sec, rest_between_ex_sec,
        stretch_between_rounds_sec, rest_between_rounds_sec,
        warmup_delay_between_items_sec, cooldown_delay_between_items_sec,
        between_round_exercise_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        session.id, session.schemaVersion, session.planId, session.name, session.type,
        session.orderInPlan, session.rounds, session.estimatedDurationMinutes,
        session.workSec, session.restBetweenExSec, session.stretchBetweenRoundsSec,
        session.restBetweenRoundsSec, session.warmupDelayBetweenItemsSec,
        session.cooldownDelayBetweenItemsSec, session.betweenRoundExerciseId,
      ],
    );
  }

  private static async insertExerciseRow(db: OPSQLiteDB, exercise: Exercise): Promise<void> {
    await db.execute(
      `INSERT INTO exercise (
        id, schema_version, session_id, phase, order_num, name, type,
        duration_sec, reps, weight, equipment, form_cues,
        youtube_search_query, is_bilateral
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        exercise.id, exercise.schemaVersion, exercise.sessionId, exercise.phase,
        exercise.order, exercise.name, exercise.type, exercise.durationSec,
        exercise.reps, exercise.weight, exercise.equipment,
        JSON.stringify(exercise.formCues), exercise.youtubeSearchQuery,
        exercise.isBilateral ? 1 : 0,
      ],
    );
  }

  async savePlanComplete(plan: Plan, sessions: Session[], exercises: Exercise[]): Promise<void> {
    const db = this.assertDb();
    await db.execute('BEGIN');
    try {
      // Deactivate all existing active plans before inserting the new one.
      // Only one plan may be active at a time (schema.md constraint).
      await db.execute('UPDATE plan SET is_active=0 WHERE is_active=1');
      await OpSqliteStorageService.insertPlanRow(db, plan);
      for (const session of sessions) {
        await OpSqliteStorageService.insertSessionRow(db, session);
      }
      for (const exercise of exercises) {
        await OpSqliteStorageService.insertExerciseRow(db, exercise);
      }
      await db.execute('COMMIT');
    } catch (cause) {
      try { await db.execute('ROLLBACK'); } catch (rollbackCause) {
        // ROLLBACK failure logged but not re-thrown; original error is the useful signal.
        logger.error('[savePlanComplete] ROLLBACK failed:', { error: String(rollbackCause) });
      }
      throw new StorageError('Failed to save plan (transaction rolled back)', 'QUERY_FAILED', cause);
    }
  }

  async getPlan(id: string): Promise<Plan | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM plan WHERE id=?', [id]);
      const rows = (result.rows ?? []) as unknown as PlanRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToPlan(rows[0]);
    } catch (cause) {
      throw new StorageError(`Failed to get Plan id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  async getActivePlan(): Promise<Plan | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM plan WHERE is_active=1 LIMIT 1');
      const rows = (result.rows ?? []) as unknown as PlanRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToPlan(rows[0]);
    } catch (cause) {
      throw new StorageError('Failed to get active Plan', 'QUERY_FAILED', cause);
    }
  }

  async getAllPlans(): Promise<Plan[]> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM plan ORDER BY created_at ASC');
      const rows = (result.rows ?? []) as unknown as PlanRow[];
      return rows.map(rowToPlan);
    } catch (cause) {
      throw new StorageError('Failed to get all Plans', 'QUERY_FAILED', cause);
    }
  }

  async updatePlan(plan: Plan): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `UPDATE plan SET
          schema_version=?, user_id=?, name=?, description=?, is_active=?,
          default_work_sec=?, rest_between_ex_sec=?, stretch_between_rounds_sec=?,
          rest_between_rounds_sec=?, warmup_delay_between_items_sec=?,
          cooldown_delay_between_items_sec=?, updated_at=?
        WHERE id=?`,
        [
          plan.schemaVersion,
          plan.userId,
          plan.name,
          plan.description,
          plan.isActive ? 1 : 0,
          plan.config.defaultWorkSec,
          plan.config.restBetweenExSec,
          plan.config.stretchBetweenRoundsSec,
          plan.config.restBetweenRoundsSec,
          plan.config.warmupDelayBetweenItemsSec,
          plan.config.cooldownDelayBetweenItemsSec,
          plan.updatedAt,
          plan.id,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to update Plan', 'QUERY_FAILED', cause);
    }
  }

  async deletePlan(id: string): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute('DELETE FROM plan WHERE id=?', [id]);
    } catch (cause) {
      throw new StorageError(`Failed to delete Plan id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  // ── Session ─────────────────────────────────────────────────────────────────

  async saveSession(session: Session): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `INSERT INTO session (
          id, schema_version, plan_id, name, type, order_in_plan, rounds,
          estimated_duration_minutes, work_sec, rest_between_ex_sec,
          stretch_between_rounds_sec, rest_between_rounds_sec,
          warmup_delay_between_items_sec, cooldown_delay_between_items_sec,
          between_round_exercise_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          session.id,
          session.schemaVersion,
          session.planId,
          session.name,
          session.type,
          session.orderInPlan,
          session.rounds,
          session.estimatedDurationMinutes,
          session.workSec,
          session.restBetweenExSec,
          session.stretchBetweenRoundsSec,
          session.restBetweenRoundsSec,
          session.warmupDelayBetweenItemsSec,
          session.cooldownDelayBetweenItemsSec,
          session.betweenRoundExerciseId,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to save Session', 'QUERY_FAILED', cause);
    }
  }

  async getSession(id: string): Promise<Session | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM session WHERE id=?', [id]);
      const rows = (result.rows ?? []) as unknown as SessionRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToSession(rows[0]);
    } catch (cause) {
      throw new StorageError(`Failed to get Session id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  async getSessionsByPlan(planId: string): Promise<Session[]> {
    const db = this.assertDb();
    try {
      const result = await db.execute(
        'SELECT * FROM session WHERE plan_id=? ORDER BY order_in_plan ASC',
        [planId],
      );
      const rows = (result.rows ?? []) as unknown as SessionRow[];
      return rows.map(rowToSession);
    } catch (cause) {
      throw new StorageError(
        `Failed to get Sessions for planId=${planId}`,
        'QUERY_FAILED',
        cause,
      );
    }
  }

  async updateSession(session: Session): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `UPDATE session SET
          schema_version=?, plan_id=?, name=?, type=?, order_in_plan=?, rounds=?,
          estimated_duration_minutes=?, work_sec=?, rest_between_ex_sec=?,
          stretch_between_rounds_sec=?, rest_between_rounds_sec=?,
          warmup_delay_between_items_sec=?, cooldown_delay_between_items_sec=?,
          between_round_exercise_id=?
        WHERE id=?`,
        [
          session.schemaVersion,
          session.planId,
          session.name,
          session.type,
          session.orderInPlan,
          session.rounds,
          session.estimatedDurationMinutes,
          session.workSec,
          session.restBetweenExSec,
          session.stretchBetweenRoundsSec,
          session.restBetweenRoundsSec,
          session.warmupDelayBetweenItemsSec,
          session.cooldownDelayBetweenItemsSec,
          session.betweenRoundExerciseId,
          session.id,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to update Session', 'QUERY_FAILED', cause);
    }
  }

  async deleteSession(id: string): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute('DELETE FROM session WHERE id=?', [id]);
    } catch (cause) {
      throw new StorageError(`Failed to delete Session id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  // ── Exercise ────────────────────────────────────────────────────────────────

  async saveExercise(exercise: Exercise): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `INSERT INTO exercise (
          id, schema_version, session_id, phase, order_num, name, type,
          duration_sec, reps, weight, equipment, form_cues,
          youtube_search_query, is_bilateral
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          exercise.id,
          exercise.schemaVersion,
          exercise.sessionId,
          exercise.phase,
          exercise.order,
          exercise.name,
          exercise.type,
          exercise.durationSec,
          exercise.reps,
          exercise.weight,
          exercise.equipment,
          JSON.stringify(exercise.formCues),
          exercise.youtubeSearchQuery,
          exercise.isBilateral ? 1 : 0,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to save Exercise', 'QUERY_FAILED', cause);
    }
  }

  async getExercise(id: string): Promise<Exercise | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM exercise WHERE id=?', [id]);
      const rows = (result.rows ?? []) as unknown as ExerciseRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToExercise(rows[0]);
    } catch (cause) {
      if (cause instanceof StorageError) {
        throw cause;
      }
      throw new StorageError(`Failed to get Exercise id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  async getExercisesBySession(sessionId: string): Promise<Exercise[]> {
    const db = this.assertDb();
    try {
      const result = await db.execute(
        'SELECT * FROM exercise WHERE session_id=? ORDER BY order_num ASC',
        [sessionId],
      );
      const rows = (result.rows ?? []) as unknown as ExerciseRow[];
      return rows.map(rowToExercise);
    } catch (cause) {
      if (cause instanceof StorageError) {
        throw cause;
      }
      throw new StorageError(
        `Failed to get Exercises for sessionId=${sessionId}`,
        'QUERY_FAILED',
        cause,
      );
    }
  }

  async updateExercise(exercise: Exercise): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `UPDATE exercise SET
          schema_version=?, session_id=?, phase=?, order_num=?, name=?, type=?,
          duration_sec=?, reps=?, weight=?, equipment=?, form_cues=?,
          youtube_search_query=?, is_bilateral=?
        WHERE id=?`,
        [
          exercise.schemaVersion,
          exercise.sessionId,
          exercise.phase,
          exercise.order,
          exercise.name,
          exercise.type,
          exercise.durationSec,
          exercise.reps,
          exercise.weight,
          exercise.equipment,
          JSON.stringify(exercise.formCues),
          exercise.youtubeSearchQuery,
          exercise.isBilateral ? 1 : 0,
          exercise.id,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to update Exercise', 'QUERY_FAILED', cause);
    }
  }

  async deleteExercise(id: string): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute('DELETE FROM exercise WHERE id=?', [id]);
    } catch (cause) {
      throw new StorageError(`Failed to delete Exercise id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  // ── SessionFeedback ─────────────────────────────────────────────────────────

  async saveFeedback(feedback: SessionFeedback): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `INSERT INTO session_feedback (
          id, schema_version, session_id, completed_at, is_complete,
          comment_text, effort_rating, hr_log
        ) VALUES (?,?,?,?,?,?,?,?)`,
        [
          feedback.id,
          feedback.schemaVersion,
          feedback.sessionId,
          feedback.completedAt,
          feedback.isComplete ? 1 : 0,
          feedback.commentText,
          feedback.effortRating,
          feedback.hrLog,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to save SessionFeedback', 'QUERY_FAILED', cause);
    }
  }

  async getFeedback(id: string): Promise<SessionFeedback | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute('SELECT * FROM session_feedback WHERE id=?', [id]);
      const rows = (result.rows ?? []) as unknown as FeedbackRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToFeedback(rows[0]);
    } catch (cause) {
      throw new StorageError(`Failed to get SessionFeedback id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  async getFeedbackBySession(sessionId: string): Promise<SessionFeedback | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute(
        'SELECT * FROM session_feedback WHERE session_id=? LIMIT 1',
        [sessionId],
      );
      const rows = (result.rows ?? []) as unknown as FeedbackRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToFeedback(rows[0]);
    } catch (cause) {
      throw new StorageError(
        `Failed to get SessionFeedback for sessionId=${sessionId}`,
        'QUERY_FAILED',
        cause,
      );
    }
  }

  async getRecentFeedback(limit: number): Promise<SessionFeedback[]> {
    const db = this.assertDb();
    try {
      const result = await db.execute(
        'SELECT * FROM session_feedback ORDER BY completed_at DESC LIMIT ?',
        [limit],
      );
      const rows = (result.rows ?? []) as unknown as FeedbackRow[];
      return rows.map(rowToFeedback);
    } catch (cause) {
      throw new StorageError('Failed to get recent SessionFeedback', 'QUERY_FAILED', cause);
    }
  }

  async updateFeedback(feedback: SessionFeedback): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `UPDATE session_feedback SET
          schema_version=?, session_id=?, completed_at=?, is_complete=?,
          comment_text=?, effort_rating=?, hr_log=?
        WHERE id=?`,
        [
          feedback.schemaVersion,
          feedback.sessionId,
          feedback.completedAt,
          feedback.isComplete ? 1 : 0,
          feedback.commentText,
          feedback.effortRating,
          feedback.hrLog,
          feedback.id,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to update SessionFeedback', 'QUERY_FAILED', cause);
    }
  }

  async deleteFeedback(id: string): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute('DELETE FROM session_feedback WHERE id=?', [id]);
    } catch (cause) {
      throw new StorageError(`Failed to delete SessionFeedback id=${id}`, 'QUERY_FAILED', cause);
    }
  }

  // ── PlanContextRecord ────────────────────────────────────────────────────────

  async saveContextRecord(record: PlanContextRecord): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `INSERT INTO plan_context_record (
          id, schema_version, plan_id, content, updated_at
        ) VALUES (?,?,?,?,?)`,
        [
          record.id,
          record.schemaVersion,
          record.planId,
          record.content,
          record.updatedAt,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to save PlanContextRecord', 'QUERY_FAILED', cause);
    }
  }

  async getContextRecord(planId: string): Promise<PlanContextRecord | null> {
    const db = this.assertDb();
    try {
      const result = await db.execute(
        'SELECT * FROM plan_context_record WHERE plan_id=? LIMIT 1',
        [planId],
      );
      const rows = (result.rows ?? []) as unknown as ContextRecordRow[];
      if (rows.length === 0) {
        return null;
      }
      return rowToContextRecord(rows[0]);
    } catch (cause) {
      throw new StorageError(
        `Failed to get PlanContextRecord for planId=${planId}`,
        'QUERY_FAILED',
        cause,
      );
    }
  }

  async updateContextRecord(record: PlanContextRecord): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute(
        `UPDATE plan_context_record SET
          schema_version=?, plan_id=?, content=?, updated_at=?
        WHERE id=?`,
        [
          record.schemaVersion,
          record.planId,
          record.content,
          record.updatedAt,
          record.id,
        ],
      );
    } catch (cause) {
      throw new StorageError('Failed to update PlanContextRecord', 'QUERY_FAILED', cause);
    }
  }

  async deleteContextRecord(id: string): Promise<void> {
    const db = this.assertDb();
    try {
      await db.execute('DELETE FROM plan_context_record WHERE id=?', [id]);
    } catch (cause) {
      throw new StorageError(
        `Failed to delete PlanContextRecord id=${id}`,
        'QUERY_FAILED',
        cause,
      );
    }
  }

  // ── Plan Modification ────────────────────────────────────────────────────────

  // Applies a ModifyPlanOutput diff atomically. All changes (plan, sessions,
  // exercises, context record) are written in a single SQLite transaction.
  // Full rollback on any failure — the DB is never left in a partial state.
  // Called only after the user has confirmed the before/after preview.
  async applyPlanModification(planId: string, output: ModifyPlanOutput): Promise<void> {
    const db = this.assertDb();
    await db.execute('BEGIN');
    try {
      await this.applyPlanChanges(db, planId, output);
      await this.applySessionChanges(db, planId, output);
      await this.applyContextRecordUpdate(db, planId, output.contextRecordUpdate);
      await db.execute('COMMIT');
    } catch (cause) {
      try { await db.execute('ROLLBACK'); } catch (rollbackCause) {
        logger.error('[applyPlanModification] ROLLBACK failed:', { error: String(rollbackCause) });
      }
      throw new StorageError(
        'Failed to apply plan modification (transaction rolled back)',
        'QUERY_FAILED',
        cause,
      );
    }
  }

  private async applyPlanChanges(
    db: OPSQLiteDB,
    planId: string,
    output: ModifyPlanOutput,
  ): Promise<void> {
    if (output.planChanges === null) {
      return;
    }
    const changes = output.planChanges;
    const now = new Date().toISOString();
    // Build SET clauses only for fields present in the partial diff.
    // We use individual UPDATE calls for each changed top-level field group
    // to avoid reading the full row and re-writing all fields.
    if (changes.name !== undefined) {
      await db.execute('UPDATE plan SET name=?, updated_at=? WHERE id=?', [changes.name, now, planId]);
    }
    if (changes.description !== undefined) {
      await db.execute('UPDATE plan SET description=?, updated_at=? WHERE id=?', [changes.description, now, planId]);
    }
    if (changes.config !== undefined) {
      const c = changes.config;
      if (c.defaultWorkSec !== undefined) {
        await db.execute('UPDATE plan SET default_work_sec=?, updated_at=? WHERE id=?', [c.defaultWorkSec, now, planId]);
      }
      if (c.restBetweenExSec !== undefined) {
        await db.execute('UPDATE plan SET rest_between_ex_sec=?, updated_at=? WHERE id=?', [c.restBetweenExSec, now, planId]);
      }
      if (c.stretchBetweenRoundsSec !== undefined) {
        await db.execute('UPDATE plan SET stretch_between_rounds_sec=?, updated_at=? WHERE id=?', [c.stretchBetweenRoundsSec, now, planId]);
      }
      if (c.restBetweenRoundsSec !== undefined) {
        await db.execute('UPDATE plan SET rest_between_rounds_sec=?, updated_at=? WHERE id=?', [c.restBetweenRoundsSec, now, planId]);
      }
      if (c.warmupDelayBetweenItemsSec !== undefined) {
        await db.execute('UPDATE plan SET warmup_delay_between_items_sec=?, updated_at=? WHERE id=?', [c.warmupDelayBetweenItemsSec, now, planId]);
      }
      if (c.cooldownDelayBetweenItemsSec !== undefined) {
        await db.execute('UPDATE plan SET cooldown_delay_between_items_sec=?, updated_at=? WHERE id=?', [c.cooldownDelayBetweenItemsSec, now, planId]);
      }
    }
  }

  private async applySessionChanges(
    db: OPSQLiteDB,
    planId: string,
    output: ModifyPlanOutput,
  ): Promise<void> {
    for (const change of output.sessionChanges) {
      if (change.action === 'remove') {
        if (change.sessionId === null) {
          throw new StorageError(
            'SessionChange with action=remove must have a non-null sessionId',
            'QUERY_FAILED',
          );
        }
        await db.execute('DELETE FROM exercise WHERE session_id=?', [change.sessionId]);
        await db.execute('DELETE FROM session WHERE id=?', [change.sessionId]);
      } else if (change.action === 'add') {
        if (change.sessionDraft === null) {
          throw new StorageError(
            'SessionChange with action=add must have a non-null sessionDraft',
            'QUERY_FAILED',
          );
        }
        const newSessionId = Crypto.randomUUID();
        const draft = change.sessionDraft;
        await db.execute(
          `INSERT INTO session (
            id, schema_version, plan_id, name, type, order_in_plan, rounds,
            estimated_duration_minutes, work_sec, rest_between_ex_sec,
            stretch_between_rounds_sec, rest_between_rounds_sec,
            warmup_delay_between_items_sec, cooldown_delay_between_items_sec,
            between_round_exercise_id
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            newSessionId, 1, planId,
            draft.name ?? '', draft.type ?? 'resistance',
            draft.orderInPlan ?? 0, draft.rounds ?? 1,
            draft.estimatedDurationMinutes ?? 0,
            draft.workSec ?? 40, draft.restBetweenExSec ?? 20,
            draft.stretchBetweenRoundsSec ?? 30, draft.restBetweenRoundsSec ?? 90,
            draft.warmupDelayBetweenItemsSec ?? 5, draft.cooldownDelayBetweenItemsSec ?? 5,
            null,
          ],
        );
        if (draft.betweenRoundExercise != null) {
          const betweenRoundId = await OpSqliteStorageService.insertExerciseDraft(
            db, newSessionId, draft.betweenRoundExercise,
          );
          await db.execute(
            'UPDATE session SET between_round_exercise_id=? WHERE id=?',
            [betweenRoundId, newSessionId],
          );
        }
        for (const exChange of change.exerciseChanges) {
          if (exChange.action === 'add' && exChange.exerciseDraft !== null) {
            await OpSqliteStorageService.insertExerciseDraft(db, newSessionId, exChange.exerciseDraft);
          }
        }
      } else {
        // action === 'update'
        if (change.sessionId === null) {
          throw new StorageError(
            'SessionChange with action=update must have a non-null sessionId',
            'QUERY_FAILED',
          );
        }
        if (change.sessionDraft !== null) {
          await OpSqliteStorageService.applySessionDraftUpdate(db, change.sessionId, change.sessionDraft);
        }
        for (const exChange of change.exerciseChanges) {
          await OpSqliteStorageService.applyExerciseChange(db, change.sessionId, exChange);
        }
      }
    }
  }

  private static async applySessionDraftUpdate(
    db: OPSQLiteDB,
    sessionId: string,
    draft: Partial<import('../types/index').SessionDraft>,
  ): Promise<void> {
    const now = new Date().toISOString();
    if (draft.name !== undefined) {
      await db.execute('UPDATE session SET name=?, updated_at=? WHERE id=?', [draft.name, now, sessionId]);
    }
    if (draft.type !== undefined) {
      await db.execute('UPDATE session SET type=?, updated_at=? WHERE id=?', [draft.type, now, sessionId]);
    }
    if (draft.orderInPlan !== undefined) {
      await db.execute('UPDATE session SET order_in_plan=?, updated_at=? WHERE id=?', [draft.orderInPlan, now, sessionId]);
    }
    if (draft.rounds !== undefined) {
      await db.execute('UPDATE session SET rounds=?, updated_at=? WHERE id=?', [draft.rounds, now, sessionId]);
    }
    if (draft.estimatedDurationMinutes !== undefined) {
      await db.execute('UPDATE session SET estimated_duration_minutes=?, updated_at=? WHERE id=?', [draft.estimatedDurationMinutes, now, sessionId]);
    }
    if (draft.workSec !== undefined) {
      await db.execute('UPDATE session SET work_sec=?, updated_at=? WHERE id=?', [draft.workSec, now, sessionId]);
    }
    if (draft.restBetweenExSec !== undefined) {
      await db.execute('UPDATE session SET rest_between_ex_sec=?, updated_at=? WHERE id=?', [draft.restBetweenExSec, now, sessionId]);
    }
    if (draft.stretchBetweenRoundsSec !== undefined) {
      await db.execute('UPDATE session SET stretch_between_rounds_sec=?, updated_at=? WHERE id=?', [draft.stretchBetweenRoundsSec, now, sessionId]);
    }
    if (draft.restBetweenRoundsSec !== undefined) {
      await db.execute('UPDATE session SET rest_between_rounds_sec=?, updated_at=? WHERE id=?', [draft.restBetweenRoundsSec, now, sessionId]);
    }
    if (draft.warmupDelayBetweenItemsSec !== undefined) {
      await db.execute('UPDATE session SET warmup_delay_between_items_sec=?, updated_at=? WHERE id=?', [draft.warmupDelayBetweenItemsSec, now, sessionId]);
    }
    if (draft.cooldownDelayBetweenItemsSec !== undefined) {
      await db.execute('UPDATE session SET cooldown_delay_between_items_sec=?, updated_at=? WHERE id=?', [draft.cooldownDelayBetweenItemsSec, now, sessionId]);
    }
    if (draft.betweenRoundExercise !== undefined) {
      if (draft.betweenRoundExercise === null) {
        await db.execute('UPDATE session SET between_round_exercise_id=NULL, updated_at=? WHERE id=?', [now, sessionId]);
      } else {
        const betweenRoundId = await OpSqliteStorageService.insertExerciseDraft(
          db, sessionId, draft.betweenRoundExercise,
        );
        await db.execute(
          'UPDATE session SET between_round_exercise_id=?, updated_at=? WHERE id=?',
          [betweenRoundId, now, sessionId],
        );
      }
    }
  }

  private static async applyExerciseChange(
    db: OPSQLiteDB,
    sessionId: string,
    change: import('../types/index').ExerciseChange,
  ): Promise<void> {
    if (change.action === 'remove') {
      if (change.exerciseId === null) {
        throw new StorageError(
          'ExerciseChange with action=remove must have a non-null exerciseId',
          'QUERY_FAILED',
        );
      }
      await db.execute('DELETE FROM exercise WHERE id=?', [change.exerciseId]);
    } else if (change.action === 'add') {
      if (change.exerciseDraft === null) {
        throw new StorageError(
          'ExerciseChange with action=add must have a non-null exerciseDraft',
          'QUERY_FAILED',
        );
      }
      await OpSqliteStorageService.insertExerciseDraft(db, sessionId, change.exerciseDraft);
    } else {
      // action === 'update'
      if (change.exerciseId === null) {
        throw new StorageError(
          'ExerciseChange with action=update must have a non-null exerciseId',
          'QUERY_FAILED',
        );
      }
      if (change.exerciseDraft !== null) {
        await OpSqliteStorageService.applyExerciseDraftUpdate(db, change.exerciseId, change.exerciseDraft);
      }
    }
  }

  private static async insertExerciseDraft(
    db: OPSQLiteDB,
    sessionId: string,
    draft: Partial<import('../types/index').ExerciseDraft>,
  ): Promise<string> {
    const exerciseId = Crypto.randomUUID();
    await db.execute(
      `INSERT INTO exercise (
        id, schema_version, session_id, phase, order_num, name, type,
        duration_sec, reps, weight, equipment, form_cues,
        youtube_search_query, is_bilateral
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        exerciseId, 1, sessionId,
        draft.phase ?? null,
        draft.order ?? 0,
        draft.name ?? '',
        draft.type ?? 'timed',
        draft.durationSec ?? null,
        draft.reps ?? null,
        draft.weight ?? null,
        draft.equipment ?? '',
        JSON.stringify(draft.formCues ?? []),
        draft.youtubeSearchQuery ?? null,
        draft.isBilateral ? 1 : 0,
      ],
    );
    return exerciseId;
  }

  private static async applyExerciseDraftUpdate(
    db: OPSQLiteDB,
    exerciseId: string,
    draft: Partial<import('../types/index').ExerciseDraft>,
  ): Promise<void> {
    if (draft.name !== undefined) {
      await db.execute('UPDATE exercise SET name=? WHERE id=?', [draft.name, exerciseId]);
    }
    if (draft.phase !== undefined) {
      await db.execute('UPDATE exercise SET phase=? WHERE id=?', [draft.phase, exerciseId]);
    }
    if (draft.order !== undefined) {
      await db.execute('UPDATE exercise SET order_num=? WHERE id=?', [draft.order, exerciseId]);
    }
    if (draft.type !== undefined) {
      await db.execute('UPDATE exercise SET type=? WHERE id=?', [draft.type, exerciseId]);
    }
    if (draft.durationSec !== undefined) {
      await db.execute('UPDATE exercise SET duration_sec=? WHERE id=?', [draft.durationSec, exerciseId]);
    }
    if (draft.reps !== undefined) {
      await db.execute('UPDATE exercise SET reps=? WHERE id=?', [draft.reps, exerciseId]);
    }
    if (draft.weight !== undefined) {
      await db.execute('UPDATE exercise SET weight=? WHERE id=?', [draft.weight, exerciseId]);
    }
    if (draft.equipment !== undefined) {
      await db.execute('UPDATE exercise SET equipment=? WHERE id=?', [draft.equipment, exerciseId]);
    }
    if (draft.formCues !== undefined) {
      await db.execute('UPDATE exercise SET form_cues=? WHERE id=?', [JSON.stringify(draft.formCues), exerciseId]);
    }
    if (draft.youtubeSearchQuery !== undefined) {
      await db.execute('UPDATE exercise SET youtube_search_query=? WHERE id=?', [draft.youtubeSearchQuery, exerciseId]);
    }
    if (draft.isBilateral !== undefined) {
      await db.execute('UPDATE exercise SET is_bilateral=? WHERE id=?', [draft.isBilateral ? 1 : 0, exerciseId]);
    }
  }

  private async applyContextRecordUpdate(
    db: OPSQLiteDB,
    planId: string,
    contextRecordUpdate: string | null,
  ): Promise<void> {
    if (contextRecordUpdate === null) {
      return;
    }
    const now = new Date().toISOString();
    const result = await db.execute(
      'SELECT id FROM plan_context_record WHERE plan_id=? LIMIT 1',
      [planId],
    );
    const rows = (result.rows ?? []) as unknown as { id: string }[];
    if (rows.length > 0) {
      await db.execute(
        'UPDATE plan_context_record SET content=?, updated_at=? WHERE plan_id=?',
        [contextRecordUpdate, now, planId],
      );
    } else {
      await db.execute(
        `INSERT INTO plan_context_record (id, schema_version, plan_id, content, updated_at)
         VALUES (?,?,?,?,?)`,
        [Crypto.randomUUID(), 1, planId, contextRecordUpdate, now],
      );
    }
  }
}

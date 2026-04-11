# Schema — Adaptive Workout App
# Version: 1.5
# =============================================================
# Single source of truth for all data structures.
# TypeScript interfaces are used throughout — closest to implementation.
# Never modify this file without following the Versioning Policy below.
# =============================================================

## Change Log
### v1.0 — 2026-03-29 — JD: initial schema (placeholder)
### v1.1 — 2026-04-03 — JD + Claude: full MVP schema defined
### v1.2 — 2026-04-03 — JD: removed future logging slots from Exercise; logging will be a separate entity (ExerciseLog) referencing exerciseId
### v1.3 — 2026-04-03 — JD: added 'mobility' and 'stretching' to SessionType; these session types have no circuit structure (sequential timed holds only)
### v1.4 — 2026-04-03 — JD: added additionalContext to UserProfile for open-ended onboarding field
### v1.5 — 2026-04-11 — JD + Claude: added recentFeedback to ModifyPlanInput; clarified contextRecordUpdate is full replacement content

---

## Database Schema

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────

type PrimaryGoal =
  | 'general_fitness'
  | 'strength'
  | 'hypertrophy'
  | 'weight_loss'
  | 'rehabilitation';

type TargetDuration = '20-30' | '30-45' | '45-60' | '60+';

type FitnessLevel = 'beginner' | 'intermediate' | 'experienced';

type SessionType = 'resistance' | 'mobility' | 'stretching'; // future: 'cardio'

type ExercisePhase =
  | 'warmup'
  | 'main'
  | 'cooldown'
  | null; // null = between-round exercise, accessed only via Session.betweenRoundExerciseId

type StepType = 'timed' | 'rep';

// ─── UserProfile ──────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;                        // UUID
  schemaVersion: number;
  primaryGoal: PrimaryGoal;
  equipment: string[];               // free-form; e.g. ["TRX", "resistance bands"]
  sessionsPerWeek: number;
  targetDuration: TargetDuration;    // range enum; AI balances sessions within this range
  fitnessLevel: FitnessLevel;
  limitations: string;               // free-form injuries / movements to avoid
  additionalContext: string | null;  // open-ended onboarding field: "anything else before I design your plan?"

  // Future-use fields — collected at onboarding, not used in MVP logic
  age: number | null;
  biologicalSex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  targetWeightKg: number | null;
  dietaryNotes: string | null;

  userId: string | null;             // future: multi-user / cloud sync
  createdAt: string;                 // ISO 8601
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

interface PlanConfig {
  defaultWorkSec: number;
  restBetweenExSec: number;
  stretchBetweenRoundsSec: number;
  restBetweenRoundsSec: number;
  warmupDelayBetweenItemsSec: number;    // auto-pause between warmup exercises (PRD §6.1: 5s default)
  cooldownDelayBetweenItemsSec: number;  // auto-pause between cooldown exercises
}

interface Plan {
  id: string;
  schemaVersion: number;
  userId: string | null;             // future: multi-user / cloud sync
  name: string;
  description: string;
  isActive: boolean;                 // only one plan active at a time in MVP
  config: PlanConfig;                // plan-level defaults; copied explicitly into each Session at generation
  createdAt: string;
  updatedAt: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────
// Sessions always carry explicit config values (copied from Plan.config at AI generation time).
// This avoids runtime inheritance resolution and lets the AI vary parameters per session freely.
// Future: add BetweenRoundConfig table (sessionId + afterRound) for per-gap overrides;
// Session-level fields become fallback defaults — additive, no breaking change.

interface Session {
  id: string;
  schemaVersion: number;
  planId: string;
  name: string;
  type: SessionType;
  orderInPlan: number;
  rounds: number;
  estimatedDurationMinutes: number;  // pre-calculated by AI; displayed on home screen session card

  // Execution config — explicit per session (no inheritance from Plan at runtime)
  workSec: number;
  restBetweenExSec: number;
  stretchBetweenRoundsSec: number;   // total time budget for between-round gap (stretch + rest combined)
  restBetweenRoundsSec: number;      // remaining rest after stretch; skipped if < 5s
  warmupDelayBetweenItemsSec: number;
  cooldownDelayBetweenItemsSec: number;

  // Between-round configuration
  betweenRoundExerciseId: string | null; // optional stretch Exercise (phase: null); duration absorbed into stretchBetweenRoundsSec
}

// ─── Exercise ─────────────────────────────────────────────────────────────────
// Unified entity for warmup, main circuit, cooldown, and between-round stretch exercises.
// phase determines sequencing:
//   'warmup'   → executes once before main circuit
//   'main'     → executes each round for Session.rounds rounds
//   'cooldown' → executes once after main circuit
//   null       → between-round exercise; not sequenced by phase; accessed via Session.betweenRoundExerciseId only
//
// NOTE: `name` is the intended future join key to an ExerciseDefinition library.
// When that library is added, exercise metadata (formCues, equipment, youtubeSearchQuery)
// can be sourced from the library and kept consistent across sessions.

interface Exercise {
  id: string;
  schemaVersion: number;
  sessionId: string;
  phase: ExercisePhase;
  order: number;                     // execution order within phase; ignored for phase: null
  name: string;                      // future join key to ExerciseDefinition library
  type: StepType;
  durationSec: number | null;        // null if type = 'rep'; per-side if isBilateral = true
  reps: number | null;               // null if type = 'timed'; per-side if isBilateral = true; display as "N reps each side"
  weight: string | null;             // free-form; e.g. "20kg", "bodyweight", null if not applicable
  equipment: string;                 // free-form; e.g. "TRX", "resistance band"
  formCues: string[];                // displayed as bulleted list in exercise detail view
  youtubeSearchQuery: string | null; // runtime constructs YouTube search URL from this string
  isBilateral: boolean;              // if true, runtime splits into two steps: Left → Right; durationSec is per-side
}

// ─── SessionFeedback ──────────────────────────────────────────────────────────

interface SessionFeedback {
  id: string;
  schemaVersion: number;
  sessionId: string;
  completedAt: string;               // ISO 8601
  isComplete: boolean;               // false if user exited early via End Session
  commentText: string | null;        // free-form post-session comment

  // Future structured feedback — not populated in MVP; slots reserved to avoid schema migration
  effortRating: number | null;       // future: 1–5 scale
  hrLog: string | null;              // future: serialized HR time-series
}

// ─── PlanContextRecord ────────────────────────────────────────────────────────
// AI-maintained plain-text record of significant preferences, constraints, and decisions.
// Read by AI at the start of every plan modification conversation.
// AI appends to this record when meaningful preferences are established.
// AI condenses via summarizeContextRecord when the record grows large.

interface PlanContextRecord {
  id: string;
  schemaVersion: number;
  planId: string;
  content: string;                   // plain text; human-readable; visible to user
  updatedAt: string;                 // ISO 8601
}
```

---

## AI Input Schema (v1.1)

```typescript
// ─── generatePlan input ───────────────────────────────────────────────────────

interface GeneratePlanInput {
  schemaVersion: number;
  userProfile: UserProfile;
  recentFeedback: SessionFeedback[]; // may be empty at first generation
}

// ─── modifyPlan input ─────────────────────────────────────────────────────────

interface ModifyPlanInput {
  schemaVersion: number;
  currentPlan: Plan;
  currentSessions: Session[];
  currentExercises: Exercise[];
  contextRecord: PlanContextRecord;
  recentFeedback: SessionFeedback[];   // recent post-session feedback comments; may be empty
  conversation: ConversationMessage[]; // current modification conversation only; no prior session history
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── summarizeContextRecord input ─────────────────────────────────────────────

interface SummarizeContextRecordInput {
  schemaVersion: number;
  currentRecord: PlanContextRecord;
  conversation: ConversationMessage[];
}
```

---

## AI Output Schema (v1.1)

```typescript
// ─── generatePlan output ──────────────────────────────────────────────────────
// AI returns a complete program draft. Storage layer assigns IDs and timestamps.

interface PlanDraft {
  name: string;
  description: string;
  config: PlanConfig;
}

interface SessionDraft {
  name: string;
  type: SessionType;
  orderInPlan: number;
  rounds: number;
  estimatedDurationMinutes: number;
  workSec: number;
  restBetweenExSec: number;
  stretchBetweenRoundsSec: number;
  restBetweenRoundsSec: number;
  warmupDelayBetweenItemsSec: number;
  cooldownDelayBetweenItemsSec: number;
  betweenRoundExercise: ExerciseDraft | null; // inline; storage layer creates Exercise record and links id
}

interface ExerciseDraft {
  phase: ExercisePhase;
  order: number;
  name: string;
  type: StepType;
  durationSec: number | null;
  reps: number | null;
  weight: string | null;
  equipment: string;
  formCues: string[];
  youtubeSearchQuery: string | null;
  isBilateral: boolean;
}

interface GeneratePlanOutput {
  schemaVersion: number;
  plan: PlanDraft;
  sessions: Array<SessionDraft & { exercises: ExerciseDraft[] }>;
}

// ─── modifyPlan output ────────────────────────────────────────────────────────
// AI returns a diff + plain-language summary. No changes written until user confirms.

interface ModifyPlanOutput {
  schemaVersion: number;
  summary: string;                   // plain-language rationale shown to user in before/after preview
  planChanges: Partial<PlanDraft> | null;
  sessionChanges: SessionChange[];
  contextRecordUpdate: string | null; // full replacement content for PlanContextRecord (not a delta); null if no update needed
}

interface SessionChange {
  sessionId: string | null;          // null = new session being added
  action: 'update' | 'add' | 'remove';
  sessionDraft: Partial<SessionDraft> | null;       // null if action = 'remove'
  exerciseChanges: ExerciseChange[];
}

interface ExerciseChange {
  exerciseId: string | null;         // null = new exercise being added
  action: 'update' | 'add' | 'remove';
  exerciseDraft: Partial<ExerciseDraft> | null;     // null if action = 'remove'
}

// ─── summarizeContextRecord output ────────────────────────────────────────────

interface SummarizeContextRecordOutput {
  schemaVersion: number;
  content: string;                   // condensed plain-text content for PlanContextRecord
}
```

---

## Versioning Policy
Every AI call must include schemaVersion in both input and output.
Validate AI responses against current schema before writing to store.
Schema changes must be additive by default.
Destructive changes require a version bump and a compatibility layer entry before any dependent code is written.

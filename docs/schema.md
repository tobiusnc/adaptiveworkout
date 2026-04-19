# Schema — Adaptive Workout App
# Version: 1.7
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
### v1.6 — 2026-04-14 — JD + Claude: added ExerciseDefinition and ExerciseVariant (exercise library with terse AI tags)
### v1.7 — 2026-04-18 — JD + Claude: redesigned user context layer; slimmed UserProfile to identity+demographics only; added PreferenceLevel type and UserContextRecord (structured AI-maintained preference record); removed PlanContextRecord; replaced summarizeContextRecord with updateUserContext (Haiku interpreter); updated generatePlan and modifyPlan I/O accordingly

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
// Immutable after onboarding. Contains only identity metadata and demographics.
// Does NOT contain fitness goals, equipment, preferences, or limitations —
// those live entirely in UserContextRecord (which may evolve over time).
// Sent to plan AI as a stable cache block (cache checkpoint 2).
// The interpreter does not receive or modify this record.

interface UserProfile {
  id: string;                        // UUID
  schemaVersion: number;
  userId: string | null;             // future: multi-user / cloud sync
  createdAt: string;                 // ISO 8601; proxy for training age

  // Demographics — collected at onboarding; future-use in MVP (not sent to AI yet)
  // Stable by nature; never updated by the interpreter.
  age: number | null;
  biologicalSex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  targetWeightKg: number | null;
  dietaryNotes: string | null;
}

// ─── PreferenceLevel ──────────────────────────────────────────────────────────
// Gradated preference signal used throughout UserContextRecord.
// null  = preference never expressed (do not infer a default)
// -2    = strong avoidance
// -1    = mild avoidance
// 1     = mild preference
// 2     = strong preference
// (0 is intentionally absent — use null for unexpressed neutral)
type PreferenceLevel = -2 | -1 | 1 | 2 | null;

// ─── UserContextRecord ────────────────────────────────────────────────────────
// AI-maintained structured preference and profile record.
// Replaces the former PlanContextRecord (freeform text).
// Owned exclusively by the updateUserContext interpreter (Haiku).
// The plan AI reads this; never writes it.
// User-global — not tied to a specific plan. Persists across plan changes.
// Initialized from onboarding questionnaire answers by the interpreter.
// Updated by interpreter on every user input (questionnaire, feedback, plan chat, profile edit).
// The interpreter always writes a full replacement — never a delta.

interface UserContextRecord {
  id: string;
  schemaVersion: number;
  userId: string | null;

  // ── Current fitness profile ────────────────────────────────────────────────
  // Initialized from onboarding answers; may diverge from onboarding over time.
  // These are the values the plan AI should use as the authoritative current state.
  primaryGoal: PrimaryGoal;
  equipment: string[];               // current equipment codes; e.g. ["bw","band","trx"]
  sessionsPerWeek: number;
  targetDuration: TargetDuration;
  fitnessLevel: FitnessLevel;

  // ── Physical constraints ──────────────────────────────────────────────────
  jointLimitations: string[];        // joint stress tag codes to exclude: e.g. ["knee","lback"]
  movementLimitations: string[];     // movement pattern codes to exclude: e.g. ["plyo","squat"]
  limitationsNotes: string[];        // nuanced notes that don't map to tag codes; append-only

  // ── Positive preferences ──────────────────────────────────────────────────
  preferredExercises: string[];      // exercise names the user has expressed liking
  preferredMovements: string[];      // movement pattern codes the user favors
  preferredEquipment: string[];      // equipment the user prefers when multiple options exist

  // ── Negative preferences ──────────────────────────────────────────────────
  dislikedExercises: string[];       // exercise names to minimize or avoid
  dislikedMovements: string[];       // movement pattern codes to minimize

  // ── Style / intensity preferences ─────────────────────────────────────────
  prefHigherReps: PreferenceLevel;      // +: more reps/lighter weight   −: fewer/heavier
  prefLongerRest: PreferenceLevel;      // +: longer rest periods
  prefMoreVariety: PreferenceLevel;     // +: vary exercises session to session
  prefHigherIntensity: PreferenceLevel; // +: harder / more challenging overall
  prefLongerSessions: PreferenceLevel;  // +: lean toward upper end of targetDuration band
  prefMoreRounds: PreferenceLevel;      // +: more rounds per session
  prefCompoundFocus: PreferenceLevel;   // +: compound movements   −: isolation focus

  // ── Environment constraints ────────────────────────────────────────────────
  // Maximum acceptable level. Exercises exceeding this are excluded.
  // spaceConstraint maps to exercise space_overhead and space_horizontal tags.
  // noiseConstraint maps to exercise noise_level tag.
  spaceConstraint: 1 | 2 | 3 | null;   // null = no constraint
  noiseConstraint: 1 | 2 | 3 | null;   // null = no constraint

  // ── Safety valve ──────────────────────────────────────────────────────────
  // Directions the interpreter extracted but could not map to any structured field.
  // Append-only — entries are never removed. The plan AI reads these as
  // additional free-text guidance after all structured fields.
  additionalDirections: string[];

  // ── Metadata ──────────────────────────────────────────────────────────────
  updatedAt: string;                 // ISO 8601
  updatedByModel: string;            // e.g. "claude-haiku-4-5-20251001"
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

// PlanContextRecord — REMOVED in v1.7
// Replaced by UserContextRecord (structured) + updateUserContext interpreter.
// See UserContextRecord above.
```

---

## Exercise Definition Library

```typescript
// ─── Tag Dictionary ──────────────────────────────────────────────────────────
// All tag values are terse codes. AI reads tags only, never instructions.
// Human-readable meanings documented here for reference.
//
// Movement pattern
//   push_h, push_v, pull_h, pull_v, hinge, squat, lunge,
//   carry, rotation, iso, plyo, gait
//
// Muscle groups
//   chest, lats, upper_back, traps, rhomboids,
//   delt_a, delt_l, delt_p,  (anterior / lateral / posterior)
//   biceps, triceps, forearms,
//   core, obliques, erectors,
//   glutes, quads, hams, calves,
//   hip_flex, adductors, abductors
//
// Equipment
//   bw, db, kb, bb, cb, band, trx, bench, pullup, cable, ball, roller, mat
//
// Body position
//   stand, sit, kneel, prone, supine, lateral, hang, quadruped
//
// Joint stress (joints that bear significant load)
//   knee, shoulder, wrist, lback, ankle, hip, elbow, neck
//
// Category
//   str, mob, stretch, warmup, plyo, balance, stab
//
// Plane of motion
//   sag, front, trans
//
// Anchor point (resistance bands)
//   anchor_none, anchor_low, anchor_mid, anchor_high, anchor_foot, anchor_door

// ─── ExerciseDefinition ──────────────────────────────────────────────────────
// Canonical exercise library. Each entry describes an exercise independent of
// any specific plan or session. Exercise.name is the join key from per-session
// Exercise records to this library.
//
// Human-facing content (instructions, formCues) is NOT sent to the AI.
// Tags and numeric attributes are the AI's sole input for exercise selection,
// substitution, and plan construction. This keeps the AI cache terse.

interface ExerciseDefinition {
  id: string;                        // UUID
  name: string;                      // canonical name; join key from Exercise.name
  aliases: string[];                 // alternative names for matching/search

  // Human-facing content (NOT sent to AI — tags carry all AI-relevant info)
  instructions: string[];            // step-by-step how-to; rendered as bullet list
  formCues: string[];                // short cues displayed during execution
  youtubeSearchQuery: string;        // for "Watch on YouTube" button

  // Future media
  mediaUrl: string | null;           // gif/video URL
  mediaThumbnailUrl: string | null;

  // ── Tags (terse, AI-facing) ─────────────────────────────────────────────
  movement: string[];                // e.g. ["push_h"]
  primaryMuscles: string[];          // e.g. ["chest", "triceps", "delt_a"]
  secondaryMuscles: string[];        // e.g. ["core"]
  equipment: string[];               // e.g. ["band"]; ["bw"] for bodyweight
  bodyPosition: string[];            // e.g. ["supine"]
  jointStress: string[];             // e.g. ["shoulder", "elbow"]
  category: string[];                // e.g. ["str"]
  plane: string[];                   // e.g. ["sag", "trans"]
  anchorPoint: string[];             // e.g. ["anchor_high"]; [] if no anchor needed

  // ── Numeric attributes ─────────────────────────────────────────────────
  difficulty: number;                // 1-5
  complexity: number;                // 1-5 (skill/coordination demand, independent of difficulty)
  hrImpact: number;                  // 1-5 (1=significantly lowers, 3=maintains, 5=significantly raises)
  spaceOverhead: number;             // 1-3 (1=none/seated, 2=arms raised, 3=jumping/overhead press)
  spaceHorizontal: number;           // 1-3 (1=stationary, 2=small area, 3=lunges/sprawls)
  gripDemand: number;                // 1-3 (1=none, 2=moderate, 3=grip-intensive)
  noiseLevel: number;                // 1-3 (1=silent, 2=moderate, 3=loud/impact)

  // ── Defaults for plan generation ────────────────────────────────────────
  defaultStepType: StepType;         // 'timed' or 'rep' — how this exercise is typically programmed
  typicalDurationRange: [number, number] | null; // seconds, e.g. [20, 60]; null if rep-based
  typicalRepRange: [number, number] | null;      // e.g. [8, 15]; null if timed

  // ── Flags ───────────────────────────────────────────────────────────────
  isUnilateral: boolean;
  isCompound: boolean;               // multi-joint movement
  hasJumping: boolean;               // hard filter for knees, apartments, etc.
  stretchLoaded: boolean;            // loads muscle in lengthened position
  weightable: boolean;               // can be meaningfully loaded with external weight

  // ── Variants ────────────────────────────────────────────────────────────
  // Minor execution tweaks sharing parent instructions/media/tags.
  // If movement or impact differs meaningfully → separate ExerciseDefinition.
  variants: ExerciseVariant[];

  // ── Relationship hints ──────────────────────────────────────────────────
  // Flexible suggestions, not rigid constraints. AI uses alongside tags.
  substitutes: string[];             // exercise names that could replace this
  progressions: string[];            // harder exercises (ordered easiest → hardest)
  regressions: string[];             // easier exercises (ordered hardest → easiest)

  // ── Metadata ────────────────────────────────────────────────────────────
  createdAt: string;                 // ISO 8601
  updatedAt: string;
}

interface ExerciseVariant {
  name: string;                      // e.g. "Bicep Curl (pause at top)"
  cueOverride: string | null;        // single additional/replacement cue; null = use parent cues
}
```

### AI Cache Format

When sent to the AI for plan generation or modification, each exercise compresses to terse JSON. Human-facing fields (instructions, formCues, youtubeSearchQuery, media) are excluded. Example:

```json
{"n":"Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],
 "eq":["bw"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],
 "pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,
 "st":"rep","rr":[8,20],"dr":null,
 "uni":false,"cmp":true,"jmp":false,"stl":false,"wt":true,
 "sub":["Pike Push-Up","Bench Press"],"prog":["Decline Push-Up","Archer Push-Up"],
 "reg":["Knee Push-Up","Wall Push-Up"],"var":["Push-Up (pause)","Push-Up (wide grip)"]}
```

---

## AI Input Schema (v1.2)

```typescript
// ─── generatePlan input ───────────────────────────────────────────────────────
// userProfile (cache checkpoint 2) and userContext (cache checkpoint 3) are sent
// as separate blocks to maximise cache stability. userProfile rarely changes;
// userContext updates whenever the interpreter runs. The plan AI uses userContext
// as the authoritative current state and userProfile for identity/demographic context.

interface GeneratePlanInput {
  schemaVersion: number;
  userProfile: UserProfile;            // stable cache block; identity + demographics
  userContext: UserContextRecord;      // current fitness profile + all preferences
  recentFeedback: SessionFeedback[];   // may be empty at first generation
}

// ─── modifyPlan input ─────────────────────────────────────────────────────────
// The interpreter (updateUserContext) runs before this call and updates userContext
// with any preference signals from the current user message. modifyPlan therefore
// always receives an up-to-date userContext without needing to extract preferences itself.

interface ModifyPlanInput {
  schemaVersion: number;
  userProfile: UserProfile;            // stable cache block
  userContext: UserContextRecord;      // updated by interpreter before this call
  currentPlan: Plan;
  currentSessions: Session[];
  currentExercises: Exercise[];
  recentFeedback: SessionFeedback[];   // recent post-session feedback comments; may be empty
  conversation: ConversationMessage[]; // current modification conversation only; no prior session history
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── updateUserContext input ──────────────────────────────────────────────────
// Runs before every user-facing AI interaction. Extracts preference signals from
// raw user input and updates the structured UserContextRecord.
// Model: claude-haiku-4-5-20251001
// Trigger points: onboarding completion, post-session feedback, each plan chat
//                 message, explicit profile edit.

interface UpdateUserContextInput {
  schemaVersion: number;
  inputType: 'onboarding' | 'feedback' | 'planChat' | 'profileEdit';
  sessionContext: string | null;       // for feedback: session name + whether completed; null otherwise
  currentContext: UserContextRecord;   // full current state; interpreter produces full replacement
  rawInput: string;                    // single user message (planChat) or full text (all other types)
}
```

---

## AI Output Schema (v1.2)

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
// The plan AI does NOT update UserContextRecord — that is the interpreter's sole
// responsibility. contextRecordUpdate has been removed.

interface ModifyPlanOutput {
  schemaVersion: number;
  summary: string;                   // plain-language rationale shown to user in before/after preview
  planChanges: Partial<PlanDraft> | null;
  sessionChanges: SessionChange[];
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

// ─── updateUserContext output ─────────────────────────────────────────────────
// Always a full replacement of UserContextRecord — never a delta.
// extractionSummary is human-readable and drives test harness evaluation:
// it describes what changed and why, so prompt quality can be assessed
// without diffing the full context objects manually.

interface UpdateUserContextOutput {
  schemaVersion: number;
  updatedContext: UserContextRecord;  // full replacement
  extractionSummary: string;          // e.g. "Updated equipment to add 'trx'. Set prefHigherIntensity to -1 based on 'that was way too hard'."
}
```

---

## Versioning Policy
Every AI call must include schemaVersion in both input and output.
Validate AI responses against current schema before writing to store.
Schema changes must be additive by default.
Destructive changes require a version bump and a compatibility layer entry before any dependent code is written.

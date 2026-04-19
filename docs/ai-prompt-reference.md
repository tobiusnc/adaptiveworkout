# AI Prompt Reference — Adaptive Workout App
# Exercise Library + Schema for Manual Prompt Testing
# Generated: 2026-04-17  |  Updated: 2026-04-18 (schema v1.7)
# Exercise count: 136  |  Variants: 7
# =============================================================
# PURPOSE
# This document is the complete AI context for plan generation and modification.
# Use it as a reference when testing prompts manually (e.g. via Claude.ai Pro).
# Paste Section 1 (tag dictionary) and Section 2 (schemas) into your system prompt,
# followed by Section 3 (exercise library). Then provide a user profile or
# modification request as the user message.
# =============================================================

---

## SECTION 1 — TAG DICTIONARY

The exercise library uses terse codes throughout. Meanings are:

### Field keys (used in terse JSON)
| Key  | Full name              | Type          |
|------|------------------------|---------------|
| id   | exercise ID            | string        |
| n    | name                   | string        |
| mv   | movement pattern       | string[]      |
| pm   | primary muscles        | string[]      |
| sm   | secondary muscles      | string[]      |
| eq   | equipment required     | string[]      |
| bp   | body position          | string[]      |
| js   | joint stress           | string[]      |
| cat  | category               | string[]      |
| pl   | plane of motion        | string[]      |
| ap   | anchor point (bands)   | string[]      |
| d    | difficulty             | 1–5 int       |
| cx   | complexity             | 1–5 int       |
| hr   | HR impact              | 1–5 int       |
| so   | space overhead         | 1–3 int       |
| sh   | space horizontal       | 1–3 int       |
| gd   | grip demand            | 1–3 int       |
| nl   | noise level            | 1–3 int       |
| st   | default step type      | "timed"/"rep" |
| dr   | typical duration range | [min,max]s    |
| rr   | typical rep range      | [min,max]     |
| uni  | is unilateral          | bool          |
| cmp  | is compound            | bool          |
| jmp  | has jumping            | bool          |
| stl  | stretch loaded         | bool          |
| wt   | weightable             | bool          |
| sub  | substitutes            | name[]        |
| prog | progressions (harder)  | name[]        |
| reg  | regressions (easier)   | name[]        |
| var  | variants               | name[]        |

### Movement pattern codes
push_h, push_v, pull_h, pull_v, hinge, squat, lunge, carry, rotation, iso, plyo, gait

### Muscle group codes
chest, lats, upper_back, traps, rhomboids,
delt_a (anterior deltoid), delt_l (lateral deltoid), delt_p (posterior deltoid),
biceps, triceps, forearms,
core, obliques, erectors,
glutes, quads, hams, calves,
hip_flex, adductors, abductors

### Equipment codes
bw (bodyweight), db (dumbbell), kb (kettlebell), bb (barbell), cb (curl bar),
band (resistance band), trx, bench, pullup (pull-up bar), cable, ball, roller, mat

### Body position codes
stand, sit, kneel, prone, supine, lateral, hang, quadruped

### Joint stress codes
knee, shoulder, wrist, lback (lower back), ankle, hip, elbow, neck

### Category codes
str (strength), mob (mobility), stretch, warmup, plyo (plyometric), balance, stab (stability)

### Plane of motion codes
sag (sagittal), front (frontal), trans (transverse)

### Anchor point codes (resistance bands only)
anchor_none (held/looped, no fixed anchor), anchor_low (door bottom / floor level),
anchor_mid (waist height), anchor_high (overhead), anchor_foot (stepped on), anchor_door (door frame)

### Numeric scales
- d (difficulty): 1=very easy → 5=very hard
- cx (complexity): 1=simple → 5=high skill/coordination demand (independent of difficulty)
- hr (HR impact): 1=significantly lowers HR, 3=neutral/maintains, 5=significantly raises HR
- so (space overhead): 1=none/seated, 2=arms raised above head, 3=jumping or full overhead press
- sh (space horizontal): 1=stationary footprint, 2=small area shift, 3=lunges/sprawls/crawls
- gd (grip demand): 1=no grip, 2=moderate grip, 3=grip-intensive
- nl (noise level): 1=silent, 2=moderate, 3=loud/impact

---

## SECTION 2 — USER CONTEXT SCHEMA AND AI INPUT / OUTPUT SCHEMAS

### UserContextRecord — structure

The interpreter (updateUserContext / Haiku) maintains this record and passes it to
the plan AI before every generatePlan or modifyPlan call. It is the authoritative
current state of the user's fitness profile and all preferences.

```typescript
// null  = preference never expressed (do not infer)
// -2 = strong avoidance  -1 = mild avoidance
// 1  = mild preference    2  = strong preference
type PreferenceLevel = -2 | -1 | 1 | 2 | null;

interface UserContextRecord {
  id: string;
  schemaVersion: number;
  userId: string | null;

  // Current fitness profile (authoritative current state)
  primaryGoal: "general_fitness" | "strength" | "hypertrophy" | "weight_loss" | "rehabilitation";
  equipment: string[];               // current equipment codes, e.g. ["bw","band","trx"]
  sessionsPerWeek: number;
  targetDuration: "20-30" | "30-45" | "45-60" | "60+";
  fitnessLevel: "beginner" | "intermediate" | "experienced";

  // Physical constraints
  jointLimitations: string[];        // joint stress codes to exclude: e.g. ["knee","lback"]
  movementLimitations: string[];     // movement codes to exclude: e.g. ["plyo","squat"]
  limitationsNotes: string[];        // nuanced notes; append-only history

  // Positive preferences
  preferredExercises: string[];      // exercise names user has expressed liking
  preferredMovements: string[];      // movement pattern codes user favors
  preferredEquipment: string[];      // equipment user prefers when multiple options exist

  // Negative preferences
  dislikedExercises: string[];       // exercise names to minimize or avoid
  dislikedMovements: string[];       // movement pattern codes to minimize

  // Style / intensity preferences (PreferenceLevel each)
  prefHigherReps: PreferenceLevel;      // +: more reps/lighter  −: fewer/heavier
  prefLongerRest: PreferenceLevel;      // +: longer rest periods
  prefMoreVariety: PreferenceLevel;     // +: vary exercises session to session
  prefHigherIntensity: PreferenceLevel; // +: harder overall
  prefLongerSessions: PreferenceLevel;  // +: lean toward upper end of targetDuration
  prefMoreRounds: PreferenceLevel;      // +: more rounds per session
  prefCompoundFocus: PreferenceLevel;   // +: compound focus  −: isolation focus

  // Environment constraints (max acceptable level; maps to exercise tags)
  spaceConstraint: 1 | 2 | 3 | null;   // maps to space_overhead / space_horizontal tags
  noiseConstraint: 1 | 2 | 3 | null;   // maps to noise_level tag

  // Safety valve — directions that don't map to structured fields; never removed
  additionalDirections: string[];

  updatedAt: string;
  updatedByModel: string;
}
```

---

### updateUserContext — Input / Output (Haiku)

Runs before every plan AI call. Extracts preference signals from raw user input and
updates UserContextRecord. Always returns a full replacement, never a delta.

```typescript
interface UpdateUserContextInput {
  schemaVersion: number;
  inputType: "onboarding" | "feedback" | "planChat" | "profileEdit";
  sessionContext: string | null;       // for feedback: session name + completion status
  currentContext: UserContextRecord;
  rawInput: string;                    // single message (planChat) or full text (others)
}

interface UpdateUserContextOutput {
  schemaVersion: number;
  updatedContext: UserContextRecord;   // full replacement
  extractionSummary: string;           // what changed and why — drives test harness evaluation
}
```

---

### generatePlan — Input / Output (Sonnet)

```typescript
interface GeneratePlanInput {
  schemaVersion: number;
  userProfile: {                       // stable cache block — identity + demographics only
    id: string;
    createdAt: string;                 // proxy for training age
    age: number | null;
    biologicalSex: string | null;
    // (other demographics future-use)
  };
  userContext: UserContextRecord;      // authoritative current state; see above
  recentFeedback: Array<{
    completedAt: string;
    isComplete: boolean;
    commentText: string | null;
  }>;
  // exerciseLibrary is provided in Section 3 below
}

interface GeneratePlanOutput {
  schemaVersion: number;
  plan: {
    name: string;
    description: string;
    config: {
      defaultWorkSec: number;
      restBetweenExSec: number;
      stretchBetweenRoundsSec: number;  // total: stretch + rest combined
      restBetweenRoundsSec: number;     // remaining rest after stretch; skip if < 5s
      warmupDelayBetweenItemsSec: number;
      cooldownDelayBetweenItemsSec: number;
    };
  };
  sessions: Array<{
    name: string;
    type: "resistance" | "mobility" | "stretching";
    orderInPlan: number;
    rounds: number;
    estimatedDurationMinutes: number;  // pre-calculate accurately; see duration notes below
    workSec: number;
    restBetweenExSec: number;
    stretchBetweenRoundsSec: number;
    restBetweenRoundsSec: number;
    warmupDelayBetweenItemsSec: number;
    cooldownDelayBetweenItemsSec: number;
    betweenRoundExercise: ExerciseDraft | null;
    exercises: ExerciseDraft[];
  }>;
}

interface ExerciseDraft {
  phase: "warmup" | "main" | "cooldown" | null;  // null = betweenRoundExercise only
  order: number;
  exerciseId: string;      // MUST be an id present in the exerciseLibrary
  type: "timed" | "rep";
  durationSec: number | null;
  reps: number | null;
  isBilateral: boolean;
}
```

---

### modifyPlan — Input / Output (Sonnet)

```typescript
interface ModifyPlanInput {
  schemaVersion: number;
  userProfile: { id: string; createdAt: string; age: number | null; };  // stable cache block
  userContext: UserContextRecord;      // updated by interpreter before this call
  currentPlan: { name: string; description: string; config: PlanConfig; };
  currentSessions: Session[];
  currentExercises: Exercise[];
  recentFeedback: Array<{ completedAt: string; isComplete: boolean; commentText: string | null; }>;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
  // exerciseLibrary is provided in Section 3 below
}

interface ModifyPlanOutput {
  schemaVersion: number;
  summary: string;                     // plain-language rationale for before/after preview
  planChanges: Partial<PlanDraft> | null;
  sessionChanges: Array<{
    sessionId: string | null;          // null = new session
    action: "update" | "add" | "remove";
    sessionDraft: Partial<SessionDraft> | null;
    exerciseChanges: Array<{
      exerciseId: string | null;       // null = new exercise
      action: "update" | "add" | "remove";
      exerciseDraft: Partial<ExerciseDraft> | null;
    }>;
  }>;
  // NOTE: the plan AI does NOT return a context record update.
  // UserContextRecord is maintained exclusively by the updateUserContext interpreter.
}
```

---

### Duration estimation notes
The runtime executes sessions in this fixed order:
1. Warmup — sequential items with warmupDelayBetweenItemsSec auto-pause between items
2. Main circuit x N rounds:
   a. Each exercise: workSec (or user-paced for reps)
   b. restBetweenExSec between exercises
   c. End of each round (except final): stretchBetweenRoundsSec (stretch + rest combined)
3. Cooldown — sequential timed stretches with cooldownDelayBetweenItemsSec auto-pause between items

For bilateral timed exercises (uni=true, type="timed"): durationSec is per-side;
runtime doubles it. Account for this in estimatedDurationMinutes.

### Hard constraints (algorithmic — always enforced)
- exerciseId MUST be an id present in the exerciseLibrary. Unknown IDs are validation failures.
- eq[] tags of selected exercises must be a subset of userContext.equipment.
- js[] (joint stress) of selected exercises must not conflict with userContext.jointLimitations.
- Exercises with space_overhead or space_horizontal > userContext.spaceConstraint are excluded.
- Exercises with noise_level > userContext.noiseConstraint are excluded.

---

## SECTION 3 — EXERCISE LIBRARY (136 exercises)

One exercise per line. Each line is compact JSON.
Field key meanings are in Section 1.
The AI must only reference id values present in this list.

```
{"id":"ed-001","n":"Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],"eq":["bw"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,20],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Diamond Push-Up","Banded Push-Up","Banded Chest Fly"],"prog":["Diamond Push-Up","Decline Push-Up","Archer Push-Up"],"reg":["Knee Push-Up","Incline Push-Up","Wall Push-Up"],"var":["Push-Up (pause at bottom)","Push-Up (wide grip)"]}
{"id":"ed-002","n":"Knee Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],"eq":["bw"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Incline Push-Up","Wall Push-Up","Banded Chest Fly"],"prog":["Push-Up","Diamond Push-Up","Decline Push-Up"],"reg":["Incline Push-Up","Wall Push-Up"]}
{"id":"ed-003","n":"Wall Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],"eq":["bw"],"bp":["stand"],"js":["wrist"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,25],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Knee Push-Up","Incline Push-Up","Banded Chest Fly"],"prog":["Incline Push-Up","Knee Push-Up","Push-Up"],"reg":[]}
{"id":"ed-004","n":"Banded Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],"eq":["band","bw"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_none"],"d":3,"cx":2,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[6,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Push-Up","Diamond Push-Up","Decline Push-Up"],"prog":["Diamond Push-Up","Decline Push-Up","Archer Push-Up"],"reg":["Push-Up","Knee Push-Up","Incline Push-Up"]}
{"id":"ed-005","n":"Banded Pull-Apart","mv":["pull_h"],"pm":["upper_back","rhomboids","delt_p"],"sm":["traps"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_none"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Face Pull","Banded Row","Banded Reverse Fly"],"prog":["Banded Reverse Fly","Banded Face Pull","Banded Row"],"reg":[]}
{"id":"ed-006","n":"Banded Row","mv":["pull_h"],"pm":["lats","upper_back","rhomboids"],"sm":["biceps","core"],"eq":["band"],"bp":["stand"],"js":["lback","shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_mid","anchor_foot"],"d":2,"cx":1,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Pull-Apart","Inverted Row","Banded Reverse Fly"],"prog":["Banded Single-Arm Row","Inverted Row","Pull-Up"],"reg":["Banded Pull-Apart","Banded Reverse Fly"]}
{"id":"ed-007","n":"Banded Face Pull","mv":["pull_h"],"pm":["delt_p","upper_back","rhomboids"],"sm":["traps","biceps"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag","trans"],"ap":["anchor_high"],"d":2,"cx":2,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Pull-Apart","Banded Row","Banded Reverse Fly"],"prog":["Banded Single-Arm Row","Inverted Row"],"reg":["Banded Pull-Apart","Banded Reverse Fly"]}
{"id":"ed-008","n":"Bodyweight Squat","mv":["squat"],"pm":["quads","glutes"],"sm":["core","adductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,25],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Banded Squat","Sumo Squat","Wall Sit"],"prog":["Banded Squat","Jump Squat","Pistol Squat"],"reg":["Wall Sit"],"var":["Bodyweight Squat (pause at bottom)","Bodyweight Squat (1.5 rep)"]}
{"id":"ed-009","n":"Banded Squat","mv":["squat"],"pm":["quads","glutes"],"sm":["core","adductors"],"eq":["band","bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Bodyweight Squat","Sumo Squat","Wall Sit"],"prog":["Banded Sumo Squat","Cossack Squat","Jump Squat"],"reg":["Bodyweight Squat","Sumo Squat"]}
{"id":"ed-010","n":"Banded Good Morning","mv":["hinge"],"pm":["hams","glutes","erectors"],"sm":["core"],"eq":["band","bw"],"bp":["stand"],"js":["lback","hip"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":2,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Romanian Deadlift","Glute Bridge","Banded Pull-Through"],"prog":["Banded Romanian Deadlift","Single-Leg Romanian Deadlift","Nordic Curl"],"reg":["Glute Bridge","Banded Glute Bridge"]}
{"id":"ed-011","n":"Glute Bridge","mv":["hinge"],"pm":["glutes","hams"],"sm":["core","erectors"],"eq":["bw"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Banded Good Morning","Single-Leg Glute Bridge","Banded Pull-Through"],"prog":["Banded Glute Bridge","Single-Leg Glute Bridge","Hip Thrust"],"reg":[],"var":["Glute Bridge (hold at top)"]}
{"id":"ed-012","n":"Reverse Lunge","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":4,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Forward Lunge","Split Squat","Lateral Lunge"],"prog":["Banded Reverse Lunge","Walking Lunge","Bulgarian Split Squat"],"reg":["Split Squat","Bodyweight Squat"]}
{"id":"ed-013","n":"Plank","mv":["iso"],"pm":["core"],"sm":["delt_a","glutes","quads"],"eq":["bw"],"bp":["prone"],"js":["shoulder","lback"],"cat":["str","stab"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,60],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Dead Bug","Bird Dog","Side Plank"],"prog":["Plank Shoulder Tap","Side Plank","Banded Pallof Press"],"reg":["Knee Plank","Dead Bug"],"var":["Plank (shoulder tap)"]}
{"id":"ed-014","n":"Dead Bug","mv":["iso"],"pm":["core","obliques"],"sm":["hip_flex"],"eq":["bw"],"bp":["supine"],"js":["lback"],"cat":["str","stab"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Plank","Bird Dog","Knee Plank"],"prog":["Plank Shoulder Tap","Bicycle Crunch","V-Up"],"reg":["Knee Plank","Bird Dog"]}
{"id":"ed-015","n":"Bird Dog","mv":["iso"],"pm":["core","erectors","glutes"],"sm":["delt_a","hams"],"eq":["bw"],"bp":["quadruped"],"js":["lback"],"cat":["str","stab"],"pl":["sag"],"ap":[],"d":1,"cx":2,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Dead Bug","Plank","Knee Plank"],"prog":["Dead Bug","Plank","Plank Shoulder Tap"],"reg":[]}
{"id":"ed-016","n":"Banded Overhead Press","mv":["push_v"],"pm":["delt_a","delt_l","triceps"],"sm":["core","traps"],"eq":["band","bw"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":3,"so":3,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Pike Push-Up","Banded Lateral Raise","Banded Front Raise"],"prog":["Pike Push-Up","Decline Pike Push-Up","Wall Handstand Push-Up"],"reg":["Banded Lateral Raise","Banded Front Raise"]}
{"id":"ed-017","n":"Banded Lateral Raise","mv":["iso"],"pm":["delt_l"],"sm":["traps","delt_a"],"eq":["band","bw"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["front"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Front Raise","Banded Overhead Press","Banded Shrug"],"prog":["Banded Upright Row","Banded Overhead Press","Pike Push-Up"],"reg":["Banded Front Raise"]}
{"id":"ed-018","n":"Banded Bicep Curl","mv":["pull_v"],"pm":["biceps"],"sm":["forearms"],"eq":["band","bw"],"bp":["stand"],"js":["elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Hammer Curl","Banded Reverse Curl","Chin-Up"],"prog":["Banded Hammer Curl","Banded Concentration Curl","Banded Bayesian Curl"],"reg":[],"var":["Banded Bicep Curl (pause at top)"]}
{"id":"ed-019","n":"Banded Tricep Pushdown","mv":["push_v"],"pm":["triceps"],"sm":["forearms"],"eq":["band"],"bp":["stand"],"js":["elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_high"],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Diamond Push-Up","Banded Overhead Tricep Extension","Banded Tricep Kickback"],"prog":["Banded Tricep Kickback","Banded Overhead Tricep Extension","Tricep Dip"],"reg":[]}
{"id":"ed-020","n":"Standing Quad Stretch","mv":["iso"],"pm":["quads","hip_flex"],"sm":[],"eq":["bw"],"bp":["stand"],"js":["knee"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Kneeling Hip Flexor Stretch","Standing Hamstring Stretch","Figure-Four Stretch"],"prog":[],"reg":[]}
{"id":"ed-021","n":"Incline Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],"eq":["bw","bench"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,25],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Knee Push-Up","Wall Push-Up","Banded Chest Fly"],"prog":["Push-Up","Diamond Push-Up","Decline Push-Up"],"reg":["Wall Push-Up"]}
{"id":"ed-022","n":"Diamond Push-Up","mv":["push_h"],"pm":["triceps","chest","delt_a"],"sm":["core"],"eq":["bw"],"bp":["prone"],"js":["wrist","shoulder","elbow"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":1,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Push-Up","Banded Push-Up","Banded Tricep Pushdown"],"prog":["Bodyweight Skull Crusher","Archer Push-Up"],"reg":["Push-Up","Knee Push-Up","Incline Push-Up"]}
{"id":"ed-023","n":"Decline Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core","delt_l"],"eq":["bw","bench"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":1,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Push-Up","Banded Push-Up","Diamond Push-Up"],"prog":["Archer Push-Up","Pike Push-Up","Wall Handstand Push-Up"],"reg":["Push-Up","Incline Push-Up","Knee Push-Up"]}
{"id":"ed-024","n":"Archer Push-Up","mv":["push_h"],"pm":["chest","triceps","delt_a"],"sm":["core"],"eq":["bw"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str"],"pl":["sag"],"ap":[],"d":4,"cx":3,"hr":4,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[4,10],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Decline Push-Up","Diamond Push-Up","Banded Push-Up"],"prog":["Wall Handstand Push-Up"],"reg":["Push-Up","Decline Push-Up","Diamond Push-Up"]}
{"id":"ed-025","n":"Banded Chest Fly","mv":["push_h"],"pm":["chest"],"sm":["delt_a","biceps"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_mid","anchor_none"],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Push-Up","Banded Push-Up","Incline Push-Up"],"prog":["Banded Push-Up","Diamond Push-Up","Decline Push-Up"],"reg":["Wall Push-Up","Knee Push-Up"]}
{"id":"ed-026","n":"Pike Push-Up","mv":["push_v"],"pm":["delt_a","delt_l","triceps"],"sm":["chest","core","traps"],"eq":["bw"],"bp":["prone"],"js":["shoulder","wrist"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":2,"hr":3,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Banded Overhead Press","Decline Pike Push-Up","Hindu Push-Up"],"prog":["Decline Pike Push-Up","Wall Handstand Push-Up"],"reg":["Banded Overhead Press","Banded Front Raise"]}
{"id":"ed-027","n":"Hindu Push-Up","mv":["push_v","push_h"],"pm":["chest","delt_a","triceps"],"sm":["core","erectors","hip_flex"],"eq":["bw"],"bp":["prone"],"js":["shoulder","wrist","lback"],"cat":["str","mob"],"pl":["sag"],"ap":[],"d":3,"cx":3,"hr":4,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Pike Push-Up","Push-Up","Decline Push-Up"],"prog":["Decline Pike Push-Up","Archer Push-Up","Wall Handstand Push-Up"],"reg":["Push-Up","Incline Push-Up","Banded Overhead Press"]}
{"id":"ed-028","n":"Decline Pike Push-Up","mv":["push_v"],"pm":["delt_a","delt_l","triceps"],"sm":["chest","core","traps"],"eq":["bw","bench"],"bp":["prone"],"js":["shoulder","wrist"],"cat":["str"],"pl":["sag"],"ap":[],"d":4,"cx":2,"hr":3,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[4,10],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Pike Push-Up","Banded Overhead Press","Hindu Push-Up"],"prog":["Wall Handstand Push-Up"],"reg":["Pike Push-Up","Banded Overhead Press","Hindu Push-Up"]}
{"id":"ed-029","n":"Wall Handstand Push-Up","mv":["push_v"],"pm":["delt_a","delt_l","triceps","traps"],"sm":["core","chest"],"eq":["bw"],"bp":["prone"],"js":["shoulder","wrist","neck"],"cat":["str"],"pl":["sag"],"ap":[],"d":5,"cx":4,"hr":4,"so":3,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[2,8],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Decline Pike Push-Up","Pike Push-Up","Hindu Push-Up"],"prog":[],"reg":["Decline Pike Push-Up","Pike Push-Up","Banded Overhead Press"]}
{"id":"ed-030","n":"Banded Reverse Fly","mv":["pull_h"],"pm":["delt_p","upper_back","rhomboids"],"sm":["traps"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_none"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Pull-Apart","Banded Face Pull","Banded External Rotation"],"prog":["Banded Face Pull","Banded Row","Banded Single-Arm Row"],"reg":["Banded Pull-Apart"]}
{"id":"ed-031","n":"Banded Single-Arm Row","mv":["pull_h"],"pm":["lats","upper_back","rhomboids"],"sm":["biceps","core","obliques"],"eq":["band"],"bp":["stand"],"js":["lback","shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_mid","anchor_foot"],"d":2,"cx":1,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Row","Inverted Row","Banded Face Pull"],"prog":["Inverted Row","Pull-Up","Chin-Up"],"reg":["Banded Row","Banded Pull-Apart"]}
{"id":"ed-032","n":"Inverted Row","mv":["pull_h"],"pm":["lats","upper_back","rhomboids","biceps"],"sm":["core","delt_p","forearms"],"eq":["bw"],"bp":["supine"],"js":["shoulder","elbow"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":1,"sh":2,"gd":3,"nl":1,"st":"rep","dr":null,"rr":[6,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Banded Row","Pull-Up","Banded Single-Arm Row"],"prog":["Banded Assisted Pull-Up","Pull-Up","Chin-Up"],"reg":["Banded Row","Banded Single-Arm Row","Banded Pull-Apart"]}
{"id":"ed-033","n":"Banded Lat Pulldown","mv":["pull_v"],"pm":["lats","upper_back"],"sm":["biceps","rhomboids","traps"],"eq":["band"],"bp":["kneel"],"js":["shoulder","elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_high","anchor_door"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Straight-Arm Pulldown","Banded Assisted Pull-Up","Banded Row"],"prog":["Banded Assisted Pull-Up","Pull-Up","Chin-Up"],"reg":["Banded Straight-Arm Pulldown"]}
{"id":"ed-034","n":"Banded Straight-Arm Pulldown","mv":["pull_v"],"pm":["lats"],"sm":["triceps","core","delt_p"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_high","anchor_door"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Lat Pulldown","Banded Row","Banded Reverse Fly"],"prog":["Banded Lat Pulldown","Banded Assisted Pull-Up","Pull-Up"],"reg":[]}
{"id":"ed-035","n":"Banded Assisted Pull-Up","mv":["pull_v"],"pm":["lats","upper_back","biceps"],"sm":["forearms","core","delt_p","rhomboids"],"eq":["band","pullup"],"bp":["hang"],"js":["shoulder","elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_high"],"d":3,"cx":2,"hr":3,"so":3,"sh":1,"gd":3,"nl":1,"st":"rep","dr":null,"rr":[4,10],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Lat Pulldown","Inverted Row","Banded Row"],"prog":["Pull-Up","Chin-Up"],"reg":["Banded Lat Pulldown","Inverted Row","Banded Row"]}
{"id":"ed-036","n":"Pull-Up","mv":["pull_v"],"pm":["lats","upper_back","biceps"],"sm":["forearms","core","delt_p","rhomboids"],"eq":["pullup"],"bp":["hang"],"js":["shoulder","elbow"],"cat":["str"],"pl":["sag"],"ap":[],"d":4,"cx":2,"hr":4,"so":3,"sh":1,"gd":3,"nl":1,"st":"rep","dr":null,"rr":[3,12],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Chin-Up","Banded Assisted Pull-Up","Inverted Row"],"prog":[],"reg":["Banded Assisted Pull-Up","Inverted Row","Banded Lat Pulldown"]}
{"id":"ed-037","n":"Chin-Up","mv":["pull_v"],"pm":["biceps","lats","upper_back"],"sm":["forearms","core","delt_p","rhomboids"],"eq":["pullup"],"bp":["hang"],"js":["shoulder","elbow"],"cat":["str"],"pl":["sag"],"ap":[],"d":4,"cx":2,"hr":4,"so":3,"sh":1,"gd":3,"nl":1,"st":"rep","dr":null,"rr":[3,12],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Pull-Up","Banded Assisted Pull-Up","Inverted Row"],"prog":[],"reg":["Banded Assisted Pull-Up","Inverted Row","Banded Lat Pulldown"]}
{"id":"ed-038","n":"Wall Sit","mv":["iso","squat"],"pm":["quads","glutes"],"sm":["core","calves"],"eq":["bw"],"bp":["stand"],"js":["knee"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,60],"rr":null,"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Bodyweight Squat","Sumo Squat","Banded Squat"],"prog":["Bodyweight Squat","Banded Squat","Cossack Squat"],"reg":[]}
{"id":"ed-039","n":"Sumo Squat","mv":["squat"],"pm":["quads","glutes","adductors"],"sm":["core","hams"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag","front"],"ap":[],"d":1,"cx":1,"hr":3,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Bodyweight Squat","Banded Sumo Squat","Wall Sit"],"prog":["Banded Sumo Squat","Cossack Squat","Pistol Squat"],"reg":["Bodyweight Squat"]}
{"id":"ed-040","n":"Banded Sumo Squat","mv":["squat"],"pm":["quads","glutes","adductors"],"sm":["core","hams"],"eq":["band","bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag","front"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":3,"so":2,"sh":2,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Sumo Squat","Banded Squat","Wall Sit"],"prog":["Cossack Squat","Assisted Pistol Squat","Pistol Squat"],"reg":["Sumo Squat","Bodyweight Squat"]}
{"id":"ed-041","n":"Cossack Squat","mv":["squat"],"pm":["quads","glutes","adductors"],"sm":["hams","hip_flex","core"],"eq":["bw"],"bp":["stand"],"js":["knee","hip","ankle"],"cat":["str","mob"],"pl":["front","sag"],"ap":[],"d":3,"cx":3,"hr":3,"so":2,"sh":3,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[5,10],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Lateral Lunge","Sumo Squat","Banded Sumo Squat"],"prog":["Assisted Pistol Squat","Pistol Squat"],"reg":["Lateral Lunge","Sumo Squat","Bodyweight Squat"]}
{"id":"ed-042","n":"Sissy Squat","mv":["squat"],"pm":["quads"],"sm":["hip_flex","core"],"eq":["bw"],"bp":["stand"],"js":["knee"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":3,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Bodyweight Squat","Wall Sit","Banded Squat"],"prog":["Assisted Pistol Squat","Pistol Squat"],"reg":["Bodyweight Squat","Wall Sit"]}
{"id":"ed-043","n":"Assisted Pistol Squat","mv":["squat"],"pm":["quads","glutes"],"sm":["core","hip_flex","adductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip","ankle"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":3,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[4,8],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Bulgarian Split Squat","Cossack Squat","Bodyweight Squat"],"prog":["Pistol Squat"],"reg":["Bulgarian Split Squat","Cossack Squat","Bodyweight Squat"]}
{"id":"ed-044","n":"Pistol Squat","mv":["squat"],"pm":["quads","glutes"],"sm":["core","hip_flex","adductors","calves"],"eq":["bw"],"bp":["stand"],"js":["knee","hip","ankle"],"cat":["str"],"pl":["sag"],"ap":[],"d":5,"cx":4,"hr":4,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[2,6],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Assisted Pistol Squat","Bulgarian Split Squat","Cossack Squat"],"prog":[],"reg":["Assisted Pistol Squat","Cossack Squat","Bulgarian Split Squat"]}
{"id":"ed-045","n":"Banded Glute Bridge","mv":["hinge"],"pm":["glutes","hams"],"sm":["core","abductors","erectors"],"eq":["band","bw"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":["anchor_none"],"d":2,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Glute Bridge","Hip Thrust","Banded Pull-Through"],"prog":["Hip Thrust","Single-Leg Glute Bridge","Nordic Curl"],"reg":["Glute Bridge"]}
{"id":"ed-046","n":"Single-Leg Glute Bridge","mv":["hinge"],"pm":["glutes","hams"],"sm":["core","erectors"],"eq":["bw"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":true,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Glute Bridge","Banded Glute Bridge","Banded Pull-Through"],"prog":["Hip Thrust","Single-Leg Romanian Deadlift","Nordic Curl"],"reg":["Glute Bridge","Banded Glute Bridge"]}
{"id":"ed-047","n":"Hip Thrust","mv":["hinge"],"pm":["glutes","hams"],"sm":["core","erectors","quads"],"eq":["bw","bench"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Glute Bridge","Single-Leg Glute Bridge","Banded Pull-Through"],"prog":["Single-Leg Glute Bridge","Single-Leg Romanian Deadlift","Nordic Curl"],"reg":["Glute Bridge","Banded Glute Bridge","Banded Good Morning"]}
{"id":"ed-048","n":"Banded Romanian Deadlift","mv":["hinge"],"pm":["hams","glutes","erectors"],"sm":["core","upper_back"],"eq":["band","bw"],"bp":["stand"],"js":["lback","hip"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":2,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Good Morning","Single-Leg Romanian Deadlift","Banded Pull-Through"],"prog":["Single-Leg Romanian Deadlift","Nordic Curl"],"reg":["Banded Good Morning","Glute Bridge","Banded Glute Bridge"]}
{"id":"ed-049","n":"Banded Pull-Through","mv":["hinge"],"pm":["glutes","hams"],"sm":["core","erectors"],"eq":["band"],"bp":["stand"],"js":["lback","hip"],"cat":["str"],"pl":["sag"],"ap":["anchor_low"],"d":2,"cx":2,"hr":3,"so":2,"sh":2,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Banded Romanian Deadlift","Banded Good Morning","Hip Thrust"],"prog":["Banded Romanian Deadlift","Single-Leg Romanian Deadlift","Nordic Curl"],"reg":["Glute Bridge","Banded Good Morning","Banded Glute Bridge"]}
{"id":"ed-050","n":"Nordic Curl","mv":["hinge"],"pm":["hams"],"sm":["glutes","core","calves"],"eq":["bw","mat"],"bp":["kneel"],"js":["knee"],"cat":["str"],"pl":["sag"],"ap":[],"d":5,"cx":3,"hr":3,"so":1,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[3,8],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Romanian Deadlift","Single-Leg Romanian Deadlift","Banded Pull-Through"],"prog":[],"reg":["Banded Romanian Deadlift","Banded Good Morning","Single-Leg Romanian Deadlift"]}
{"id":"ed-051","n":"Split Squat","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":3,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Reverse Lunge","Forward Lunge","Step-Up"],"prog":["Reverse Lunge","Walking Lunge","Bulgarian Split Squat"],"reg":["Bodyweight Squat"]}
{"id":"ed-052","n":"Forward Lunge","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":4,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Reverse Lunge","Split Squat","Step-Up"],"prog":["Walking Lunge","Bulgarian Split Squat","Banded Bulgarian Split Squat"],"reg":["Reverse Lunge","Split Squat","Bodyweight Squat"]}
{"id":"ed-053","n":"Banded Reverse Lunge","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors"],"eq":["band","bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":3,"cx":2,"hr":4,"so":2,"sh":2,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Reverse Lunge","Banded Squat","Walking Lunge"],"prog":["Banded Bulgarian Split Squat","Lunge Jump"],"reg":["Reverse Lunge","Forward Lunge","Split Squat"]}
{"id":"ed-054","n":"Lateral Lunge","mv":["lunge"],"pm":["quads","glutes","adductors"],"sm":["hams","core","abductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["front","sag"],"ap":[],"d":2,"cx":2,"hr":3,"so":2,"sh":3,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Cossack Squat","Reverse Lunge","Curtsy Lunge"],"prog":["Cossack Squat","Skater Jump"],"reg":["Sumo Squat","Reverse Lunge","Bodyweight Squat"]}
{"id":"ed-055","n":"Curtsy Lunge","mv":["lunge"],"pm":["glutes","quads","adductors"],"sm":["core","abductors","hams"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["front","sag"],"ap":[],"d":2,"cx":2,"hr":3,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Reverse Lunge","Lateral Lunge","Step-Up"],"prog":["Bulgarian Split Squat","Lunge Jump"],"reg":["Reverse Lunge","Split Squat","Bodyweight Squat"]}
{"id":"ed-056","n":"Walking Lunge","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors"],"eq":["bw"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":4,"so":2,"sh":3,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Forward Lunge","Reverse Lunge","Step-Up"],"prog":["Bulgarian Split Squat","Banded Bulgarian Split Squat","Lunge Jump"],"reg":["Reverse Lunge","Forward Lunge","Split Squat"]}
{"id":"ed-057","n":"Bulgarian Split Squat","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors","hip_flex"],"eq":["bw","bench"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":2,"hr":4,"so":2,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Reverse Lunge","Split Squat","Walking Lunge"],"prog":["Banded Bulgarian Split Squat","Pistol Squat","Lunge Jump"],"reg":["Reverse Lunge","Split Squat","Forward Lunge"]}
{"id":"ed-058","n":"Banded Bulgarian Split Squat","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","adductors","hip_flex"],"eq":["band","bw","bench"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":4,"cx":2,"hr":4,"so":2,"sh":2,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[6,10],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Bulgarian Split Squat","Banded Reverse Lunge","Assisted Pistol Squat"],"prog":["Pistol Squat","Lunge Jump"],"reg":["Bulgarian Split Squat","Banded Reverse Lunge","Walking Lunge"]}
{"id":"ed-059","n":"Step-Up","mv":["lunge"],"pm":["quads","glutes"],"sm":["hams","core","calves"],"eq":["bw","bench"],"bp":["stand"],"js":["knee","hip"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":true,"cmp":true,"jmp":false,"stl":false,"wt":true,"sub":["Reverse Lunge","Bulgarian Split Squat","Walking Lunge"],"prog":["Bulgarian Split Squat","Banded Bulgarian Split Squat","Lunge Jump"],"reg":["Reverse Lunge","Split Squat","Bodyweight Squat"]}
{"id":"ed-060","n":"Single-Leg Romanian Deadlift","mv":["hinge","lunge"],"pm":["hams","glutes"],"sm":["core","erectors","adductors"],"eq":["bw"],"bp":["stand"],"js":["lback","hip","ankle"],"cat":["str","balance"],"pl":["sag"],"ap":[],"d":3,"cx":3,"hr":3,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Banded Romanian Deadlift","Reverse Lunge","Banded Pull-Through"],"prog":["Nordic Curl"],"reg":["Banded Romanian Deadlift","Glute Bridge","Banded Good Morning"]}
{"id":"ed-061","n":"Banded Clamshell","mv":["iso"],"pm":["glutes","abductors"],"sm":["hip_flex"],"eq":["band"],"bp":["lateral"],"js":["hip"],"cat":["str"],"pl":["front"],"ap":["anchor_none"],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Fire Hydrant","Banded Hip Abduction","Donkey Kick"],"prog":["Banded Fire Hydrant","Banded Hip Abduction","Banded Lateral Walk"],"reg":[]}
{"id":"ed-062","n":"Donkey Kick","mv":["iso"],"pm":["glutes"],"sm":["hams","core"],"eq":["bw"],"bp":["quadruped"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Kickback","Glute Bridge","Banded Clamshell"],"prog":["Banded Kickback","Banded Hip Abduction","Banded Lateral Walk"],"reg":[]}
{"id":"ed-063","n":"Banded Fire Hydrant","mv":["iso"],"pm":["glutes","abductors"],"sm":["core","hip_flex"],"eq":["band","bw"],"bp":["quadruped"],"js":["hip"],"cat":["str"],"pl":["front"],"ap":["anchor_none"],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Clamshell","Banded Hip Abduction","Donkey Kick"],"prog":["Banded Hip Abduction","Banded Lateral Walk","Banded Kickback"],"reg":["Banded Clamshell","Donkey Kick"]}
{"id":"ed-064","n":"Banded Kickback","mv":["iso"],"pm":["glutes"],"sm":["hams","core"],"eq":["band","bw"],"bp":["stand"],"js":["hip","lback"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Donkey Kick","Glute Bridge","Banded Clamshell"],"prog":["Banded Pull-Through","Hip Thrust","Banded Lateral Walk"],"reg":["Donkey Kick","Banded Clamshell"]}
{"id":"ed-065","n":"Banded Hip Abduction","mv":["iso"],"pm":["abductors","glutes"],"sm":["core"],"eq":["band","bw"],"bp":["stand"],"js":["hip"],"cat":["str"],"pl":["front"],"ap":["anchor_none"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Clamshell","Banded Fire Hydrant","Donkey Kick"],"prog":["Banded Lateral Walk","Banded Fire Hydrant"],"reg":["Banded Clamshell","Donkey Kick"]}
{"id":"ed-066","n":"Banded Lateral Walk","mv":["gait"],"pm":["glutes","abductors"],"sm":["quads","core","adductors"],"eq":["band","bw"],"bp":["stand"],"js":["hip","knee"],"cat":["str","warmup"],"pl":["front"],"ap":["anchor_none"],"d":2,"cx":1,"hr":3,"so":1,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Banded Hip Abduction","Banded Fire Hydrant","Banded Clamshell"],"prog":[],"reg":["Banded Hip Abduction","Banded Clamshell","Donkey Kick"]}
{"id":"ed-067","n":"Knee Plank","mv":["iso"],"pm":["core"],"sm":["delt_a","glutes"],"eq":["bw"],"bp":["prone"],"js":["shoulder","lback"],"cat":["str","stab"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[15,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Plank","Dead Bug","Bird Dog"],"prog":["Plank","Dead Bug","Plank Shoulder Tap"],"reg":[]}
{"id":"ed-068","n":"Plank Shoulder Tap","mv":["iso"],"pm":["core","obliques"],"sm":["delt_a","glutes"],"eq":["bw"],"bp":["prone"],"js":["shoulder","wrist","lback"],"cat":["str","stab"],"pl":["sag","trans"],"ap":[],"d":3,"cx":2,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,16],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Plank","Dead Bug","Banded Pallof Press"],"prog":["Banded Pallof Overhead Press","V-Up","Hanging Leg Raise"],"reg":["Plank","Knee Plank","Dead Bug"]}
{"id":"ed-069","n":"Banded Pallof Press","mv":["iso"],"pm":["core","obliques"],"sm":["delt_a","glutes"],"eq":["band"],"bp":["stand"],"js":["lback"],"cat":["str","stab"],"pl":["trans"],"ap":["anchor_mid"],"d":2,"cx":2,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Anti-Rotation Hold","Plank Shoulder Tap","Banded Rotation"],"prog":["Banded Pallof Overhead Press","Half-Kneeling Banded Pallof Press"],"reg":["Plank","Plank Shoulder Tap","Bird Dog"]}
{"id":"ed-070","n":"Banded Anti-Rotation Hold","mv":["iso"],"pm":["core","obliques"],"sm":["delt_a","glutes"],"eq":["band"],"bp":["stand"],"js":["lback"],"cat":["str","stab"],"pl":["trans"],"ap":["anchor_mid"],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"timed","dr":[15,30],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Pallof Press","Plank","Banded Rotation"],"prog":["Banded Pallof Press","Banded Pallof Overhead Press"],"reg":["Plank","Bird Dog","Knee Plank"]}
{"id":"ed-071","n":"Banded Pallof Overhead Press","mv":["iso"],"pm":["core","obliques"],"sm":["delt_a","traps","glutes"],"eq":["band"],"bp":["stand"],"js":["lback","shoulder"],"cat":["str","stab"],"pl":["trans","sag"],"ap":["anchor_mid"],"d":3,"cx":3,"hr":2,"so":3,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Pallof Press","Banded Woodchop","Plank Shoulder Tap"],"prog":[],"reg":["Banded Pallof Press","Banded Anti-Rotation Hold","Plank"]}
{"id":"ed-072","n":"Half-Kneeling Banded Pallof Press","mv":["iso"],"pm":["core","obliques"],"sm":["glutes","hip_flex"],"eq":["band"],"bp":["kneel"],"js":["lback","knee"],"cat":["str","stab"],"pl":["trans"],"ap":["anchor_mid"],"d":2,"cx":2,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[8,12],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Pallof Press","Banded Anti-Rotation Hold","Banded Rotation"],"prog":["Banded Pallof Overhead Press","Banded Woodchop"],"reg":["Banded Anti-Rotation Hold","Plank","Bird Dog"]}
{"id":"ed-073","n":"Crunch","mv":["iso"],"pm":["core"],"sm":["hip_flex"],"eq":["bw"],"bp":["supine"],"js":["neck"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[15,25],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Reverse Crunch","Dead Bug","Toe Touch"],"prog":["Bicycle Crunch","V-Up","Leg Raise"],"reg":[]}
{"id":"ed-074","n":"Reverse Crunch","mv":["iso"],"pm":["core"],"sm":["hip_flex","obliques"],"eq":["bw"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Crunch","Leg Raise","Toe Touch"],"prog":["Leg Raise","V-Up","Hanging Leg Raise"],"reg":["Crunch","Dead Bug"]}
{"id":"ed-075","n":"Bicycle Crunch","mv":["rotation"],"pm":["core","obliques"],"sm":["hip_flex"],"eq":["bw"],"bp":["supine"],"js":["neck","lback"],"cat":["str"],"pl":["sag","trans"],"ap":[],"d":2,"cx":2,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Russian Twist","Crunch","Mountain Climber"],"prog":["V-Up","Hanging Leg Raise"],"reg":["Crunch","Reverse Crunch","Dead Bug"]}
{"id":"ed-076","n":"Toe Touch","mv":["iso"],"pm":["core"],"sm":["hip_flex"],"eq":["bw"],"bp":["supine"],"js":["neck","lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Crunch","V-Up","Reverse Crunch"],"prog":["V-Up","Hanging Leg Raise"],"reg":["Crunch","Dead Bug"]}
{"id":"ed-077","n":"Leg Raise","mv":["iso"],"pm":["core","hip_flex"],"sm":["obliques"],"eq":["bw"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Reverse Crunch","Hanging Leg Raise","Toe Touch"],"prog":["Hanging Leg Raise","V-Up"],"reg":["Reverse Crunch","Crunch","Dead Bug"]}
{"id":"ed-078","n":"V-Up","mv":["iso"],"pm":["core","hip_flex"],"sm":["obliques"],"eq":["bw"],"bp":["supine"],"js":["lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":2,"hr":3,"so":1,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,15],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Toe Touch","Leg Raise","Bicycle Crunch"],"prog":["Hanging Leg Raise"],"reg":["Toe Touch","Crunch","Reverse Crunch"]}
{"id":"ed-079","n":"Mountain Climber","mv":["plyo"],"pm":["core","hip_flex"],"sm":["delt_a","quads","glutes"],"eq":["bw"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["str","plyo"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":5,"so":1,"sh":1,"gd":1,"nl":2,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Plank","High Knees","Bicycle Crunch"],"prog":["Burpee","Tuck Jump"],"reg":["Plank","Dead Bug","Knee Plank"]}
{"id":"ed-080","n":"Hanging Leg Raise","mv":["iso"],"pm":["core","hip_flex"],"sm":["obliques","forearms"],"eq":["pullup"],"bp":["hang"],"js":["shoulder","lback"],"cat":["str"],"pl":["sag"],"ap":[],"d":4,"cx":2,"hr":3,"so":3,"sh":1,"gd":3,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Leg Raise","V-Up","Toe Touch"],"prog":[],"reg":["Leg Raise","V-Up","Reverse Crunch"]}
{"id":"ed-081","n":"Russian Twist","mv":["rotation"],"pm":["obliques","core"],"sm":["hip_flex"],"eq":["bw"],"bp":["sit"],"js":["lback"],"cat":["str"],"pl":["trans"],"ap":[],"d":2,"cx":1,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":true,"sub":["Bicycle Crunch","Banded Woodchop","Banded Rotation"],"prog":["Banded Woodchop","Banded Rotation"],"reg":["Banded Rotation","Bicycle Crunch"]}
{"id":"ed-082","n":"Banded Woodchop","mv":["rotation"],"pm":["obliques","core"],"sm":["delt_a","glutes","hams"],"eq":["band"],"bp":["stand"],"js":["lback"],"cat":["str"],"pl":["trans","sag"],"ap":["anchor_low"],"d":2,"cx":2,"hr":3,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":true,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Banded Rotation","Russian Twist","Banded Pallof Press"],"prog":["Banded Pallof Overhead Press"],"reg":["Russian Twist","Banded Rotation","Bicycle Crunch"]}
{"id":"ed-083","n":"Banded Rotation","mv":["rotation"],"pm":["obliques","core"],"sm":["delt_a"],"eq":["band"],"bp":["stand"],"js":["lback"],"cat":["str"],"pl":["trans"],"ap":["anchor_mid"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Russian Twist","Banded Woodchop","Banded Pallof Press"],"prog":["Russian Twist","Banded Woodchop","Banded Pallof Press"],"reg":["Russian Twist"]}
{"id":"ed-084","n":"Side Plank","mv":["iso"],"pm":["obliques","core"],"sm":["glutes","delt_l","adductors"],"eq":["bw"],"bp":["lateral"],"js":["shoulder","lback"],"cat":["str","stab"],"pl":["front"],"ap":[],"d":2,"cx":1,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[15,45],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Plank","Copenhagen Plank","Banded Anti-Rotation Hold"],"prog":["Copenhagen Plank","Banded Pallof Overhead Press"],"reg":["Plank","Knee Plank","Bird Dog"]}
{"id":"ed-085","n":"Copenhagen Plank","mv":["iso"],"pm":["adductors","obliques","core"],"sm":["glutes","hip_flex"],"eq":["bw","bench"],"bp":["lateral"],"js":["shoulder","hip"],"cat":["str","stab"],"pl":["front"],"ap":[],"d":4,"cx":2,"hr":2,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[10,30],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Side Plank","Banded Hip Abduction","Plank"],"prog":[],"reg":["Side Plank","Plank","Knee Plank"]}
{"id":"ed-086","n":"Banded Front Raise","mv":["iso"],"pm":["delt_a"],"sm":["delt_l","core"],"eq":["band","bw"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Lateral Raise","Banded Overhead Press","Arm Circles"],"prog":["Banded Overhead Press","Pike Push-Up"],"reg":[]}
{"id":"ed-087","n":"Banded External Rotation","mv":["iso"],"pm":["delt_p"],"sm":["upper_back","rhomboids"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str","mob"],"pl":["trans"],"ap":["anchor_none"],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[15,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Internal Rotation","Banded Face Pull","Banded Reverse Fly"],"prog":[],"reg":[]}
{"id":"ed-088","n":"Banded Internal Rotation","mv":["iso"],"pm":["delt_a"],"sm":["chest"],"eq":["band"],"bp":["stand"],"js":["shoulder"],"cat":["str","mob"],"pl":["trans"],"ap":["anchor_mid"],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[15,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded External Rotation","Banded Face Pull","Banded Front Raise"],"prog":[],"reg":[]}
{"id":"ed-089","n":"Banded Upright Row","mv":["pull_v"],"pm":["delt_l","traps"],"sm":["delt_a","biceps"],"eq":["band","bw"],"bp":["stand"],"js":["shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Banded Lateral Raise","Banded Shrug","Banded Front Raise"],"prog":["Banded Overhead Press","Pike Push-Up"],"reg":["Banded Lateral Raise","Banded Shrug","Banded Front Raise"]}
{"id":"ed-090","n":"Banded Shrug","mv":["iso"],"pm":["traps"],"sm":["delt_l","forearms"],"eq":["band","bw"],"bp":["stand"],"js":["neck"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":1,"cx":1,"hr":2,"so":1,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Upright Row","Banded Front Raise","Banded Lateral Raise"],"prog":[],"reg":[]}
{"id":"ed-091","n":"Banded Hammer Curl","mv":["pull_v"],"pm":["biceps","forearms"],"sm":[],"eq":["band","bw"],"bp":["stand"],"js":["elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Bicep Curl","Banded Reverse Curl","Chin-Up"],"prog":["Banded Concentration Curl","Banded Bayesian Curl"],"reg":["Banded Bicep Curl"]}
{"id":"ed-092","n":"Banded Concentration Curl","mv":["pull_v"],"pm":["biceps"],"sm":["forearms"],"eq":["band"],"bp":["sit"],"js":["elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":2,"so":1,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Bicep Curl","Banded Hammer Curl","Banded Bayesian Curl"],"prog":["Banded Bayesian Curl","Chin-Up"],"reg":["Banded Bicep Curl","Banded Hammer Curl"]}
{"id":"ed-093","n":"Banded Reverse Curl","mv":["pull_v"],"pm":["forearms","biceps"],"sm":[],"eq":["band","bw"],"bp":["stand"],"js":["elbow","wrist"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Bicep Curl","Banded Hammer Curl","Banded Bayesian Curl"],"prog":["Banded Concentration Curl","Chin-Up"],"reg":["Banded Bicep Curl","Banded Hammer Curl"]}
{"id":"ed-094","n":"Banded Bayesian Curl","mv":["pull_v"],"pm":["biceps"],"sm":["forearms"],"eq":["band"],"bp":["stand"],"js":["elbow","shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_low"],"d":2,"cx":2,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Bicep Curl","Banded Concentration Curl","Banded Reverse Curl"],"prog":["Chin-Up"],"reg":["Banded Bicep Curl","Banded Hammer Curl"]}
{"id":"ed-095","n":"Banded Overhead Tricep Extension","mv":["push_v"],"pm":["triceps"],"sm":["delt_a"],"eq":["band"],"bp":["stand"],"js":["elbow","shoulder"],"cat":["str"],"pl":["sag"],"ap":["anchor_low","anchor_foot"],"d":2,"cx":1,"hr":2,"so":3,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[10,15],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Banded Tricep Pushdown","Diamond Push-Up","Banded Tricep Kickback"],"prog":["Bodyweight Skull Crusher","Diamond Push-Up","Tricep Dip"],"reg":["Banded Tricep Pushdown","Banded Tricep Kickback"]}
{"id":"ed-096","n":"Tricep Dip","mv":["push_v"],"pm":["triceps"],"sm":["delt_a","chest"],"eq":["bw","bench"],"bp":["sit"],"js":["elbow","shoulder","wrist"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":3,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":true,"sub":["Banded Tricep Pushdown","Diamond Push-Up","Banded Tricep Kickback"],"prog":["Diamond Push-Up","Bodyweight Skull Crusher"],"reg":["Banded Tricep Pushdown","Banded Tricep Kickback"]}
{"id":"ed-097","n":"Banded Tricep Kickback","mv":["push_h"],"pm":["triceps"],"sm":["delt_p"],"eq":["band"],"bp":["stand"],"js":["elbow"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Banded Tricep Pushdown","Banded Overhead Tricep Extension","Tricep Dip"],"prog":["Banded Overhead Tricep Extension","Tricep Dip","Bodyweight Skull Crusher"],"reg":["Banded Tricep Pushdown"]}
{"id":"ed-098","n":"Bodyweight Skull Crusher","mv":["push_h"],"pm":["triceps"],"sm":["core","delt_a"],"eq":["bw","bench"],"bp":["prone"],"js":["elbow","wrist"],"cat":["str"],"pl":["sag"],"ap":[],"d":3,"cx":2,"hr":2,"so":1,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[6,12],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Diamond Push-Up","Tricep Dip","Banded Overhead Tricep Extension"],"prog":[],"reg":["Tricep Dip","Banded Tricep Pushdown","Banded Tricep Kickback"]}
{"id":"ed-099","n":"Calf Raise","mv":["iso"],"pm":["calves"],"sm":[],"eq":["bw"],"bp":["stand"],"js":["ankle"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[15,25],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":true,"sub":["Single-Leg Calf Raise","Banded Calf Raise","Seated Calf Raise"],"prog":["Single-Leg Calf Raise","Banded Calf Raise"],"reg":[]}
{"id":"ed-100","n":"Single-Leg Calf Raise","mv":["iso"],"pm":["calves"],"sm":[],"eq":["bw"],"bp":["stand"],"js":["ankle"],"cat":["str"],"pl":["sag"],"ap":[],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[10,20],"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":true,"sub":["Calf Raise","Banded Calf Raise","Seated Calf Raise"],"prog":[],"reg":["Calf Raise","Seated Calf Raise"]}
{"id":"ed-101","n":"Banded Calf Raise","mv":["iso"],"pm":["calves"],"sm":[],"eq":["band","bw"],"bp":["stand"],"js":["ankle"],"cat":["str"],"pl":["sag"],"ap":["anchor_foot"],"d":2,"cx":1,"hr":2,"so":2,"sh":1,"gd":2,"nl":1,"st":"rep","dr":null,"rr":[12,20],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Calf Raise","Single-Leg Calf Raise","Seated Calf Raise"],"prog":["Single-Leg Calf Raise"],"reg":["Calf Raise","Seated Calf Raise"]}
{"id":"ed-102","n":"Seated Calf Raise","mv":["iso"],"pm":["calves"],"sm":[],"eq":["bw"],"bp":["sit"],"js":["ankle"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[15,25],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":true,"sub":["Calf Raise","Banded Calf Raise","Single-Leg Calf Raise"],"prog":["Calf Raise","Banded Calf Raise","Single-Leg Calf Raise"],"reg":[]}
{"id":"ed-103","n":"Tibialis Raise","mv":["iso"],"pm":["calves"],"sm":[],"eq":["bw"],"bp":["stand"],"js":["ankle"],"cat":["str"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[15,25],"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Calf Raise","Wall Calf Stretch","Seated Calf Raise"],"prog":[],"reg":[]}
{"id":"ed-104","n":"Jumping Jack","mv":["plyo"],"pm":["quads","calves"],"sm":["delt_l","glutes","core"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo","warmup"],"pl":["sag","front"],"ap":[],"d":1,"cx":1,"hr":5,"so":3,"sh":2,"gd":1,"nl":2,"st":"timed","dr":[20,60],"rr":null,"uni":false,"cmp":true,"jmp":true,"stl":false,"wt":false,"sub":["High Knees","Butt Kicks","A-Skip"],"prog":["High Knees","Jump Squat","Tuck Jump"],"reg":[]}
{"id":"ed-105","n":"High Knees","mv":["plyo","gait"],"pm":["hip_flex","quads","calves"],"sm":["core","glutes"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo","warmup"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":5,"so":2,"sh":1,"gd":1,"nl":2,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":true,"jmp":true,"stl":false,"wt":false,"sub":["Jumping Jack","Butt Kicks","A-Skip"],"prog":["Jump Squat","Tuck Jump","Burpee"],"reg":["Butt Kicks","Jumping Jack"]}
{"id":"ed-106","n":"Butt Kicks","mv":["plyo","gait"],"pm":["hams","calves"],"sm":["hip_flex","glutes"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo","warmup"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":4,"so":2,"sh":1,"gd":1,"nl":2,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":false,"jmp":true,"stl":false,"wt":false,"sub":["High Knees","Jumping Jack","A-Skip"],"prog":["High Knees","Jump Squat"],"reg":[]}
{"id":"ed-107","n":"Jump Squat","mv":["plyo","squat"],"pm":["quads","glutes","calves"],"sm":["hams","core"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo"],"pl":["sag"],"ap":[],"d":3,"cx":2,"hr":5,"so":3,"sh":1,"gd":1,"nl":3,"st":"rep","dr":null,"rr":[6,15],"uni":false,"cmp":true,"jmp":true,"stl":true,"wt":false,"sub":["Lunge Jump","Tuck Jump","Skater Jump"],"prog":["Tuck Jump","Lunge Jump","Burpee"],"reg":["Bodyweight Squat","Jumping Jack","High Knees"]}
{"id":"ed-108","n":"Lunge Jump","mv":["plyo","lunge"],"pm":["quads","glutes"],"sm":["hams","calves","core"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo"],"pl":["sag"],"ap":[],"d":4,"cx":3,"hr":5,"so":3,"sh":2,"gd":1,"nl":3,"st":"rep","dr":null,"rr":[6,12],"uni":true,"cmp":true,"jmp":true,"stl":true,"wt":false,"sub":["Jump Squat","Tuck Jump","Skater Jump"],"prog":["Burpee"],"reg":["Reverse Lunge","Forward Lunge","Jump Squat"]}
{"id":"ed-109","n":"Skater Jump","mv":["plyo"],"pm":["quads","glutes","abductors"],"sm":["calves","hams","core"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo"],"pl":["front"],"ap":[],"d":3,"cx":2,"hr":5,"so":2,"sh":3,"gd":1,"nl":2,"st":"rep","dr":null,"rr":[8,16],"uni":true,"cmp":true,"jmp":true,"stl":false,"wt":false,"sub":["Jump Squat","Lunge Jump","Tuck Jump"],"prog":["Lunge Jump","Tuck Jump","Burpee"],"reg":["Lateral Lunge","Jumping Jack","High Knees"]}
{"id":"ed-110","n":"Tuck Jump","mv":["plyo"],"pm":["quads","hip_flex","calves"],"sm":["glutes","core"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["plyo"],"pl":["sag"],"ap":[],"d":4,"cx":2,"hr":5,"so":3,"sh":1,"gd":1,"nl":3,"st":"rep","dr":null,"rr":[5,10],"uni":false,"cmp":true,"jmp":true,"stl":false,"wt":false,"sub":["Jump Squat","Lunge Jump","Skater Jump"],"prog":["Burpee"],"reg":["Jump Squat","High Knees","Jumping Jack"]}
{"id":"ed-111","n":"Burpee","mv":["plyo"],"pm":["quads","chest","core"],"sm":["glutes","hams","triceps","delt_a","calves"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle","wrist","shoulder"],"cat":["plyo"],"pl":["sag"],"ap":[],"d":4,"cx":3,"hr":5,"so":3,"sh":3,"gd":1,"nl":3,"st":"rep","dr":null,"rr":[5,12],"uni":false,"cmp":true,"jmp":true,"stl":true,"wt":false,"sub":["Jump Squat","Mountain Climber","Tuck Jump"],"prog":[],"reg":["Jump Squat","Mountain Climber","High Knees"]}
{"id":"ed-112","n":"Arm Circles","mv":["iso"],"pm":["delt_l","delt_a"],"sm":["traps","upper_back"],"eq":["bw"],"bp":["stand"],"js":["shoulder"],"cat":["warmup","mob"],"pl":["sag","front"],"ap":[],"d":1,"cx":1,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Leg Swings","Hip Circles","Banded External Rotation"],"prog":[],"reg":[]}
{"id":"ed-113","n":"Leg Swings","mv":["iso"],"pm":["hip_flex","hams","glutes"],"sm":["adductors","abductors","core"],"eq":["bw"],"bp":["stand"],"js":["hip"],"cat":["warmup","mob"],"pl":["sag","front"],"ap":[],"d":1,"cx":1,"hr":2,"so":2,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Hip Circles","Arm Circles","Kneeling Hip Flexor Stretch"],"prog":[],"reg":[]}
{"id":"ed-114","n":"Hip Circles","mv":["iso"],"pm":["hip_flex","glutes"],"sm":["adductors","abductors","core"],"eq":["bw"],"bp":["stand"],"js":["hip"],"cat":["warmup","mob"],"pl":["trans","sag","front"],"ap":[],"d":1,"cx":2,"hr":2,"so":2,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":false,"wt":false,"sub":["Leg Swings","Arm Circles","Kneeling Hip Flexor Stretch"],"prog":[],"reg":[]}
{"id":"ed-115","n":"Inchworm","mv":["push_h","hinge"],"pm":["core","hams","delt_a"],"sm":["chest","triceps","glutes"],"eq":["bw"],"bp":["stand"],"js":["wrist","shoulder"],"cat":["warmup","mob"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":3,"so":2,"sh":3,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[5,10],"uni":false,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Bear Crawl","Mountain Climber","Downward Dog"],"prog":["Bear Crawl","Mountain Climber"],"reg":["Downward Dog","Cat-Cow"]}
{"id":"ed-116","n":"A-Skip","mv":["plyo","gait"],"pm":["hip_flex","calves","quads"],"sm":["glutes","core"],"eq":["bw"],"bp":["stand"],"js":["knee","ankle"],"cat":["warmup","plyo"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":4,"so":2,"sh":3,"gd":1,"nl":2,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":true,"jmp":true,"stl":false,"wt":false,"sub":["High Knees","Butt Kicks","Jumping Jack"],"prog":["High Knees","Jump Squat"],"reg":["Jumping Jack","Butt Kicks"]}
{"id":"ed-117","n":"Bear Crawl","mv":["carry"],"pm":["core","delt_a","quads"],"sm":["triceps","hip_flex","glutes"],"eq":["bw"],"bp":["quadruped"],"js":["wrist","shoulder"],"cat":["warmup","stab"],"pl":["sag"],"ap":[],"d":2,"cx":3,"hr":4,"so":1,"sh":3,"gd":1,"nl":1,"st":"timed","dr":[15,40],"rr":null,"uni":false,"cmp":true,"jmp":false,"stl":false,"wt":false,"sub":["Inchworm","Mountain Climber","Plank"],"prog":["Mountain Climber","Burpee"],"reg":["Inchworm","Plank","Knee Plank"]}
{"id":"ed-118","n":"Standing Hamstring Stretch","mv":["hinge"],"pm":["hams"],"sm":["calves","erectors","glutes"],"eq":["bw"],"bp":["stand"],"js":["lback"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Seated Forward Fold","Standing Quad Stretch","Downward Dog"],"prog":[],"reg":[]}
{"id":"ed-119","n":"Kneeling Hip Flexor Stretch","mv":["lunge"],"pm":["hip_flex"],"sm":["quads","glutes"],"eq":["bw","mat"],"bp":["kneel"],"js":["knee"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Pigeon Stretch","90/90 Hip Stretch","World's Greatest Stretch"],"prog":["Pigeon Stretch","World's Greatest Stretch"],"reg":[]}
{"id":"ed-120","n":"Pigeon Stretch","mv":["iso"],"pm":["glutes","hip_flex"],"sm":["adductors","erectors"],"eq":["bw","mat"],"bp":["prone"],"js":["knee","hip"],"cat":["stretch","mob"],"pl":["sag"],"ap":[],"d":2,"cx":2,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[30,60],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["90/90 Hip Stretch","Figure-Four Stretch","Butterfly Stretch"],"prog":[],"reg":["Figure-Four Stretch","Kneeling Hip Flexor Stretch","Butterfly Stretch"]}
{"id":"ed-121","n":"90/90 Hip Stretch","mv":["iso"],"pm":["glutes","hip_flex"],"sm":["adductors","abductors"],"eq":["bw","mat"],"bp":["sit"],"js":["hip","knee"],"cat":["stretch","mob"],"pl":["trans"],"ap":[],"d":2,"cx":2,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[30,60],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Pigeon Stretch","Figure-Four Stretch","Butterfly Stretch"],"prog":[],"reg":["Figure-Four Stretch","Butterfly Stretch"]}
{"id":"ed-122","n":"Figure-Four Stretch","mv":["iso"],"pm":["glutes"],"sm":["hip_flex","adductors"],"eq":["bw","mat"],"bp":["supine"],"js":["hip","knee"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Pigeon Stretch","90/90 Hip Stretch","Butterfly Stretch"],"prog":["Pigeon Stretch","90/90 Hip Stretch"],"reg":[]}
{"id":"ed-123","n":"Butterfly Stretch","mv":["iso"],"pm":["adductors","hip_flex"],"sm":["glutes"],"eq":["bw","mat"],"bp":["sit"],"js":["hip","knee"],"cat":["stretch"],"pl":["front"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Seated Forward Fold","Figure-Four Stretch","Kneeling Hip Flexor Stretch"],"prog":["90/90 Hip Stretch","Pigeon Stretch"],"reg":[]}
{"id":"ed-124","n":"Seated Forward Fold","mv":["hinge"],"pm":["hams","erectors"],"sm":["calves","glutes"],"eq":["bw","mat"],"bp":["sit"],"js":["lback"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Standing Hamstring Stretch","Downward Dog","Butterfly Stretch"],"prog":[],"reg":[]}
{"id":"ed-125","n":"Cat-Cow","mv":["iso"],"pm":["erectors","core"],"sm":["hip_flex","delt_a"],"eq":["bw","mat"],"bp":["quadruped"],"js":["lback"],"cat":["stretch","mob"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[8,15],"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Child's Pose","Bird Dog","Thread the Needle"],"prog":[],"reg":[]}
{"id":"ed-126","n":"Child's Pose","mv":["iso"],"pm":["erectors","lats"],"sm":["delt_a","glutes","hip_flex"],"eq":["bw","mat"],"bp":["kneel"],"js":[],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,60],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Cat-Cow","Downward Dog","Seated Forward Fold"],"prog":["Downward Dog"],"reg":[]}
{"id":"ed-127","n":"Downward Dog","mv":["iso"],"pm":["delt_a","hams","calves"],"sm":["lats","core","erectors","glutes"],"eq":["bw","mat"],"bp":["prone"],"js":["wrist","shoulder"],"cat":["stretch","mob"],"pl":["sag"],"ap":[],"d":1,"cx":2,"hr":2,"so":2,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Child's Pose","Inchworm","Standing Hamstring Stretch"],"prog":[],"reg":["Child's Pose","Cat-Cow"]}
{"id":"ed-128","n":"World's Greatest Stretch","mv":["lunge","rotation"],"pm":["hip_flex","glutes","obliques"],"sm":["hams","adductors","core","upper_back"],"eq":["bw","mat"],"bp":["prone"],"js":["hip","knee","shoulder"],"cat":["stretch","mob"],"pl":["sag","trans"],"ap":[],"d":2,"cx":3,"hr":2,"so":1,"sh":3,"gd":1,"nl":1,"st":"rep","dr":null,"rr":[3,6],"uni":true,"cmp":true,"jmp":false,"stl":true,"wt":false,"sub":["Kneeling Hip Flexor Stretch","Pigeon Stretch","90/90 Hip Stretch"],"prog":[],"reg":["Kneeling Hip Flexor Stretch","Figure-Four Stretch"]}
{"id":"ed-129","n":"Supine Spinal Twist","mv":["rotation"],"pm":["obliques","erectors"],"sm":["glutes","hip_flex"],"eq":["bw","mat"],"bp":["supine"],"js":["lback"],"cat":["stretch"],"pl":["trans"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Thread the Needle","Scorpion Stretch","Cat-Cow"],"prog":[],"reg":[]}
{"id":"ed-130","n":"Thread the Needle","mv":["rotation"],"pm":["upper_back","rhomboids"],"sm":["delt_p","obliques","lats"],"eq":["bw","mat"],"bp":["quadruped"],"js":["shoulder"],"cat":["stretch","mob"],"pl":["trans"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Supine Spinal Twist","Cat-Cow","Scorpion Stretch"],"prog":[],"reg":[]}
{"id":"ed-131","n":"Scorpion Stretch","mv":["rotation"],"pm":["hip_flex","erectors","obliques"],"sm":["glutes","core"],"eq":["bw","mat"],"bp":["prone"],"js":["lback","hip"],"cat":["stretch","mob"],"pl":["trans"],"ap":[],"d":2,"cx":2,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Supine Spinal Twist","Thread the Needle","Cat-Cow"],"prog":[],"reg":["Supine Spinal Twist","Thread the Needle"]}
{"id":"ed-132","n":"Chest Doorway Stretch","mv":["iso"],"pm":["chest"],"sm":["delt_a","biceps"],"eq":["bw"],"bp":["stand"],"js":["shoulder"],"cat":["stretch"],"pl":["trans"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,45],"rr":null,"uni":false,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Cross-Body Shoulder Stretch","Banded Chest Fly","Cat-Cow"],"prog":[],"reg":[]}
{"id":"ed-133","n":"Cross-Body Shoulder Stretch","mv":["iso"],"pm":["delt_p"],"sm":["upper_back","rhomboids"],"eq":["bw"],"bp":["stand"],"js":["shoulder"],"cat":["stretch"],"pl":["trans"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Chest Doorway Stretch","Overhead Tricep Stretch","Banded External Rotation"],"prog":[],"reg":[]}
{"id":"ed-134","n":"Overhead Tricep Stretch","mv":["iso"],"pm":["triceps"],"sm":["lats","delt_p"],"eq":["bw"],"bp":["stand"],"js":["shoulder","elbow"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":2,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Cross-Body Shoulder Stretch","Lat Stretch","Chest Doorway Stretch"],"prog":[],"reg":[]}
{"id":"ed-135","n":"Lat Stretch","mv":["iso"],"pm":["lats"],"sm":["obliques","erectors"],"eq":["bw"],"bp":["stand"],"js":["shoulder"],"cat":["stretch"],"pl":["front"],"ap":[],"d":1,"cx":1,"hr":1,"so":2,"sh":1,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Overhead Tricep Stretch","Cross-Body Shoulder Stretch","Child's Pose"],"prog":[],"reg":[]}
{"id":"ed-136","n":"Wall Calf Stretch","mv":["iso"],"pm":["calves"],"sm":["hams"],"eq":["bw"],"bp":["stand"],"js":["ankle"],"cat":["stretch"],"pl":["sag"],"ap":[],"d":1,"cx":1,"hr":1,"so":1,"sh":2,"gd":1,"nl":1,"st":"timed","dr":[20,40],"rr":null,"uni":true,"cmp":false,"jmp":false,"stl":true,"wt":false,"sub":["Standing Hamstring Stretch","Downward Dog","Calf Raise"],"prog":[],"reg":[]}
```
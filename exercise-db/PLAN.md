# Exercise Database Population Plan

## Goal
Populate exercise-db/exercises.db with ~136 fully-tagged exercises for bodyweight and resistance band training.

## Files
- `exercise-db/schema.sql` — table definitions
- `exercise-db/seed.sql` — initial 20 exercises (already loaded)
- `exercise-db/exercises.db` — the database (source of truth, checked into git)

## How to Add a Batch
1. Read this plan and the schema to understand all fields and tag values
2. Query the DB to see what's already populated: `sqlite3 exercise-db/exercises.db "SELECT name FROM exercise_definition ORDER BY name"`
3. Generate a SQL file for the batch: `exercise-db/batch-XX.sql`
4. Run it: `sqlite3 exercise-db/exercises.db < exercise-db/batch-XX.sql`
5. Verify: `sqlite3 exercise-db/exercises.db "SELECT name, movement, primary_muscles, equipment, difficulty FROM exercise_definition WHERE id LIKE 'ed-1%' ORDER BY name"` (adjust ID pattern per batch)
6. Mark the batch done in the progress table below

## ID Convention
- Seed data: ed-001 through ed-020
- Batch 01: ed-021 through ed-025
- Batch 02: ed-026 through ed-030
- etc. (sequential, no gaps)
- Variants: ev-XXX (sequential from ev-007 onward; ev-001 through ev-006 are seeded)

## Tag Dictionary (from docs/schema.md)

### Movement Pattern
push_h, push_v, pull_h, pull_v, hinge, squat, lunge, carry, rotation, iso, plyo, gait

### Muscle Groups
chest, lats, upper_back, traps, rhomboids, delt_a, delt_l, delt_p, biceps, triceps, forearms, core, obliques, erectors, glutes, quads, hams, calves, hip_flex, adductors, abductors

### Equipment
bw, db, kb, bb, cb, band, trx, bench, pullup, cable, ball, roller, mat

### Body Position
stand, sit, kneel, prone, supine, lateral, hang, quadruped

### Joint Stress
knee, shoulder, wrist, lback, ankle, hip, elbow, neck

### Category
str, mob, stretch, warmup, plyo, balance, stab

### Plane of Motion
sag, front, trans

### Anchor Point (resistance bands)
anchor_none, anchor_low, anchor_mid, anchor_high, anchor_foot, anchor_door

### Numeric Scales
- difficulty: 1-5
- complexity: 1-5 (skill/coordination, independent of difficulty)
- hr_impact: 1-5 (1=significantly lowers HR, 3=maintains, 5=significantly raises)
- space_overhead: 1-3 (1=none/seated, 2=arms raised, 3=jumping/overhead press)
- space_horizontal: 1-3 (1=stationary, 2=small area, 3=lunges/sprawls)
- grip_demand: 1-3 (1=none, 2=moderate, 3=grip-intensive)
- noise_level: 1-3 (1=silent, 2=moderate, 3=loud/impact)

### Flags (0 or 1)
is_unilateral, is_compound, has_jumping, stretch_loaded, weightable

### Step Type
default_step_type: 'timed' or 'rep'
typical_duration_range: JSON [min, max] in seconds (null if rep-based)
typical_rep_range: JSON [min, max] (null if timed)

### Relationship Hints
substitutes, progressions, regressions: JSON arrays of exercise names (not IDs)

## Quality Rules
- Instructions are NOT sent to AI — they're human-facing only. Write clear, actionable steps.
- Form cues are short phrases displayed during workout execution.
- All tag decisions should be defensible. When in doubt, leave a tag out rather than guessing.
- Substitutes/progressions/regressions reference exercises by name. Only reference exercises that exist or will exist in this plan.
- youtube_search_query should return useful form videos (typically "exercise name proper form").

## Progress

| Batch | Category | Exercises | IDs | Status |
|-------|----------|-----------|-----|--------|
| seed | Mixed (initial 20) | Push-Up, Knee Push-Up, Wall Push-Up, Banded Push-Up, Banded Pull-Apart, Banded Row, Banded Face Pull, Bodyweight Squat, Banded Squat, Banded Good Morning, Glute Bridge, Reverse Lunge, Plank, Dead Bug, Bird Dog, Banded Overhead Press, Banded Lateral Raise, Banded Bicep Curl, Banded Tricep Pushdown, Standing Quad Stretch | ed-001–020 | Done |
| 01 | Push Horizontal (new) | Incline Push-Up, Diamond Push-Up, Decline Push-Up, Archer Push-Up, Banded Chest Fly | ed-021–025 | Done |
| 02 | Push Vertical (new) | Pike Push-Up, Hindu Push-Up, Decline Pike Push-Up, Wall Handstand Push-Up | ed-026–029 | Done |
| 03 | Pull Horizontal (new) | Banded Reverse Fly, Banded Single-Arm Row, Inverted Row | ed-030–032 | Done |
| 04 | Pull Vertical | Banded Lat Pulldown, Banded Straight-Arm Pulldown, Banded Assisted Pull-Up, Pull-Up, Chin-Up | ed-033–037 | Done |
| 05 | Squat (new) | Wall Sit, Sumo Squat, Banded Sumo Squat, Cossack Squat, Sissy Squat, Assisted Pistol Squat, Pistol Squat | ed-038–044 | Done |
| 06 | Hinge (new) | Banded Glute Bridge, Single-Leg Glute Bridge, Hip Thrust, Banded Romanian Deadlift, Banded Pull-Through, Nordic Curl | ed-045–050 | Done |
| 07 | Lunge / Single-Leg (new) | Split Squat, Forward Lunge, Banded Reverse Lunge, Lateral Lunge, Curtsy Lunge, Walking Lunge, Bulgarian Split Squat, Banded Bulgarian Split Squat, Step-Up, Single-Leg Romanian Deadlift | ed-051–060 | Done |
| 08 | Glute Isolation | Banded Clamshell, Donkey Kick, Banded Fire Hydrant, Banded Kickback, Banded Hip Abduction, Banded Lateral Walk | ed-061–066 | Done |
| 09 | Core Anti-Extension (new) | Knee Plank, Plank Shoulder Tap | ed-067–068 | Done |
| 10 | Core Anti-Rotation | Banded Pallof Press, Banded Anti-Rotation Hold, Banded Pallof Overhead Press, Half-Kneeling Banded Pallof Press | ed-069–072 | Done |
| 11 | Core Flexion | Crunch, Reverse Crunch, Bicycle Crunch, Toe Touch, Leg Raise, V-Up, Mountain Climber, Hanging Leg Raise | ed-073–080 | Done |
| 12 | Core Rotation / Lateral | Russian Twist, Banded Woodchop, Banded Rotation, Side Plank, Copenhagen Plank | ed-081–085 | Done |
| 13 | Shoulder Isolation (new) | Banded Front Raise, Banded External Rotation, Banded Internal Rotation, Banded Upright Row, Banded Shrug | ed-086–090 | Done |
| 14 | Arms Biceps (new) + Triceps (new) | Banded Hammer Curl, Banded Concentration Curl, Banded Reverse Curl, Banded Bayesian Curl, Banded Overhead Tricep Extension, Tricep Dip, Banded Tricep Kickback, Bodyweight Skull Crusher | ed-091–098 | Done |
| 15 | Calves | Calf Raise, Single-Leg Calf Raise, Banded Calf Raise, Seated Calf Raise, Tibialis Raise | ed-099–103 | Done |
| 16 | Plyometric | Jumping Jack, High Knees, Butt Kicks, Jump Squat, Lunge Jump, Skater Jump, Tuck Jump, Burpee | ed-104–111 | Done |
| 17 | Warmup / Dynamic | Arm Circles, Leg Swings, Hip Circles, Inchworm, A-Skip, Bear Crawl | ed-112–117 | Done |
| 18 | Stretch / Mobility (new) | Standing Hamstring Stretch, Kneeling Hip Flexor Stretch, Pigeon Stretch, 90/90 Hip Stretch, Figure-Four Stretch, Butterfly Stretch, Seated Forward Fold, Cat-Cow, Child's Pose, Downward Dog | ed-118–127 | Done |
| 19 | Stretch / Mobility (new, cont.) | World's Greatest Stretch, Supine Spinal Twist, Thread the Needle, Scorpion Stretch, Chest Doorway Stretch, Cross-Body Shoulder Stretch, Overhead Tricep Stretch, Lat Stretch, Wall Calf Stretch | ed-128–136 | Done |

-- Relationship enrichment: bring substitutes, progressions, regressions toward 3 each
-- Only meaningful additions — exercises at the absolute ceiling/floor of their category
-- may stay below 3 for progressions or regressions.

-- ==================== PUSH HORIZONTAL ====================

-- ed-001 Push-Up (diff 2): subs 2→3, prog 2→3
UPDATE exercise_definition SET
  substitutes = '["Diamond Push-Up","Banded Push-Up","Banded Chest Fly"]',
  progressions = '["Diamond Push-Up","Decline Push-Up","Archer Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-001';

-- ed-002 Knee Push-Up (diff 1): subs 2→3, prog 1→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Incline Push-Up","Wall Push-Up","Banded Chest Fly"]',
  progressions = '["Push-Up","Diamond Push-Up","Decline Push-Up"]',
  regressions = '["Incline Push-Up","Wall Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-002';

-- ed-003 Wall Push-Up (diff 1): subs 2→3, prog 2→3. No regressions — easiest push.
UPDATE exercise_definition SET
  substitutes = '["Knee Push-Up","Incline Push-Up","Banded Chest Fly"]',
  progressions = '["Incline Push-Up","Knee Push-Up","Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-003';

-- ed-004 Banded Push-Up (diff 3): subs 2→3, prog 1→3, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Push-Up","Diamond Push-Up","Decline Push-Up"]',
  progressions = '["Diamond Push-Up","Decline Push-Up","Archer Push-Up"]',
  regressions = '["Push-Up","Knee Push-Up","Incline Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-004';

-- ed-021 Incline Push-Up (diff 1): subs 2→3, prog 1→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Knee Push-Up","Wall Push-Up","Banded Chest Fly"]',
  progressions = '["Push-Up","Diamond Push-Up","Decline Push-Up"]',
  regressions = '["Wall Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-021';

-- ed-022 Diamond Push-Up (diff 3): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Push-Up","Banded Push-Up","Banded Tricep Pushdown"]',
  progressions = '["Bodyweight Skull Crusher","Archer Push-Up"]',
  regressions = '["Push-Up","Knee Push-Up","Incline Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-022';

-- ed-023 Decline Push-Up (diff 3): subs 2→3, prog 2→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Push-Up","Banded Push-Up","Diamond Push-Up"]',
  progressions = '["Archer Push-Up","Pike Push-Up","Wall Handstand Push-Up"]',
  regressions = '["Push-Up","Incline Push-Up","Knee Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-023';

-- ed-024 Archer Push-Up (diff 4): subs 2→3, prog 1→1 (ceiling of push_h), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Decline Push-Up","Diamond Push-Up","Banded Push-Up"]',
  progressions = '["Wall Handstand Push-Up"]',
  regressions = '["Push-Up","Decline Push-Up","Diamond Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-024';

-- ed-025 Banded Chest Fly (diff 2): subs 2→3, prog 0→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Push-Up","Banded Push-Up","Incline Push-Up"]',
  progressions = '["Banded Push-Up","Diamond Push-Up","Decline Push-Up"]',
  regressions = '["Wall Push-Up","Knee Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-025';

-- ==================== PUSH VERTICAL ====================

-- ed-016 Banded Overhead Press (diff 2): subs 2→3, prog 0→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Pike Push-Up","Banded Lateral Raise","Banded Front Raise"]',
  progressions = '["Pike Push-Up","Decline Pike Push-Up","Wall Handstand Push-Up"]',
  regressions = '["Banded Lateral Raise","Banded Front Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-016';

-- ed-026 Pike Push-Up (diff 3): subs 2→3, prog 2→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Overhead Press","Decline Pike Push-Up","Hindu Push-Up"]',
  regressions = '["Banded Overhead Press","Banded Front Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-026';

-- ed-027 Hindu Push-Up (diff 3): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Pike Push-Up","Push-Up","Decline Push-Up"]',
  progressions = '["Decline Pike Push-Up","Archer Push-Up","Wall Handstand Push-Up"]',
  regressions = '["Push-Up","Incline Push-Up","Banded Overhead Press"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-027';

-- ed-028 Decline Pike Push-Up (diff 4): subs 2→3, prog 1→1 (only HSPU harder), reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Pike Push-Up","Banded Overhead Press","Hindu Push-Up"]',
  progressions = '["Wall Handstand Push-Up"]',
  regressions = '["Pike Push-Up","Banded Overhead Press","Hindu Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-028';

-- ed-029 Wall Handstand Push-Up (diff 5): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Decline Pike Push-Up","Pike Push-Up","Hindu Push-Up"]',
  regressions = '["Decline Pike Push-Up","Pike Push-Up","Banded Overhead Press"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-029';

-- ==================== PULL HORIZONTAL ====================

-- ed-005 Banded Pull-Apart (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Face Pull","Banded Row","Banded Reverse Fly"]',
  progressions = '["Banded Reverse Fly","Banded Face Pull","Banded Row"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-005';

-- ed-006 Banded Row (diff 2): subs 2→3, prog 1→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Pull-Apart","Inverted Row","Banded Reverse Fly"]',
  progressions = '["Banded Single-Arm Row","Inverted Row","Pull-Up"]',
  regressions = '["Banded Pull-Apart","Banded Reverse Fly"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-006';

-- ed-007 Banded Face Pull (diff 2): subs 2→3, prog 0→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Pull-Apart","Banded Row","Banded Reverse Fly"]',
  progressions = '["Banded Single-Arm Row","Inverted Row"]',
  regressions = '["Banded Pull-Apart","Banded Reverse Fly"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-007';

-- ed-030 Banded Reverse Fly (diff 1): subs 2→3, prog 1→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Banded Pull-Apart","Banded Face Pull","Banded External Rotation"]',
  progressions = '["Banded Face Pull","Banded Row","Banded Single-Arm Row"]',
  regressions = '["Banded Pull-Apart"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-030';

-- ed-031 Banded Single-Arm Row (diff 2): subs 2→3, prog 0→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Row","Inverted Row","Banded Face Pull"]',
  progressions = '["Inverted Row","Pull-Up","Chin-Up"]',
  regressions = '["Banded Row","Banded Pull-Apart"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-031';

-- ed-032 Inverted Row (diff 2): subs 2→3, prog 2→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Row","Pull-Up","Banded Single-Arm Row"]',
  progressions = '["Banded Assisted Pull-Up","Pull-Up","Chin-Up"]',
  regressions = '["Banded Row","Banded Single-Arm Row","Banded Pull-Apart"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-032';

-- ==================== PULL VERTICAL ====================

-- ed-033 Banded Lat Pulldown (diff 1): subs 2→3, prog 2→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Banded Straight-Arm Pulldown","Banded Assisted Pull-Up","Banded Row"]',
  progressions = '["Banded Assisted Pull-Up","Pull-Up","Chin-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-033';

-- ed-034 Banded Straight-Arm Pulldown (diff 1): subs 1→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Lat Pulldown","Banded Row","Banded Reverse Fly"]',
  progressions = '["Banded Lat Pulldown","Banded Assisted Pull-Up","Pull-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-034';

-- ed-035 Banded Assisted Pull-Up (diff 3): subs 2→3, prog 2→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Lat Pulldown","Inverted Row","Banded Row"]',
  regressions = '["Banded Lat Pulldown","Inverted Row","Banded Row"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-035';

-- ed-036 Pull-Up (diff 4): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Chin-Up","Banded Assisted Pull-Up","Inverted Row"]',
  regressions = '["Banded Assisted Pull-Up","Inverted Row","Banded Lat Pulldown"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-036';

-- ed-037 Chin-Up (diff 4): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Pull-Up","Banded Assisted Pull-Up","Inverted Row"]',
  regressions = '["Banded Assisted Pull-Up","Inverted Row","Banded Lat Pulldown"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-037';

-- ==================== SQUAT ====================

-- ed-008 Bodyweight Squat (diff 1): subs 2→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Banded Squat","Sumo Squat","Wall Sit"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-008';

-- ed-009 Banded Squat (diff 2): subs 2→3, prog 1→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Bodyweight Squat","Sumo Squat","Wall Sit"]',
  progressions = '["Banded Sumo Squat","Cossack Squat","Jump Squat"]',
  regressions = '["Bodyweight Squat","Sumo Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-009';

-- ed-038 Wall Sit (diff 2): subs 1→3, prog 2→3. No reg (isometric floor).
UPDATE exercise_definition SET
  substitutes = '["Bodyweight Squat","Sumo Squat","Banded Squat"]',
  progressions = '["Bodyweight Squat","Banded Squat","Cossack Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-038';

-- ed-039 Sumo Squat (diff 1): subs 2→3, prog 2→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Bodyweight Squat","Banded Sumo Squat","Wall Sit"]',
  progressions = '["Banded Sumo Squat","Cossack Squat","Pistol Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-039';

-- ed-040 Banded Sumo Squat (diff 2): subs 2→3, prog 1→3, reg 2→2
UPDATE exercise_definition SET
  substitutes = '["Sumo Squat","Banded Squat","Wall Sit"]',
  progressions = '["Cossack Squat","Assisted Pistol Squat","Pistol Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-040';

-- ed-041 Cossack Squat (diff 3): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Lateral Lunge","Sumo Squat","Banded Sumo Squat"]',
  progressions = '["Assisted Pistol Squat","Pistol Squat"]',
  regressions = '["Lateral Lunge","Sumo Squat","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-041';

-- ed-042 Sissy Squat (diff 3): subs 2→3, prog 0→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Bodyweight Squat","Wall Sit","Banded Squat"]',
  progressions = '["Assisted Pistol Squat","Pistol Squat"]',
  regressions = '["Bodyweight Squat","Wall Sit"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-042';

-- ed-043 Assisted Pistol Squat (diff 3): subs 2→3, prog 1→1 (only Pistol), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Bulgarian Split Squat","Cossack Squat","Bodyweight Squat"]',
  regressions = '["Bulgarian Split Squat","Cossack Squat","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-043';

-- ed-044 Pistol Squat (diff 5): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Assisted Pistol Squat","Bulgarian Split Squat","Cossack Squat"]',
  regressions = '["Assisted Pistol Squat","Cossack Squat","Bulgarian Split Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-044';

-- ==================== HINGE ====================

-- ed-010 Banded Good Morning (diff 2): subs 2→3, prog 1→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Romanian Deadlift","Glute Bridge","Banded Pull-Through"]',
  progressions = '["Banded Romanian Deadlift","Single-Leg Romanian Deadlift","Nordic Curl"]',
  regressions = '["Glute Bridge","Banded Glute Bridge"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-010';

-- ed-011 Glute Bridge (diff 1): subs 2→3, prog 2→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Good Morning","Single-Leg Glute Bridge","Banded Pull-Through"]',
  progressions = '["Banded Glute Bridge","Single-Leg Glute Bridge","Hip Thrust"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-011';

-- ed-045 Banded Glute Bridge (diff 2): subs 2→3, prog 2→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Glute Bridge","Hip Thrust","Banded Pull-Through"]',
  progressions = '["Hip Thrust","Single-Leg Glute Bridge","Nordic Curl"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-045';

-- ed-046 Single-Leg Glute Bridge (diff 2): subs 2→3, prog 1→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Glute Bridge","Banded Glute Bridge","Banded Pull-Through"]',
  progressions = '["Hip Thrust","Single-Leg Romanian Deadlift","Nordic Curl"]',
  regressions = '["Glute Bridge","Banded Glute Bridge"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-046';

-- ed-047 Hip Thrust (diff 2): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Glute Bridge","Single-Leg Glute Bridge","Banded Pull-Through"]',
  progressions = '["Single-Leg Glute Bridge","Single-Leg Romanian Deadlift","Nordic Curl"]',
  regressions = '["Glute Bridge","Banded Glute Bridge","Banded Good Morning"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-047';

-- ed-048 Banded Romanian Deadlift (diff 2): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Good Morning","Single-Leg Romanian Deadlift","Banded Pull-Through"]',
  progressions = '["Single-Leg Romanian Deadlift","Nordic Curl"]',
  regressions = '["Banded Good Morning","Glute Bridge","Banded Glute Bridge"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-048';

-- ed-049 Banded Pull-Through (diff 2): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Romanian Deadlift","Banded Good Morning","Hip Thrust"]',
  progressions = '["Banded Romanian Deadlift","Single-Leg Romanian Deadlift","Nordic Curl"]',
  regressions = '["Glute Bridge","Banded Good Morning","Banded Glute Bridge"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-049';

-- ed-050 Nordic Curl (diff 5): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Romanian Deadlift","Single-Leg Romanian Deadlift","Banded Pull-Through"]',
  regressions = '["Banded Romanian Deadlift","Banded Good Morning","Single-Leg Romanian Deadlift"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-050';

-- ==================== LUNGE / SINGLE-LEG ====================

-- ed-012 Reverse Lunge (diff 2): subs 2→3, prog 2→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Forward Lunge","Split Squat","Lateral Lunge"]',
  progressions = '["Banded Reverse Lunge","Walking Lunge","Bulgarian Split Squat"]',
  regressions = '["Split Squat","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-012';

-- ed-051 Split Squat (diff 1): subs 2→3, prog 2→3, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Reverse Lunge","Forward Lunge","Step-Up"]',
  progressions = '["Reverse Lunge","Walking Lunge","Bulgarian Split Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-051';

-- ed-052 Forward Lunge (diff 2): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Reverse Lunge","Split Squat","Step-Up"]',
  progressions = '["Walking Lunge","Bulgarian Split Squat","Banded Bulgarian Split Squat"]',
  regressions = '["Reverse Lunge","Split Squat","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-052';

-- ed-053 Banded Reverse Lunge (diff 3): subs 2→3, prog 1→2, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Reverse Lunge","Banded Squat","Walking Lunge"]',
  progressions = '["Banded Bulgarian Split Squat","Lunge Jump"]',
  regressions = '["Reverse Lunge","Forward Lunge","Split Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-053';

-- ed-054 Lateral Lunge (diff 2): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Cossack Squat","Reverse Lunge","Curtsy Lunge"]',
  progressions = '["Cossack Squat","Skater Jump"]',
  regressions = '["Sumo Squat","Reverse Lunge","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-054';

-- ed-055 Curtsy Lunge (diff 2): subs 2→3, prog 0→2, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Reverse Lunge","Lateral Lunge","Step-Up"]',
  progressions = '["Bulgarian Split Squat","Lunge Jump"]',
  regressions = '["Reverse Lunge","Split Squat","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-055';

-- ed-056 Walking Lunge (diff 2): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Forward Lunge","Reverse Lunge","Step-Up"]',
  progressions = '["Bulgarian Split Squat","Banded Bulgarian Split Squat","Lunge Jump"]',
  regressions = '["Reverse Lunge","Forward Lunge","Split Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-056';

-- ed-057 Bulgarian Split Squat (diff 3): subs 2→3, prog 2→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Reverse Lunge","Split Squat","Walking Lunge"]',
  progressions = '["Banded Bulgarian Split Squat","Pistol Squat","Lunge Jump"]',
  regressions = '["Reverse Lunge","Split Squat","Forward Lunge"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-057';

-- ed-058 Banded Bulgarian Split Squat (diff 4): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Bulgarian Split Squat","Banded Reverse Lunge","Assisted Pistol Squat"]',
  progressions = '["Pistol Squat","Lunge Jump"]',
  regressions = '["Bulgarian Split Squat","Banded Reverse Lunge","Walking Lunge"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-058';

-- ed-059 Step-Up (diff 2): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Reverse Lunge","Bulgarian Split Squat","Walking Lunge"]',
  progressions = '["Bulgarian Split Squat","Banded Bulgarian Split Squat","Lunge Jump"]',
  regressions = '["Reverse Lunge","Split Squat","Bodyweight Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-059';

-- ed-060 Single-Leg Romanian Deadlift (diff 3): subs 2→3, prog 0→1 (only Nordic harder), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Romanian Deadlift","Reverse Lunge","Banded Pull-Through"]',
  progressions = '["Nordic Curl"]',
  regressions = '["Banded Romanian Deadlift","Glute Bridge","Banded Good Morning"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-060';

-- ==================== GLUTE ISOLATION ====================

-- ed-061 Banded Clamshell (diff 1): subs 2→3, prog 2→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Fire Hydrant","Banded Hip Abduction","Donkey Kick"]',
  progressions = '["Banded Fire Hydrant","Banded Hip Abduction","Banded Lateral Walk"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-061';

-- ed-062 Donkey Kick (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Kickback","Glute Bridge","Banded Clamshell"]',
  progressions = '["Banded Kickback","Banded Hip Abduction","Banded Lateral Walk"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-062';

-- ed-063 Banded Fire Hydrant (diff 1): subs 2→3, prog 2→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Clamshell","Banded Hip Abduction","Donkey Kick"]',
  progressions = '["Banded Hip Abduction","Banded Lateral Walk","Banded Kickback"]',
  regressions = '["Banded Clamshell","Donkey Kick"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-063';

-- ed-064 Banded Kickback (diff 1): subs 2→3, prog 1→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Donkey Kick","Glute Bridge","Banded Clamshell"]',
  progressions = '["Banded Pull-Through","Hip Thrust","Banded Lateral Walk"]',
  regressions = '["Donkey Kick","Banded Clamshell"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-064';

-- ed-065 Banded Hip Abduction (diff 1): subs 2→3, prog 1→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Clamshell","Banded Fire Hydrant","Donkey Kick"]',
  progressions = '["Banded Lateral Walk","Banded Fire Hydrant"]',
  regressions = '["Banded Clamshell","Donkey Kick"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-065';

-- ed-066 Banded Lateral Walk (diff 2): subs 2→3, no prog (ceiling of glute iso), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Hip Abduction","Banded Fire Hydrant","Banded Clamshell"]',
  regressions = '["Banded Hip Abduction","Banded Clamshell","Donkey Kick"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-066';

-- ==================== CORE ====================

-- ed-013 Plank (diff 2): subs 2→3, prog 2→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Dead Bug","Bird Dog","Side Plank"]',
  progressions = '["Plank Shoulder Tap","Side Plank","Banded Pallof Press"]',
  regressions = '["Knee Plank","Dead Bug"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-013';

-- ed-014 Dead Bug (diff 2): subs 2→3, prog 0→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Plank","Bird Dog","Knee Plank"]',
  progressions = '["Plank Shoulder Tap","Bicycle Crunch","V-Up"]',
  regressions = '["Knee Plank","Bird Dog"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-014';

-- ed-015 Bird Dog (diff 1): subs 2→3, prog 0→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Dead Bug","Plank","Knee Plank"]',
  progressions = '["Dead Bug","Plank","Plank Shoulder Tap"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-015';

-- ed-067 Knee Plank (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Plank","Dead Bug","Bird Dog"]',
  progressions = '["Plank","Dead Bug","Plank Shoulder Tap"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-067';

-- ed-068 Plank Shoulder Tap (diff 3): subs 2→3, prog 1→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Plank","Dead Bug","Banded Pallof Press"]',
  progressions = '["Banded Pallof Overhead Press","V-Up","Hanging Leg Raise"]',
  regressions = '["Plank","Knee Plank","Dead Bug"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-068';

-- ed-069 Banded Pallof Press (diff 2): subs 2→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Anti-Rotation Hold","Plank Shoulder Tap","Banded Rotation"]',
  regressions = '["Plank","Plank Shoulder Tap","Bird Dog"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-069';

-- ed-070 Banded Anti-Rotation Hold (diff 2): subs 2→3, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Banded Pallof Press","Plank","Banded Rotation"]',
  regressions = '["Plank","Bird Dog","Knee Plank"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-070';

-- ed-071 Banded Pallof Overhead Press (diff 3): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Pallof Press","Banded Woodchop","Plank Shoulder Tap"]',
  regressions = '["Banded Pallof Press","Banded Anti-Rotation Hold","Plank"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-071';

-- ed-072 Half-Kneeling Banded Pallof Press (diff 2): subs 2→3, prog 1→2, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Banded Pallof Press","Banded Anti-Rotation Hold","Banded Rotation"]',
  progressions = '["Banded Pallof Overhead Press","Banded Woodchop"]',
  regressions = '["Banded Anti-Rotation Hold","Plank","Bird Dog"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-072';

-- ed-073 Crunch (diff 1): subs 2→3, prog 2→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Reverse Crunch","Dead Bug","Toe Touch"]',
  progressions = '["Bicycle Crunch","V-Up","Leg Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-073';

-- ed-074 Reverse Crunch (diff 1): subs 2→3, prog 2→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Crunch","Leg Raise","Toe Touch"]',
  progressions = '["Leg Raise","V-Up","Hanging Leg Raise"]',
  regressions = '["Crunch","Dead Bug"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-074';

-- ed-075 Bicycle Crunch (diff 2): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Russian Twist","Crunch","Mountain Climber"]',
  progressions = '["V-Up","Hanging Leg Raise"]',
  regressions = '["Crunch","Reverse Crunch","Dead Bug"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-075';

-- ed-076 Toe Touch (diff 2): subs 2→3, prog 1→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Crunch","V-Up","Reverse Crunch"]',
  progressions = '["V-Up","Hanging Leg Raise"]',
  regressions = '["Crunch","Dead Bug"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-076';

-- ed-077 Leg Raise (diff 2): subs 2→3, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Reverse Crunch","Hanging Leg Raise","Toe Touch"]',
  regressions = '["Reverse Crunch","Crunch","Dead Bug"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-077';

-- ed-078 V-Up (diff 3): subs 2→3, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Toe Touch","Leg Raise","Bicycle Crunch"]',
  regressions = '["Toe Touch","Crunch","Reverse Crunch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-078';

-- ed-079 Mountain Climber (diff 2): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Plank","High Knees","Bicycle Crunch"]',
  progressions = '["Burpee","Tuck Jump"]',
  regressions = '["Plank","Dead Bug","Knee Plank"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-079';

-- ed-080 Hanging Leg Raise (diff 4): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Leg Raise","V-Up","Toe Touch"]',
  regressions = '["Leg Raise","V-Up","Reverse Crunch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-080';

-- ed-081 Russian Twist (diff 2): subs 2→3, prog 2→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Bicycle Crunch","Banded Woodchop","Banded Rotation"]',
  regressions = '["Banded Rotation","Bicycle Crunch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-081';

-- ed-082 Banded Woodchop (diff 2): subs 2→3, prog 1→1, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Banded Rotation","Russian Twist","Banded Pallof Press"]',
  regressions = '["Russian Twist","Banded Rotation","Bicycle Crunch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-082';

-- ed-083 Banded Rotation (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Russian Twist","Banded Woodchop","Banded Pallof Press"]',
  progressions = '["Russian Twist","Banded Woodchop","Banded Pallof Press"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-083';

-- ed-084 Side Plank (diff 2): subs 2→3, prog 1→2, reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Plank","Copenhagen Plank","Banded Anti-Rotation Hold"]',
  progressions = '["Copenhagen Plank","Banded Pallof Overhead Press"]',
  regressions = '["Plank","Knee Plank","Bird Dog"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-084';

-- ed-085 Copenhagen Plank (diff 4): subs 2→3, no prog (ceiling), reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Side Plank","Banded Hip Abduction","Plank"]',
  regressions = '["Side Plank","Plank","Knee Plank"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-085';

-- ==================== SHOULDER ISOLATION ====================

-- ed-017 Banded Lateral Raise (diff 2): subs 2→3, prog 0→3, reg 0→1
UPDATE exercise_definition SET
  substitutes = '["Banded Front Raise","Banded Overhead Press","Banded Shrug"]',
  progressions = '["Banded Upright Row","Banded Overhead Press","Pike Push-Up"]',
  regressions = '["Banded Front Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-017';

-- ed-086 Banded Front Raise (diff 1): subs 2→3, prog 1→2. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Lateral Raise","Banded Overhead Press","Arm Circles"]',
  progressions = '["Banded Overhead Press","Pike Push-Up"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-086';

-- ed-087 Banded External Rotation (diff 1): subs 2→3. No prog/reg (rehab exercise).
UPDATE exercise_definition SET
  substitutes = '["Banded Internal Rotation","Banded Face Pull","Banded Reverse Fly"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-087';

-- ed-088 Banded Internal Rotation (diff 1): subs 1→3. No prog/reg (rehab exercise).
UPDATE exercise_definition SET
  substitutes = '["Banded External Rotation","Banded Face Pull","Banded Front Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-088';

-- ed-089 Banded Upright Row (diff 2): subs 2→3, prog 0→2, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Banded Lateral Raise","Banded Shrug","Banded Front Raise"]',
  progressions = '["Banded Overhead Press","Pike Push-Up"]',
  regressions = '["Banded Lateral Raise","Banded Shrug","Banded Front Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-089';

-- ed-090 Banded Shrug (diff 1): subs 1→3. No prog/reg (isolated trap exercise).
UPDATE exercise_definition SET
  substitutes = '["Banded Upright Row","Banded Front Raise","Banded Lateral Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-090';

-- ==================== ARMS ====================

-- ed-018 Banded Bicep Curl (diff 1): subs 1→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Hammer Curl","Banded Reverse Curl","Chin-Up"]',
  progressions = '["Banded Hammer Curl","Banded Concentration Curl","Banded Bayesian Curl"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-018';

-- ed-019 Banded Tricep Pushdown (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Diamond Push-Up","Banded Overhead Tricep Extension","Banded Tricep Kickback"]',
  progressions = '["Banded Tricep Kickback","Banded Overhead Tricep Extension","Tricep Dip"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-019';

-- ed-091 Banded Hammer Curl (diff 1): subs 2→3, prog 1→2, reg 1→1
UPDATE exercise_definition SET
  substitutes = '["Banded Bicep Curl","Banded Reverse Curl","Chin-Up"]',
  progressions = '["Banded Concentration Curl","Banded Bayesian Curl"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-091';

-- ed-092 Banded Concentration Curl (diff 2): subs 2→3, prog 0→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Bicep Curl","Banded Hammer Curl","Banded Bayesian Curl"]',
  progressions = '["Banded Bayesian Curl","Chin-Up"]',
  regressions = '["Banded Bicep Curl","Banded Hammer Curl"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-092';

-- ed-093 Banded Reverse Curl (diff 2): subs 2→3, prog 0→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Bicep Curl","Banded Hammer Curl","Banded Bayesian Curl"]',
  progressions = '["Banded Concentration Curl","Chin-Up"]',
  regressions = '["Banded Bicep Curl","Banded Hammer Curl"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-093';

-- ed-094 Banded Bayesian Curl (diff 2): subs 2→3, prog 0→1, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Bicep Curl","Banded Concentration Curl","Banded Reverse Curl"]',
  progressions = '["Chin-Up"]',
  regressions = '["Banded Bicep Curl","Banded Hammer Curl"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-094';

-- ed-095 Banded Overhead Tricep Extension (diff 2): subs 2→3, prog 0→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Tricep Pushdown","Diamond Push-Up","Banded Tricep Kickback"]',
  progressions = '["Bodyweight Skull Crusher","Diamond Push-Up","Tricep Dip"]',
  regressions = '["Banded Tricep Pushdown","Banded Tricep Kickback"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-095';

-- ed-096 Tricep Dip (diff 2): subs 2→3, prog 1→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Banded Tricep Pushdown","Diamond Push-Up","Banded Tricep Kickback"]',
  progressions = '["Diamond Push-Up","Bodyweight Skull Crusher"]',
  regressions = '["Banded Tricep Pushdown","Banded Tricep Kickback"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-096';

-- ed-097 Banded Tricep Kickback (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Banded Tricep Pushdown","Banded Overhead Tricep Extension","Tricep Dip"]',
  progressions = '["Banded Overhead Tricep Extension","Tricep Dip","Bodyweight Skull Crusher"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-097';

-- ed-098 Bodyweight Skull Crusher (diff 3): subs 2→3, no prog (ceiling of tricep iso), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Diamond Push-Up","Tricep Dip","Banded Overhead Tricep Extension"]',
  regressions = '["Tricep Dip","Banded Tricep Pushdown","Banded Tricep Kickback"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-098';

-- ==================== CALVES ====================

-- ed-099 Calf Raise (diff 1): subs 2→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Single-Leg Calf Raise","Banded Calf Raise","Seated Calf Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-099';

-- ed-100 Single-Leg Calf Raise (diff 2): subs 2→3, no prog (ceiling), reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Calf Raise","Banded Calf Raise","Seated Calf Raise"]',
  regressions = '["Calf Raise","Seated Calf Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-100';

-- ed-101 Banded Calf Raise (diff 2): subs 2→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Calf Raise","Single-Leg Calf Raise","Seated Calf Raise"]',
  regressions = '["Calf Raise","Seated Calf Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-101';

-- ed-102 Seated Calf Raise (diff 1): subs 1→3, prog 0→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Calf Raise","Banded Calf Raise","Single-Leg Calf Raise"]',
  progressions = '["Calf Raise","Banded Calf Raise","Single-Leg Calf Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-102';

-- ed-103 Tibialis Raise (diff 1): subs 1→3. No prog/reg (unique anterior exercise).
UPDATE exercise_definition SET
  substitutes = '["Calf Raise","Wall Calf Stretch","Seated Calf Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-103';

-- ==================== PLYOMETRIC ====================

-- ed-104 Jumping Jack (diff 1): subs 2→3, prog 1→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["High Knees","Butt Kicks","A-Skip"]',
  progressions = '["High Knees","Jump Squat","Tuck Jump"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-104';

-- ed-105 High Knees (diff 1): subs 2→3, prog 2→3, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["Jumping Jack","Butt Kicks","A-Skip"]',
  progressions = '["Jump Squat","Tuck Jump","Burpee"]',
  regressions = '["Butt Kicks","Jumping Jack"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-105';

-- ed-106 Butt Kicks (diff 1): subs 2→3, prog 1→2. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["High Knees","Jumping Jack","A-Skip"]',
  progressions = '["High Knees","Jump Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-106';

-- ed-107 Jump Squat (diff 3): subs 2→3, prog 1→3, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Lunge Jump","Tuck Jump","Skater Jump"]',
  progressions = '["Tuck Jump","Lunge Jump","Burpee"]',
  regressions = '["Bodyweight Squat","Jumping Jack","High Knees"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-107';

-- ed-108 Lunge Jump (diff 4): subs 2→3, prog 1→1 (only Burpee), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Jump Squat","Tuck Jump","Skater Jump"]',
  regressions = '["Reverse Lunge","Forward Lunge","Jump Squat"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-108';

-- ed-109 Skater Jump (diff 3): subs 2→3, prog 1→3, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Jump Squat","Lunge Jump","Tuck Jump"]',
  progressions = '["Lunge Jump","Tuck Jump","Burpee"]',
  regressions = '["Lateral Lunge","Jumping Jack","High Knees"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-109';

-- ed-110 Tuck Jump (diff 4): subs 2→3, prog 1→1 (only Burpee), reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Jump Squat","Lunge Jump","Skater Jump"]',
  regressions = '["Jump Squat","High Knees","Jumping Jack"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-110';

-- ed-111 Burpee (diff 4): subs 2→3, no prog (ceiling), reg 2→3
UPDATE exercise_definition SET
  substitutes = '["Jump Squat","Mountain Climber","Tuck Jump"]',
  regressions = '["Jump Squat","Mountain Climber","High Knees"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-111';

-- ==================== WARMUP / DYNAMIC ====================

-- ed-112 Arm Circles (diff 1): subs 2→3. No prog/reg (warmup).
UPDATE exercise_definition SET
  substitutes = '["Leg Swings","Hip Circles","Banded External Rotation"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-112';

-- ed-113 Leg Swings (diff 1): subs 2→3. No prog/reg (warmup).
UPDATE exercise_definition SET
  substitutes = '["Hip Circles","Arm Circles","Kneeling Hip Flexor Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-113';

-- ed-114 Hip Circles (diff 1): subs 1→3. No prog/reg (warmup).
UPDATE exercise_definition SET
  substitutes = '["Leg Swings","Arm Circles","Kneeling Hip Flexor Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-114';

-- ed-115 Inchworm (diff 2): subs 2→3, prog 1→2, reg 0→2
UPDATE exercise_definition SET
  substitutes = '["Bear Crawl","Mountain Climber","Downward Dog"]',
  progressions = '["Bear Crawl","Mountain Climber"]',
  regressions = '["Downward Dog","Cat-Cow"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-115';

-- ed-116 A-Skip (diff 2): subs 2→3, prog 1→2, reg 1→2
UPDATE exercise_definition SET
  substitutes = '["High Knees","Butt Kicks","Jumping Jack"]',
  progressions = '["High Knees","Jump Squat"]',
  regressions = '["Jumping Jack","Butt Kicks"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-116';

-- ed-117 Bear Crawl (diff 2): subs 2→3, prog 0→2, reg 1→3
UPDATE exercise_definition SET
  substitutes = '["Inchworm","Mountain Climber","Plank"]',
  progressions = '["Mountain Climber","Burpee"]',
  regressions = '["Inchworm","Plank","Knee Plank"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-117';

-- ==================== STRETCH / MOBILITY ====================
-- Stretches don't have meaningful progressions/regressions — focus on substitutes.

-- ed-020 Standing Quad Stretch (diff 1): subs 1→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Kneeling Hip Flexor Stretch","Standing Hamstring Stretch","Figure-Four Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-020';

-- ed-118 Standing Hamstring Stretch (diff 1): subs 2→3.
UPDATE exercise_definition SET
  substitutes = '["Seated Forward Fold","Standing Quad Stretch","Downward Dog"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-118';

-- ed-119 Kneeling Hip Flexor Stretch (diff 1): subs 2→3, prog 1→2.
UPDATE exercise_definition SET
  substitutes = '["Pigeon Stretch","90/90 Hip Stretch","World''s Greatest Stretch"]',
  progressions = '["Pigeon Stretch","World''s Greatest Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-119';

-- ed-120 Pigeon Stretch (diff 2): subs 2→3, reg 2→3.
UPDATE exercise_definition SET
  substitutes = '["90/90 Hip Stretch","Figure-Four Stretch","Butterfly Stretch"]',
  regressions = '["Figure-Four Stretch","Kneeling Hip Flexor Stretch","Butterfly Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-120';

-- ed-121 90/90 Hip Stretch (diff 2): subs 2→3, reg 1→2.
UPDATE exercise_definition SET
  substitutes = '["Pigeon Stretch","Figure-Four Stretch","Butterfly Stretch"]',
  regressions = '["Figure-Four Stretch","Butterfly Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-121';

-- ed-122 Figure-Four Stretch (diff 1): subs 2→3, prog 2→2. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Pigeon Stretch","90/90 Hip Stretch","Butterfly Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-122';

-- ed-123 Butterfly Stretch (diff 1): subs 2→3, prog 1→2. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Seated Forward Fold","Figure-Four Stretch","Kneeling Hip Flexor Stretch"]',
  progressions = '["90/90 Hip Stretch","Pigeon Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-123';

-- ed-124 Seated Forward Fold (diff 1): subs 1→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Standing Hamstring Stretch","Downward Dog","Butterfly Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-124';

-- ed-125 Cat-Cow (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Child''s Pose","Bird Dog","Thread the Needle"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-125';

-- ed-126 Child's Pose (diff 1): subs 2→3. No reg (floor).
UPDATE exercise_definition SET
  substitutes = '["Cat-Cow","Downward Dog","Seated Forward Fold"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-126';

-- ed-127 Downward Dog (diff 1): subs 2→3, reg 1→2.
UPDATE exercise_definition SET
  substitutes = '["Child''s Pose","Inchworm","Standing Hamstring Stretch"]',
  regressions = '["Child''s Pose","Cat-Cow"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-127';

-- ed-128 World's Greatest Stretch (diff 2): subs 2→3, reg 1→2.
UPDATE exercise_definition SET
  substitutes = '["Kneeling Hip Flexor Stretch","Pigeon Stretch","90/90 Hip Stretch"]',
  regressions = '["Kneeling Hip Flexor Stretch","Figure-Four Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-128';

-- ed-129 Supine Spinal Twist (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Thread the Needle","Scorpion Stretch","Cat-Cow"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-129';

-- ed-130 Thread the Needle (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Supine Spinal Twist","Cat-Cow","Scorpion Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-130';

-- ed-131 Scorpion Stretch (diff 2): subs 2→3, reg 1→2.
UPDATE exercise_definition SET
  substitutes = '["Supine Spinal Twist","Thread the Needle","Cat-Cow"]',
  regressions = '["Supine Spinal Twist","Thread the Needle"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-131';

-- ed-132 Chest Doorway Stretch (diff 1): subs 1→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Cross-Body Shoulder Stretch","Banded Chest Fly","Cat-Cow"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-132';

-- ed-133 Cross-Body Shoulder Stretch (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Chest Doorway Stretch","Overhead Tricep Stretch","Banded External Rotation"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-133';

-- ed-134 Overhead Tricep Stretch (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Cross-Body Shoulder Stretch","Lat Stretch","Chest Doorway Stretch"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-134';

-- ed-135 Lat Stretch (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Overhead Tricep Stretch","Cross-Body Shoulder Stretch","Child''s Pose"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-135';

-- ed-136 Wall Calf Stretch (diff 1): subs 2→3. No prog/reg (stretch).
UPDATE exercise_definition SET
  substitutes = '["Standing Hamstring Stretch","Downward Dog","Calf Raise"]',
  updated_at = '2026-04-15T00:00:00Z'
WHERE id = 'ed-136';

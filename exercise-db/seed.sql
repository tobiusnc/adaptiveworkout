-- Seed data: bodyweight and resistance band exercises
-- Run after schema.sql

INSERT INTO exercise_definition (
  id, name, aliases, instructions, form_cues, youtube_search_query,
  media_url, media_thumbnail_url,
  movement, primary_muscles, secondary_muscles, equipment, body_position,
  joint_stress, category, plane, anchor_point,
  difficulty, complexity, hr_impact, space_overhead, space_horizontal,
  grip_demand, noise_level,
  default_step_type, typical_duration_range, typical_rep_range,
  is_unilateral, is_compound, has_jumping, stretch_loaded, weightable,
  substitutes, progressions, regressions,
  created_at, updated_at
) VALUES

-- ─── PUSH ────────────────────────────────────────────────────────────────────

(
  'ed-001', 'Push-Up',
  '["Press-Up"]',
  '["Start in a high plank with hands slightly wider than shoulders","Lower chest toward the floor by bending elbows to about 90 degrees","Keep body in a straight line from head to heels throughout","Press back up to full arm extension"]',
  '["Flat back — no sagging hips","Elbows at 45 degrees, not flared","Squeeze glutes to lock plank"]',
  'push-up proper form',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core"]',
  '["bw"]', '["prone"]', '["wrist","shoulder"]',
  '["str"]', '["sag"]', '[]',
  2, 1, 3, 2, 1, 1, 1,
  'rep', NULL, '[8,20]',
  0, 1, 0, 1, 1,
  '["Diamond Push-Up","Banded Push-Up"]',
  '["Decline Push-Up","Archer Push-Up"]',
  '["Knee Push-Up","Incline Push-Up","Wall Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-002', 'Knee Push-Up',
  '["Modified Push-Up"]',
  '["Start in a plank position with knees on the ground and ankles crossed","Place hands slightly wider than shoulders","Lower chest toward the floor, maintaining a straight line from head to knees","Press back up to full arm extension"]',
  '["Straight line head to knees","Elbows 45 degrees","Engage core throughout"]',
  'knee push-up proper form',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core"]',
  '["bw"]', '["prone"]', '["wrist","shoulder"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 3, 1, 1, 1, 1,
  'rep', NULL, '[10,20]',
  0, 1, 0, 1, 0,
  '["Incline Push-Up","Wall Push-Up"]',
  '["Push-Up"]',
  '["Wall Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-003', 'Wall Push-Up',
  '[]',
  '["Stand arm''s length from a wall with palms flat against it at shoulder height","Bend elbows and lean your chest toward the wall","Press back to the starting position"]',
  '["Flat back throughout","Controlled tempo"]',
  'wall push-up form',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core"]',
  '["bw"]', '["stand"]', '["wrist"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 2, 1, 1, 1, 1,
  'rep', NULL, '[12,25]',
  0, 1, 0, 0, 0,
  '["Knee Push-Up","Incline Push-Up"]',
  '["Incline Push-Up","Knee Push-Up"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-004', 'Banded Push-Up',
  '["Resistance Band Push-Up"]',
  '["Loop a resistance band across your upper back and hold each end under your palms","Set up in a standard push-up position","Lower chest to the floor against the band tension","Press back up — the band adds resistance at the top of the movement"]',
  '["Band sits across mid-back, not neck","Same push-up form rules apply","Control the eccentric"]',
  'resistance band push-up',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core"]',
  '["band","bw"]', '["prone"]', '["wrist","shoulder"]',
  '["str"]', '["sag"]', '["anchor_none"]',
  3, 2, 3, 2, 1, 2, 1,
  'rep', NULL, '[6,15]',
  0, 1, 0, 1, 0,
  '["Push-Up","Diamond Push-Up"]',
  '["Archer Push-Up"]',
  '["Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── PULL ────────────────────────────────────────────────────────────────────

(
  'ed-005', 'Banded Pull-Apart',
  '["Band Pull-Apart"]',
  '["Hold a resistance band in front of you at shoulder height with arms straight","Pull the band apart by squeezing your shoulder blades together","Slowly return to the starting position"]',
  '["Arms stay at shoulder height","Squeeze shoulder blades at end range","Controlled return — don''t snap back"]',
  'banded pull apart form',
  NULL, NULL,
  '["pull_h"]', '["upper_back","rhomboids","delt_p"]', '["traps"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_none"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Banded Face Pull","Banded Row"]',
  '["Banded Face Pull"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-006', 'Banded Row',
  '["Resistance Band Row","Standing Band Row"]',
  '["Anchor a band at mid-height or step on it with both feet","Hinge slightly at the hips, back flat","Pull the band toward your lower ribcage, driving elbows back","Squeeze shoulder blades together at the top, then slowly extend arms"]',
  '["Flat back — hinge from hips","Elbows drive straight back, not flared","Squeeze at peak contraction"]',
  'resistance band row form',
  NULL, NULL,
  '["pull_h"]', '["lats","upper_back","rhomboids"]', '["biceps","core"]',
  '["band"]', '["stand"]', '["lback","shoulder"]',
  '["str"]', '["sag"]', '["anchor_mid","anchor_foot"]',
  2, 1, 3, 2, 1, 2, 1,
  'rep', NULL, '[10,15]',
  0, 1, 0, 1, 0,
  '["Banded Pull-Apart","Inverted Row"]',
  '["Banded Single-Arm Row"]',
  '["Banded Pull-Apart"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-007', 'Banded Face Pull',
  '["Band Face Pull"]',
  '["Anchor a band at head height","Grip band with both hands, palms facing in","Pull toward your face, flaring elbows high and out","Externally rotate so hands finish beside your ears, then return slowly"]',
  '["Elbows stay high, above shoulders","External rotation at end range","Don''t shrug — depress shoulders"]',
  'banded face pull form',
  NULL, NULL,
  '["pull_h"]', '["delt_p","upper_back","rhomboids"]', '["traps","biceps"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag","trans"]', '["anchor_high"]',
  2, 2, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Banded Pull-Apart","Banded Row"]',
  '[]',
  '["Banded Pull-Apart"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── SQUAT / LOWER PUSH ──────────────────────────────────────────────────────

(
  'ed-008', 'Bodyweight Squat',
  '["Air Squat"]',
  '["Stand with feet shoulder-width apart, toes slightly turned out","Push hips back and bend knees to lower as if sitting into a chair","Descend until thighs are at least parallel to the floor","Drive through your heels to stand back up"]',
  '["Chest up, back flat","Knees track over toes","Weight in heels and midfoot"]',
  'bodyweight squat proper form',
  NULL, NULL,
  '["squat"]', '["quads","glutes"]', '["core","adductors"]',
  '["bw"]', '["stand"]', '["knee","hip"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 3, 2, 1, 1, 1,
  'rep', NULL, '[10,25]',
  0, 1, 0, 1, 1,
  '["Banded Squat","Sumo Squat"]',
  '["Banded Squat","Jump Squat","Pistol Squat"]',
  '["Wall Sit","Chair Squat"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-009', 'Banded Squat',
  '["Resistance Band Squat"]',
  '["Stand on a resistance band with feet shoulder-width apart, holding the ends at shoulder height","Push hips back and bend knees to lower into a squat","Descend until thighs are parallel to the floor","Drive through heels to stand against band resistance"]',
  '["Chest up through the pull","Knees track over toes","Press out against band at bottom"]',
  'resistance band squat form',
  NULL, NULL,
  '["squat"]', '["quads","glutes"]', '["core","adductors"]',
  '["band","bw"]', '["stand"]', '["knee","hip"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  2, 1, 3, 2, 1, 2, 1,
  'rep', NULL, '[8,15]',
  0, 1, 0, 1, 0,
  '["Bodyweight Squat","Sumo Squat"]',
  '["Banded Bulgarian Split Squat"]',
  '["Bodyweight Squat"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── HINGE ───────────────────────────────────────────────────────────────────

(
  'ed-010', 'Banded Good Morning',
  '["Band Good Morning"]',
  '["Stand on a band with feet hip-width apart, loop the other end behind your neck","With a slight knee bend, hinge forward at the hips, pushing them back","Lower your torso until you feel a stretch in your hamstrings","Drive hips forward to return to standing"]',
  '["Flat back throughout — no rounding","Slight knee bend, not a squat","Hinge from hips, not waist"]',
  'banded good morning form',
  NULL, NULL,
  '["hinge"]', '["hams","glutes","erectors"]', '["core"]',
  '["band","bw"]', '["stand"]', '["lback","hip"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  2, 2, 3, 2, 1, 2, 1,
  'rep', NULL, '[10,15]',
  0, 1, 0, 1, 0,
  '["Banded Romanian Deadlift","Glute Bridge"]',
  '["Banded Romanian Deadlift"]',
  '["Glute Bridge"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-011', 'Glute Bridge',
  '["Hip Bridge"]',
  '["Lie on your back with knees bent and feet flat on the floor, hip-width apart","Drive through your heels to lift hips toward the ceiling","Squeeze glutes hard at the top, forming a straight line from shoulders to knees","Lower hips slowly back to the floor"]',
  '["Squeeze glutes at top","Don''t hyperextend lower back","Drive through heels"]',
  'glute bridge proper form',
  NULL, NULL,
  '["hinge"]', '["glutes","hams"]', '["core","erectors"]',
  '["bw"]', '["supine"]', '["lback"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 2, 1, 1, 1, 1,
  'rep', NULL, '[12,20]',
  0, 1, 0, 0, 1,
  '["Banded Good Morning","Single-Leg Glute Bridge"]',
  '["Banded Glute Bridge","Single-Leg Glute Bridge"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── LUNGE ───────────────────────────────────────────────────────────────────

(
  'ed-012', 'Reverse Lunge',
  '["Step-Back Lunge"]',
  '["Stand with feet hip-width apart","Step one foot back and lower until both knees form approximately 90-degree angles","Front knee stays over the ankle, back knee hovers just above the floor","Push through the front heel to return to standing"]',
  '["Front knee over ankle, not past toes","Torso upright","Control the step back"]',
  'reverse lunge proper form',
  NULL, NULL,
  '["lunge"]', '["quads","glutes"]', '["hams","core","adductors"]',
  '["bw"]', '["stand"]', '["knee","hip"]',
  '["str"]', '["sag"]', '[]',
  2, 2, 4, 2, 2, 1, 1,
  'rep', NULL, '[8,12]',
  1, 1, 0, 1, 1,
  '["Forward Lunge","Banded Split Squat"]',
  '["Banded Reverse Lunge","Walking Lunge"]',
  '["Split Squat"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── CORE ────────────────────────────────────────────────────────────────────

(
  'ed-013', 'Plank',
  '["Front Plank","Forearm Plank"]',
  '["Place forearms on the floor with elbows directly under shoulders","Extend legs behind you, balancing on toes","Engage your core to hold a straight line from head to heels","Breathe steadily and hold the position"]',
  '["Flat back — no sagging or piking","Squeeze glutes","Breathe steadily"]',
  'forearm plank proper form',
  NULL, NULL,
  '["iso"]', '["core"]', '["delt_a","glutes","quads"]',
  '["bw"]', '["prone"]', '["shoulder","lback"]',
  '["str","stab"]', '["sag"]', '[]',
  2, 1, 2, 1, 1, 1, 1,
  'timed', '[20,60]', NULL,
  0, 0, 0, 0, 0,
  '["Dead Bug","Bird Dog"]',
  '["Plank Shoulder Tap","Side Plank"]',
  '["Knee Plank"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-014', 'Dead Bug',
  '[]',
  '["Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees","Slowly extend your right arm overhead and left leg out straight, hovering above the floor","Return to the starting position and repeat on the opposite side","Keep your lower back pressed firmly into the floor throughout"]',
  '["Lower back stays glued to the floor","Move slowly and with control","Exhale as you extend"]',
  'dead bug exercise form',
  NULL, NULL,
  '["iso"]', '["core","obliques"]', '["hip_flex"]',
  '["bw"]', '["supine"]', '["lback"]',
  '["str","stab"]', '["sag"]', '[]',
  2, 2, 2, 1, 1, 1, 1,
  'rep', NULL, '[8,12]',
  1, 0, 0, 0, 0,
  '["Plank","Bird Dog"]',
  '["Banded Dead Bug"]',
  '["Knee Plank"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-015', 'Bird Dog',
  '[]',
  '["Start on all fours with hands under shoulders and knees under hips","Simultaneously extend your right arm forward and left leg back","Hold briefly at full extension, keeping hips and shoulders level","Return to the starting position and repeat on the opposite side"]',
  '["Hips stay level — don''t rotate","Extend to full length, not height","Brace core before each rep"]',
  'bird dog exercise form',
  NULL, NULL,
  '["iso"]', '["core","erectors","glutes"]', '["delt_a","hams"]',
  '["bw"]', '["quadruped"]', '["lback"]',
  '["str","stab"]', '["sag"]', '[]',
  1, 2, 2, 1, 1, 1, 1,
  'rep', NULL, '[8,12]',
  1, 0, 0, 0, 0,
  '["Dead Bug","Plank"]',
  '["Banded Bird Dog"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── SHOULDER ────────────────────────────────────────────────────────────────

(
  'ed-016', 'Banded Overhead Press',
  '["Band Shoulder Press"]',
  '["Stand on a band with feet shoulder-width apart, holding the ends at shoulder height","Press hands straight overhead until arms are fully extended","Lower back to shoulder height with control"]',
  '["Core braced — no arching back","Full lockout at top","Controlled descent"]',
  'resistance band overhead press form',
  NULL, NULL,
  '["push_v"]', '["delt_a","delt_l","triceps"]', '["core","traps"]',
  '["band","bw"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  2, 1, 3, 3, 1, 2, 1,
  'rep', NULL, '[8,15]',
  0, 1, 0, 0, 0,
  '["Pike Push-Up","Banded Lateral Raise"]',
  '["Banded Single-Arm Press"]',
  '["Banded Lateral Raise"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-017', 'Banded Lateral Raise',
  '["Band Side Raise"]',
  '["Stand on a band with feet together, holding each end at your sides","Raise both arms out to the sides until they reach shoulder height","Pause briefly at the top, then lower slowly"]',
  '["Slight bend in elbows","Lead with elbows, not hands","Don''t shrug"]',
  'resistance band lateral raise form',
  NULL, NULL,
  '["iso"]', '["delt_l"]', '["traps","delt_a"]',
  '["band","bw"]', '["stand"]', '["shoulder"]',
  '["str"]', '["front"]', '["anchor_foot"]',
  2, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Banded Front Raise","Banded Overhead Press"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── ARMS ────────────────────────────────────────────────────────────────────

(
  'ed-018', 'Banded Bicep Curl',
  '["Band Curl","Resistance Band Curl"]',
  '["Stand on a band with feet shoulder-width apart, holding each end with palms facing forward","Curl hands toward your shoulders, keeping upper arms stationary","Squeeze biceps at the top, then lower slowly"]',
  '["Elbows pinned to sides","Full range of motion","Control the descent"]',
  'resistance band bicep curl form',
  NULL, NULL,
  '["pull_v"]', '["biceps"]', '["forearms"]',
  '["band","bw"]', '["stand"]', '["elbow"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[10,20]',
  0, 0, 0, 1, 0,
  '["Banded Hammer Curl"]',
  '["Banded Concentration Curl"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-019', 'Banded Tricep Pushdown',
  '["Band Tricep Extension"]',
  '["Anchor a band at a high point and grasp both ends","With elbows pinned at your sides, push hands down until arms are fully extended","Squeeze triceps at the bottom, then return slowly to the starting position"]',
  '["Elbows stay pinned to ribs","Full extension at bottom","Controlled return"]',
  'resistance band tricep pushdown form',
  NULL, NULL,
  '["push_v"]', '["triceps"]', '["forearms"]',
  '["band"]', '["stand"]', '["elbow"]',
  '["str"]', '["sag"]', '["anchor_high"]',
  1, 1, 2, 1, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Diamond Push-Up","Banded Overhead Tricep Extension"]',
  '["Banded Overhead Tricep Extension"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

-- ─── STRETCH / MOBILITY ──────────────────────────────────────────────────────

(
  'ed-020', 'Standing Quad Stretch',
  '[]',
  '["Stand on one leg, grab the opposite ankle behind you","Pull heel toward your glute, keeping knees together","Hold the stretch — use a wall for balance if needed"]',
  '["Knees together","Squeeze glute of stretched leg","Stand tall"]',
  'standing quad stretch form',
  NULL, NULL,
  '["iso"]', '["quads","hip_flex"]', '[]',
  '["bw"]', '["stand"]', '["knee"]',
  '["stretch"]', '["sag"]', '[]',
  1, 1, 1, 1, 1, 1, 1,
  'timed', '[20,45]', NULL,
  1, 0, 0, 1, 0,
  '["Couch Stretch","Kneeling Hip Flexor Stretch"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

-- ─── VARIANTS ────────────────────────────────────────────────────────────────

INSERT INTO exercise_variant (id, exercise_definition_id, name, cue_override) VALUES
  ('ev-001', 'ed-001', 'Push-Up (pause at bottom)', 'Hold 2 seconds at the bottom'),
  ('ev-001b', 'ed-001', 'Push-Up (wide grip)', 'Hands wider than shoulders'),
  ('ev-002', 'ed-008', 'Bodyweight Squat (pause at bottom)', 'Hold 3 seconds at parallel'),
  ('ev-003', 'ed-008', 'Bodyweight Squat (1.5 rep)', 'Go down, come halfway up, go back down, then stand fully'),
  ('ev-004', 'ed-013', 'Plank (shoulder tap)', 'Tap opposite shoulder while maintaining plank'),
  ('ev-005', 'ed-011', 'Glute Bridge (hold at top)', 'Hold 3 seconds at peak contraction'),
  ('ev-006', 'ed-018', 'Banded Bicep Curl (pause at top)', 'Hold 2 seconds at peak contraction');

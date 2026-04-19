-- Batch 01: Push Horizontal (new)
-- Incline Push-Up, Diamond Push-Up, Decline Push-Up, Archer Push-Up, Banded Chest Fly

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

(
  'ed-021', 'Incline Push-Up',
  '["Elevated Push-Up"]',
  '["Place hands on a bench, step, or sturdy elevated surface at about waist height","Set up in a plank position with arms straight, body in a line from head to heels","Lower chest toward the surface by bending elbows to about 90 degrees","Press back up to full arm extension"]',
  '["Flat back — no sagging hips","Elbows at 45 degrees","Full range of motion to the surface"]',
  'incline push-up proper form',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core"]',
  '["bw","bench"]', '["prone"]', '["wrist","shoulder"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 3, 1, 1, 1, 1,
  'rep', NULL, '[10,25]',
  0, 1, 0, 1, 0,
  '["Knee Push-Up","Wall Push-Up"]',
  '["Push-Up"]',
  '["Wall Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-022', 'Diamond Push-Up',
  '["Triangle Push-Up","Close-Grip Push-Up"]',
  '["Start in a push-up position with hands together directly under your chest, forming a diamond shape with index fingers and thumbs","Lower chest toward your hands, keeping elbows close to your body","Press back up to full arm extension"]',
  '["Hands form a diamond under chest","Elbows stay tight to body","Full lockout at top"]',
  'diamond push-up proper form',
  NULL, NULL,
  '["push_h"]', '["triceps","chest","delt_a"]', '["core"]',
  '["bw"]', '["prone"]', '["wrist","shoulder","elbow"]',
  '["str"]', '["sag"]', '[]',
  3, 1, 3, 2, 1, 1, 1,
  'rep', NULL, '[6,15]',
  0, 1, 0, 1, 1,
  '["Push-Up","Banded Tricep Pushdown"]',
  '["Archer Push-Up"]',
  '["Push-Up","Knee Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-023', 'Decline Push-Up',
  '["Feet-Elevated Push-Up"]',
  '["Place feet on a bench or elevated surface and hands on the floor, slightly wider than shoulders","Set up in a plank with body in a straight line from head to heels","Lower chest toward the floor by bending elbows","Press back up to full arm extension"]',
  '["Flat back — no piking at hips","Elbows at 45 degrees","Control the descent"]',
  'decline push-up proper form',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core","delt_l"]',
  '["bw","bench"]', '["prone"]', '["wrist","shoulder"]',
  '["str"]', '["sag"]', '[]',
  3, 1, 3, 2, 1, 1, 1,
  'rep', NULL, '[6,15]',
  0, 1, 0, 1, 1,
  '["Push-Up","Banded Push-Up"]',
  '["Archer Push-Up","Pike Push-Up"]',
  '["Push-Up","Incline Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-024', 'Archer Push-Up',
  '[]',
  '["Start in a wide push-up position with hands significantly wider than shoulders","Shift your weight to one side, bending that elbow while the opposite arm straightens out to the side","Lower your chest toward the bent-arm side","Press back up and repeat, alternating sides or completing all reps on one side"]',
  '["Straight arm stays fully extended","Chest lowers toward working hand","Core tight — no rotation"]',
  'archer push-up form tutorial',
  NULL, NULL,
  '["push_h"]', '["chest","triceps","delt_a"]', '["core"]',
  '["bw"]', '["prone"]', '["wrist","shoulder"]',
  '["str"]', '["sag"]', '[]',
  4, 3, 4, 2, 2, 1, 1,
  'rep', NULL, '[4,10]',
  1, 1, 0, 1, 0,
  '["Decline Push-Up","Diamond Push-Up"]',
  '["Wall Handstand Push-Up"]',
  '["Push-Up","Decline Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-025', 'Banded Chest Fly',
  '["Resistance Band Chest Fly","Band Fly"]',
  '["Anchor a band behind you at chest height or wrap it around your upper back","Hold the ends with arms extended out to the sides, slight bend in elbows","Bring your hands together in front of your chest in a hugging motion","Return slowly to the starting position with control"]',
  '["Slight bend in elbows throughout","Squeeze chest at the front","Slow, controlled return"]',
  'resistance band chest fly form',
  NULL, NULL,
  '["push_h"]', '["chest"]', '["delt_a","biceps"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_mid","anchor_none"]',
  2, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[10,20]',
  0, 0, 0, 1, 0,
  '["Push-Up","Banded Push-Up"]',
  '[]',
  '["Banded Pull-Apart"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

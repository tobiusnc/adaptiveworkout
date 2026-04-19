-- Batch 02: Push Vertical (new)
-- Pike Push-Up, Hindu Push-Up, Decline Pike Push-Up, Wall Handstand Push-Up

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
  'ed-026', 'Pike Push-Up',
  '[]',
  '["Start in a downward-dog position with hands shoulder-width apart and hips piked high","Bend your elbows and lower the top of your head toward the floor between your hands","Press back up to full arm extension, keeping hips high throughout"]',
  '["Hips stay high — form an inverted V","Head moves toward the floor, not forward","Elbows point back, not out"]',
  'pike push-up proper form',
  NULL, NULL,
  '["push_v"]', '["delt_a","delt_l","triceps"]', '["chest","core","traps"]',
  '["bw"]', '["prone"]', '["shoulder","wrist"]',
  '["str"]', '["sag"]', '[]',
  3, 2, 3, 2, 2, 1, 1,
  'rep', NULL, '[6,12]',
  0, 1, 0, 0, 1,
  '["Banded Overhead Press","Decline Pike Push-Up"]',
  '["Decline Pike Push-Up","Wall Handstand Push-Up"]',
  '["Banded Overhead Press"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-027', 'Hindu Push-Up',
  '["Dand","Dive Bomber Push-Up"]',
  '["Start in a downward-dog position with hips piked high","Swoop your chest forward and down, skimming close to the floor","Continue the arc upward, pressing through your hands until arms are straight and hips are low in an upward-dog position","Reverse the movement or pike back up to the starting position and repeat"]',
  '["Smooth flowing arc — don''t pause at the bottom","Hips lead the return to start","Breathe in on the swoop down, out on the press up"]',
  'hindu push-up proper form',
  NULL, NULL,
  '["push_v","push_h"]', '["chest","delt_a","triceps"]', '["core","erectors","hip_flex"]',
  '["bw"]', '["prone"]', '["shoulder","wrist","lback"]',
  '["str","mob"]', '["sag"]', '[]',
  3, 3, 4, 2, 2, 1, 1,
  'rep', NULL, '[6,12]',
  0, 1, 0, 1, 0,
  '["Pike Push-Up","Push-Up"]',
  '["Decline Pike Push-Up"]',
  '["Push-Up","Incline Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-028', 'Decline Pike Push-Up',
  '["Feet-Elevated Pike Push-Up"]',
  '["Place feet on a bench or elevated surface and walk hands back so hips are piked high","Hands shoulder-width apart on the floor, body forms a steep inverted V","Bend elbows and lower the top of your head toward the floor","Press back up to full arm extension"]',
  '["Steeper angle = more shoulder load","Head toward the floor, not forward","Control the descent"]',
  'decline pike push-up form',
  NULL, NULL,
  '["push_v"]', '["delt_a","delt_l","triceps"]', '["chest","core","traps"]',
  '["bw","bench"]', '["prone"]', '["shoulder","wrist"]',
  '["str"]', '["sag"]', '[]',
  4, 2, 3, 2, 2, 1, 1,
  'rep', NULL, '[4,10]',
  0, 1, 0, 0, 1,
  '["Pike Push-Up","Banded Overhead Press"]',
  '["Wall Handstand Push-Up"]',
  '["Pike Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-029', 'Wall Handstand Push-Up',
  '["Wall HSPU","Handstand Push-Up"]',
  '["Kick up into a handstand facing the wall, hands shoulder-width apart about 6 inches from the wall","Slowly lower yourself by bending elbows until the top of your head touches the floor","Press back up to full arm lockout","Keep core tight and body as straight as possible throughout"]',
  '["Fingers spread wide for balance","Elbows track at 45 degrees","Tight core — no arching"]',
  'wall handstand push-up form tutorial',
  NULL, NULL,
  '["push_v"]', '["delt_a","delt_l","triceps","traps"]', '["core","chest"]',
  '["bw"]', '["prone"]', '["shoulder","wrist","neck"]',
  '["str"]', '["sag"]', '[]',
  5, 4, 4, 3, 1, 2, 1,
  'rep', NULL, '[2,8]',
  0, 1, 0, 0, 1,
  '["Decline Pike Push-Up","Pike Push-Up"]',
  '[]',
  '["Decline Pike Push-Up","Pike Push-Up"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

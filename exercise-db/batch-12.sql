-- Batch 12: Core Rotation / Lateral
-- Russian Twist, Banded Woodchop, Banded Rotation, Side Plank, Copenhagen Plank

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
  'ed-081', 'Russian Twist',
  '["Seated Twist"]',
  '["Sit on the floor with knees bent and feet flat or slightly elevated","Lean back slightly so your torso is at about 45 degrees, core engaged","Rotate your torso to one side, bringing your hands toward the floor beside your hip","Rotate to the other side and repeat"]',
  '["Lean back from hips, not by rounding the back","Rotate from the torso, not just the arms","Feet can be elevated for more challenge"]',
  'russian twist proper form',
  NULL, NULL,
  '["rotation"]', '["obliques","core"]', '["hip_flex"]',
  '["bw"]', '["sit"]', '["lback"]',
  '["str"]', '["trans"]', '[]',
  2, 1, 3, 1, 1, 1, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 1,
  '["Bicycle Crunch","Banded Woodchop"]',
  '["Banded Woodchop","Banded Rotation"]',
  '["Bicycle Crunch"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-082', 'Banded Woodchop',
  '["Band Woodchop","Resistance Band Woodchop"]',
  '["Anchor a band at a low point and stand perpendicular to the anchor","Grip the band with both hands near the low anchor side","In one smooth motion, pull the band diagonally across your body from low to high, rotating your torso","Return to the starting position with control and repeat; switch sides after completing all reps"]',
  '["Power comes from the hips and core, not the arms","Feet pivot slightly with the rotation","Control the return — don''t let the band snap back"]',
  'resistance band woodchop form',
  NULL, NULL,
  '["rotation"]', '["obliques","core"]', '["delt_a","glutes","hams"]',
  '["band"]', '["stand"]', '["lback"]',
  '["str"]', '["trans","sag"]', '["anchor_low"]',
  2, 2, 3, 2, 1, 2, 1,
  'rep', NULL, '[10,15]',
  1, 1, 0, 0, 0,
  '["Banded Rotation","Russian Twist"]',
  '["Banded Pallof Overhead Press"]',
  '["Russian Twist","Banded Rotation"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-083', 'Banded Rotation',
  '["Band Trunk Rotation","Standing Band Rotation"]',
  '["Anchor a band at chest height and stand perpendicular to the anchor","Hold the band with both hands extended at chest height","Rotate your torso away from the anchor point, keeping arms extended and hips relatively still","Return to center with control and repeat; switch sides after completing all reps"]',
  '["Rotate from the torso — hips stay as still as possible","Arms stay extended at chest height","Controlled rotation both directions"]',
  'resistance band trunk rotation form',
  NULL, NULL,
  '["rotation"]', '["obliques","core"]', '["delt_a"]',
  '["band"]', '["stand"]', '["lback"]',
  '["str"]', '["trans"]', '["anchor_mid"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 0,
  '["Russian Twist","Banded Woodchop"]',
  '["Banded Woodchop"]',
  '["Russian Twist"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-084', 'Side Plank',
  '["Lateral Plank"]',
  '["Lie on your side with your elbow directly under your shoulder and feet stacked","Lift your hips off the floor so your body forms a straight line from head to feet","Hold this position, engaging your obliques and glutes","Lower with control when finished; repeat on the other side"]',
  '["Hips stay stacked and lifted — no sagging","Elbow directly under shoulder","Top arm on hip or extended toward ceiling"]',
  'side plank proper form',
  NULL, NULL,
  '["iso"]', '["obliques","core"]', '["glutes","delt_l","adductors"]',
  '["bw"]', '["lateral"]', '["shoulder","lback"]',
  '["str","stab"]', '["front"]', '[]',
  2, 1, 2, 1, 1, 1, 1,
  'timed', '[15,45]', NULL,
  1, 0, 0, 0, 0,
  '["Plank","Copenhagen Plank"]',
  '["Copenhagen Plank"]',
  '["Plank","Knee Plank"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-085', 'Copenhagen Plank',
  '["Copenhagen Adductor Plank"]',
  '["Lie on your side with your elbow directly under your shoulder","Place the top leg on a bench or elevated surface with the bottom leg hanging free","Lift your hips to form a straight line, supporting yourself on the elbow and the top leg","Hold the position; the bottom leg can hang or be tucked for support"]',
  '["Top leg drives into the bench","Hips stay stacked and lifted","Start with short holds and build duration"]',
  'copenhagen plank form tutorial',
  NULL, NULL,
  '["iso"]', '["adductors","obliques","core"]', '["glutes","hip_flex"]',
  '["bw","bench"]', '["lateral"]', '["shoulder","hip"]',
  '["str","stab"]', '["front"]', '[]',
  4, 2, 2, 1, 1, 1, 1,
  'timed', '[10,30]', NULL,
  1, 0, 0, 0, 0,
  '["Side Plank","Banded Hip Abduction"]',
  '[]',
  '["Side Plank"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

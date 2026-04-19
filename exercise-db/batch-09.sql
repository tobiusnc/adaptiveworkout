-- Batch 09: Core Anti-Extension (new)
-- Knee Plank, Plank Shoulder Tap

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
  'ed-067', 'Knee Plank',
  '["Modified Plank"]',
  '["Place forearms on the floor with elbows directly under shoulders","Rest on your knees instead of your toes, with knees hip-width apart","Engage your core to hold a straight line from head to knees","Breathe steadily and hold the position"]',
  '["Straight line from head to knees","No sagging hips","Squeeze glutes"]',
  'knee plank proper form',
  NULL, NULL,
  '["iso"]', '["core"]', '["delt_a","glutes"]',
  '["bw"]', '["prone"]', '["shoulder","lback"]',
  '["str","stab"]', '["sag"]', '[]',
  1, 1, 2, 1, 1, 1, 1,
  'timed', '[15,45]', NULL,
  0, 0, 0, 0, 0,
  '["Plank","Dead Bug"]',
  '["Plank"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-068', 'Plank Shoulder Tap',
  '["Plank Tap"]',
  '["Start in a high plank position on your hands with feet slightly wider than hip-width for stability","Lift one hand and tap the opposite shoulder","Return the hand to the floor and repeat on the other side","Keep hips as still as possible throughout"]',
  '["Hips stay level — no rocking side to side","Widen feet for more stability","Controlled taps"]',
  'plank shoulder tap form',
  NULL, NULL,
  '["iso"]', '["core","obliques"]', '["delt_a","glutes"]',
  '["bw"]', '["prone"]', '["shoulder","wrist","lback"]',
  '["str","stab"]', '["sag","trans"]', '[]',
  3, 2, 3, 1, 1, 1, 1,
  'rep', NULL, '[8,16]',
  1, 0, 0, 0, 0,
  '["Plank","Dead Bug"]',
  '["Banded Pallof Press"]',
  '["Plank","Knee Plank"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

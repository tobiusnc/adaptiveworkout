-- Batch 13: Shoulder Isolation (new)
-- Banded Front Raise, Banded External Rotation, Banded Internal Rotation, Banded Upright Row, Banded Shrug

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
  'ed-086', 'Banded Front Raise',
  '["Band Front Raise","Resistance Band Front Raise"]',
  '["Stand on a band with feet shoulder-width apart, holding the ends at your sides with palms facing back","Raise both arms straight in front of you to shoulder height","Pause briefly at the top, then lower slowly"]',
  '["Arms stay straight with a slight elbow bend","Raise to shoulder height, not higher","Don''t swing — controlled movement"]',
  'resistance band front raise form',
  NULL, NULL,
  '["iso"]', '["delt_a"]', '["delt_l","core"]',
  '["band","bw"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Banded Lateral Raise","Banded Overhead Press"]',
  '["Banded Overhead Press"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-087', 'Banded External Rotation',
  '["Band External Rotation","ER Band Exercise"]',
  '["Hold a band with both hands in front of you, elbows bent at 90 degrees and pinned to your sides","Rotate your forearms outward, pulling the band apart while keeping elbows at your sides","Hold briefly at the end range, then return slowly to the starting position"]',
  '["Elbows stay glued to your sides","Rotate from the shoulder, not the wrist","Controlled tempo — this is a small movement"]',
  'banded external rotation shoulder form',
  NULL, NULL,
  '["iso"]', '["delt_p"]', '["upper_back","rhomboids"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str","mob"]', '["trans"]', '["anchor_none"]',
  1, 1, 1, 1, 1, 2, 1,
  'rep', NULL, '[15,20]',
  0, 0, 0, 0, 0,
  '["Banded Internal Rotation","Banded Face Pull"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-088', 'Banded Internal Rotation',
  '["Band Internal Rotation","IR Band Exercise"]',
  '["Anchor a band at elbow height to your side","Stand perpendicular to the anchor, holding the band with the hand closest to it","With elbow bent at 90 degrees and pinned to your side, rotate your forearm inward across your body","Return slowly to the starting position"]',
  '["Elbow stays glued to your side","Rotate from the shoulder","Controlled in both directions"]',
  'banded internal rotation shoulder form',
  NULL, NULL,
  '["iso"]', '["delt_a"]', '["chest"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str","mob"]', '["trans"]', '["anchor_mid"]',
  1, 1, 1, 1, 1, 2, 1,
  'rep', NULL, '[15,20]',
  1, 0, 0, 0, 0,
  '["Banded External Rotation"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-089', 'Banded Upright Row',
  '["Band Upright Row","Resistance Band Upright Row"]',
  '["Stand on a band with feet shoulder-width apart, holding the ends with both hands in front of your thighs","Pull the band straight up along your body, leading with your elbows","Raise until your elbows are at or just above shoulder height","Lower slowly back to the starting position"]',
  '["Lead with elbows, not hands","Don''t go higher than shoulder height","Keep band close to your body"]',
  'resistance band upright row form',
  NULL, NULL,
  '["pull_v"]', '["delt_l","traps"]', '["delt_a","biceps"]',
  '["band","bw"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  2, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[10,15]',
  0, 1, 0, 0, 0,
  '["Banded Lateral Raise","Banded Shrug"]',
  '[]',
  '["Banded Lateral Raise"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-090', 'Banded Shrug',
  '["Band Shrug","Resistance Band Shrug"]',
  '["Stand on a band with feet shoulder-width apart, holding the ends at your sides with arms straight","Shrug your shoulders straight up toward your ears","Squeeze and hold at the top for a moment","Lower slowly back to the starting position"]',
  '["Straight up — don''t roll shoulders","Squeeze at the top","Arms stay straight throughout"]',
  'resistance band shrug form',
  NULL, NULL,
  '["iso"]', '["traps"]', '["delt_l","forearms"]',
  '["band","bw"]', '["stand"]', '["neck"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  1, 1, 2, 1, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Banded Upright Row"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

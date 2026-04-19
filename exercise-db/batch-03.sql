-- Batch 03: Pull Horizontal (new)
-- Banded Reverse Fly, Banded Single-Arm Row, Inverted Row

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
  'ed-030', 'Banded Reverse Fly',
  '["Band Rear Delt Fly"]',
  '["Stand with feet hip-width apart, hinge forward slightly at the hips","Hold a band in front of you with both hands, arms extended and a slight bend in the elbows","Pull the band apart by driving your hands out to the sides, squeezing shoulder blades together","Return slowly to the starting position"]',
  '["Slight hinge — chest faces the floor at ~45 degrees","Squeeze shoulder blades at end range","Don''t shrug — keep shoulders down"]',
  'banded reverse fly form',
  NULL, NULL,
  '["pull_h"]', '["delt_p","upper_back","rhomboids"]', '["traps"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_none"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 0, 0,
  '["Banded Pull-Apart","Banded Face Pull"]',
  '["Banded Face Pull"]',
  '["Banded Pull-Apart"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-031', 'Banded Single-Arm Row',
  '["Single-Arm Band Row"]',
  '["Anchor a band at mid-height or step on it with the opposite foot","Hinge forward at the hips, back flat, and grab the band with one hand","Pull the band toward your lower ribcage, driving the elbow straight back","Squeeze the shoulder blade at the top, then extend the arm slowly"]',
  '["Flat back — no rotation","Elbow drives straight back","Full stretch at the bottom"]',
  'single arm resistance band row form',
  NULL, NULL,
  '["pull_h"]', '["lats","upper_back","rhomboids"]', '["biceps","core","obliques"]',
  '["band"]', '["stand"]', '["lback","shoulder"]',
  '["str"]', '["sag"]', '["anchor_mid","anchor_foot"]',
  2, 1, 3, 2, 1, 2, 1,
  'rep', NULL, '[8,15]',
  1, 1, 0, 1, 0,
  '["Banded Row","Inverted Row"]',
  '[]',
  '["Banded Row"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-032', 'Inverted Row',
  '["Body Row","Australian Pull-Up"]',
  '["Set a bar or sturdy surface at about waist height","Hang underneath with arms extended, body in a straight line from head to heels, heels on the floor","Pull your chest up to the bar by squeezing shoulder blades together and bending elbows","Lower yourself back to full arm extension with control"]',
  '["Straight body line — squeeze glutes","Chest to bar, not chin","Control the descent"]',
  'inverted row proper form',
  NULL, NULL,
  '["pull_h"]', '["lats","upper_back","rhomboids","biceps"]', '["core","delt_p","forearms"]',
  '["bw"]', '["supine"]', '["shoulder","elbow"]',
  '["str"]', '["sag"]', '[]',
  2, 1, 3, 1, 2, 3, 1,
  'rep', NULL, '[6,15]',
  0, 1, 0, 1, 1,
  '["Banded Row","Pull-Up"]',
  '["Pull-Up","Chin-Up"]',
  '["Banded Row","Banded Single-Arm Row"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

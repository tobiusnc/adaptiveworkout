-- Batch 04: Pull Vertical
-- Banded Lat Pulldown, Banded Straight-Arm Pulldown, Banded Assisted Pull-Up, Pull-Up, Chin-Up

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
  'ed-033', 'Banded Lat Pulldown',
  '["Band Lat Pulldown"]',
  '["Anchor a band at a high point above your head","Kneel or stand below the anchor and grasp both ends of the band with arms extended overhead","Pull the band down toward your upper chest, driving elbows down and back","Return slowly to the fully stretched position overhead"]',
  '["Drive elbows toward your hips","Chest up — slight lean back","Full stretch at the top"]',
  'resistance band lat pulldown form',
  NULL, NULL,
  '["pull_v"]', '["lats","upper_back"]', '["biceps","rhomboids","traps"]',
  '["band"]', '["kneel"]', '["shoulder","elbow"]',
  '["str"]', '["sag"]', '["anchor_high","anchor_door"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[10,15]',
  0, 1, 0, 1, 0,
  '["Banded Straight-Arm Pulldown","Banded Assisted Pull-Up"]',
  '["Banded Assisted Pull-Up","Pull-Up"]',
  '["Banded Straight-Arm Pulldown"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-034', 'Banded Straight-Arm Pulldown',
  '["Band Straight-Arm Pushdown"]',
  '["Anchor a band at a high point and face it, standing at arm''s length","Grasp the band with both hands, arms extended in front and slightly above you","Keeping arms straight with a slight elbow bend, pull the band down to your thighs in an arc","Return slowly to the starting position"]',
  '["Arms stay straight — move from the shoulders","Squeeze lats at the bottom","Controlled return — don''t let band snap back"]',
  'resistance band straight arm pulldown form',
  NULL, NULL,
  '["pull_v"]', '["lats"]', '["triceps","core","delt_p"]',
  '["band"]', '["stand"]', '["shoulder"]',
  '["str"]', '["sag"]', '["anchor_high","anchor_door"]',
  1, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 1, 0,
  '["Banded Lat Pulldown"]',
  '["Banded Lat Pulldown"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-035', 'Banded Assisted Pull-Up',
  '["Band-Assisted Pull-Up"]',
  '["Loop a resistance band over a pull-up bar and let it hang down","Step or kneel into the band so it supports some of your body weight","Grip the bar with palms facing away, hands slightly wider than shoulders","Pull yourself up until your chin clears the bar, then lower with control"]',
  '["Full hang at the bottom — no half reps","Chin over the bar at the top","Control the descent"]',
  'band assisted pull-up form',
  NULL, NULL,
  '["pull_v"]', '["lats","upper_back","biceps"]', '["forearms","core","delt_p","rhomboids"]',
  '["band","pullup"]', '["hang"]', '["shoulder","elbow"]',
  '["str"]', '["sag"]', '[]',
  3, 2, 3, 3, 1, 3, 1,
  'rep', NULL, '[4,10]',
  0, 1, 0, 1, 0,
  '["Banded Lat Pulldown","Inverted Row"]',
  '["Pull-Up","Chin-Up"]',
  '["Banded Lat Pulldown","Inverted Row"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-036', 'Pull-Up',
  '[]',
  '["Grip a pull-up bar with palms facing away, hands slightly wider than shoulder-width","Hang with arms fully extended and core engaged","Pull yourself up by driving elbows down until your chin clears the bar","Lower yourself back to a full hang with control"]',
  '["Full dead hang at the bottom","Chin clears the bar at the top","No kipping — strict movement"]',
  'pull-up proper form',
  NULL, NULL,
  '["pull_v"]', '["lats","upper_back","biceps"]', '["forearms","core","delt_p","rhomboids"]',
  '["pullup"]', '["hang"]', '["shoulder","elbow"]',
  '["str"]', '["sag"]', '[]',
  4, 2, 4, 3, 1, 3, 1,
  'rep', NULL, '[3,12]',
  0, 1, 0, 1, 1,
  '["Chin-Up","Banded Assisted Pull-Up"]',
  '[]',
  '["Banded Assisted Pull-Up","Inverted Row"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-037', 'Chin-Up',
  '[]',
  '["Grip a pull-up bar with palms facing toward you, hands shoulder-width apart","Hang with arms fully extended and core engaged","Pull yourself up until your chin clears the bar, squeezing biceps at the top","Lower yourself back to a full hang with control"]',
  '["Full dead hang at the bottom","Chin clears the bar at the top","Supinated grip — palms face you"]',
  'chin-up proper form',
  NULL, NULL,
  '["pull_v"]', '["biceps","lats","upper_back"]', '["forearms","core","delt_p","rhomboids"]',
  '["pullup"]', '["hang"]', '["shoulder","elbow"]',
  '["str"]', '["sag"]', '[]',
  4, 2, 4, 3, 1, 3, 1,
  'rep', NULL, '[3,12]',
  0, 1, 0, 1, 1,
  '["Pull-Up","Banded Assisted Pull-Up"]',
  '[]',
  '["Banded Assisted Pull-Up","Inverted Row"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

-- Batch 15: Calves
-- Calf Raise, Single-Leg Calf Raise, Banded Calf Raise, Seated Calf Raise, Tibialis Raise

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
  'ed-099', 'Calf Raise',
  '["Standing Calf Raise","Heel Raise"]',
  '["Stand with feet hip-width apart on flat ground or with the balls of your feet on a step edge","Rise up onto your toes as high as possible, squeezing your calves at the top","Lower back down slowly — if on a step, let heels drop below the step for a full stretch","Repeat for all reps"]',
  '["Full range of motion — high squeeze at top","Controlled descent","Don''t bounce at the bottom"]',
  'standing calf raise bodyweight form',
  NULL, NULL,
  '["iso"]', '["calves"]', '[]',
  '["bw"]', '["stand"]', '["ankle"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 2, 2, 1, 1, 1,
  'rep', NULL, '[15,25]',
  0, 0, 0, 1, 1,
  '["Single-Leg Calf Raise","Banded Calf Raise"]',
  '["Single-Leg Calf Raise","Banded Calf Raise"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-100', 'Single-Leg Calf Raise',
  '["One-Leg Calf Raise"]',
  '["Stand on one foot on flat ground or on a step edge, holding something for balance","Rise up onto your toes as high as possible, squeezing the calf","Lower back down slowly — if on a step, let the heel drop below for a full stretch","Complete all reps on one side before switching"]',
  '["Full range of motion","Hold something for balance — focus on the calf","Controlled descent"]',
  'single leg calf raise form',
  NULL, NULL,
  '["iso"]', '["calves"]', '[]',
  '["bw"]', '["stand"]', '["ankle"]',
  '["str"]', '["sag"]', '[]',
  2, 1, 2, 2, 1, 1, 1,
  'rep', NULL, '[10,20]',
  1, 0, 0, 1, 1,
  '["Calf Raise","Banded Calf Raise"]',
  '[]',
  '["Calf Raise"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-101', 'Banded Calf Raise',
  '["Resistance Band Calf Raise"]',
  '["Stand on a band with the balls of your feet, holding the ends at your shoulders or sides","Rise up onto your toes as high as possible against the band resistance","Squeeze calves at the top","Lower back down slowly"]',
  '["Full extension at the top","Band adds resistance at peak contraction","Controlled descent"]',
  'resistance band calf raise form',
  NULL, NULL,
  '["iso"]', '["calves"]', '[]',
  '["band","bw"]', '["stand"]', '["ankle"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  2, 1, 2, 2, 1, 2, 1,
  'rep', NULL, '[12,20]',
  0, 0, 0, 1, 0,
  '["Calf Raise","Single-Leg Calf Raise"]',
  '["Single-Leg Calf Raise"]',
  '["Calf Raise"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-102', 'Seated Calf Raise',
  '["Seated Heel Raise"]',
  '["Sit on a chair or bench with feet flat on the floor, knees bent at 90 degrees","Place a weight or resistance on your knees for added load, or use bodyweight","Raise your heels as high as possible by pressing through the balls of your feet","Lower heels back to the floor slowly"]',
  '["Knees at 90 degrees","Full range of motion","Targets the soleus specifically"]',
  'seated calf raise bodyweight form',
  NULL, NULL,
  '["iso"]', '["calves"]', '[]',
  '["bw"]', '["sit"]', '["ankle"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 1, 1, 1, 1, 1,
  'rep', NULL, '[15,25]',
  0, 0, 0, 1, 1,
  '["Calf Raise"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-103', 'Tibialis Raise',
  '["Tib Raise","Toe Raise"]',
  '["Stand with your back against a wall and feet about a foot away from the base","Keeping heels on the ground, lift your toes and the balls of your feet as high as possible","Squeeze the front of your shins at the top","Lower toes back to the floor with control"]',
  '["Heels stay planted","Lift toes as high as possible","Wall support for balance"]',
  'tibialis raise exercise form',
  NULL, NULL,
  '["iso"]', '["calves"]', '[]',
  '["bw"]', '["stand"]', '["ankle"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 1, 1, 1, 1, 1,
  'rep', NULL, '[15,25]',
  0, 0, 0, 0, 0,
  '["Calf Raise"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

-- Batch 06: Hinge (new)
-- Banded Glute Bridge, Single-Leg Glute Bridge, Hip Thrust, Banded Romanian Deadlift, Banded Pull-Through, Nordic Curl

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
  'ed-045', 'Banded Glute Bridge',
  '["Resistance Band Glute Bridge","Band Hip Bridge"]',
  '["Lie on your back with knees bent and feet flat on the floor, hip-width apart","Place a resistance band just above your knees","Drive through your heels to lift hips toward the ceiling, pressing out against the band","Squeeze glutes hard at the top, then lower slowly"]',
  '["Press knees out against the band","Squeeze glutes at the top","Don''t hyperextend lower back"]',
  'banded glute bridge form',
  NULL, NULL,
  '["hinge"]', '["glutes","hams"]', '["core","abductors","erectors"]',
  '["band","bw"]', '["supine"]', '["lback"]',
  '["str"]', '["sag"]', '["anchor_none"]',
  2, 1, 2, 1, 1, 1, 1,
  'rep', NULL, '[12,20]',
  0, 1, 0, 0, 0,
  '["Glute Bridge","Hip Thrust"]',
  '["Hip Thrust","Single-Leg Glute Bridge"]',
  '["Glute Bridge"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-046', 'Single-Leg Glute Bridge',
  '["One-Leg Hip Bridge"]',
  '["Lie on your back with knees bent and feet flat on the floor","Extend one leg straight up toward the ceiling or straight out in line with your thigh","Drive through the heel of the grounded foot to lift hips","Squeeze glutes at the top, then lower slowly and repeat all reps before switching"]',
  '["Hips stay level — don''t let the free side drop","Full squeeze at the top","Control the descent"]',
  'single leg glute bridge form',
  NULL, NULL,
  '["hinge"]', '["glutes","hams"]', '["core","erectors"]',
  '["bw"]', '["supine"]', '["lback"]',
  '["str"]', '["sag"]', '[]',
  2, 2, 3, 1, 1, 1, 1,
  'rep', NULL, '[8,15]',
  1, 1, 0, 0, 1,
  '["Glute Bridge","Banded Glute Bridge"]',
  '["Hip Thrust"]',
  '["Glute Bridge"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-047', 'Hip Thrust',
  '["Elevated Glute Bridge"]',
  '["Sit on the floor with your upper back resting against a bench or sturdy elevated surface","Place feet flat on the floor about hip-width apart, knees bent at 90 degrees","Drive through your heels to lift hips until your torso is parallel to the floor","Squeeze glutes hard at the top, then lower hips back toward the floor with control"]',
  '["Upper back stays on the bench","Drive through heels","Full hip extension at the top — squeeze glutes"]',
  'hip thrust bodyweight form',
  NULL, NULL,
  '["hinge"]', '["glutes","hams"]', '["core","erectors","quads"]',
  '["bw","bench"]', '["supine"]', '["lback"]',
  '["str"]', '["sag"]', '[]',
  2, 1, 3, 1, 1, 1, 1,
  'rep', NULL, '[10,20]',
  0, 1, 0, 0, 1,
  '["Glute Bridge","Single-Leg Glute Bridge"]',
  '["Single-Leg Glute Bridge"]',
  '["Glute Bridge","Banded Glute Bridge"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-048', 'Banded Romanian Deadlift',
  '["Band RDL","Resistance Band RDL"]',
  '["Stand on a resistance band with feet hip-width apart, holding the other end with both hands","With a slight bend in the knees, hinge at the hips and push them back","Lower your torso until you feel a deep stretch in your hamstrings, keeping the band taut","Drive hips forward to return to standing, squeezing glutes at the top"]',
  '["Flat back — no rounding","Push hips back, not down","Feel the hamstring stretch"]',
  'resistance band romanian deadlift form',
  NULL, NULL,
  '["hinge"]', '["hams","glutes","erectors"]', '["core","upper_back"]',
  '["band","bw"]', '["stand"]', '["lback","hip"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  2, 2, 3, 2, 1, 2, 1,
  'rep', NULL, '[8,15]',
  0, 1, 0, 1, 0,
  '["Banded Good Morning","Single-Leg Romanian Deadlift"]',
  '["Single-Leg Romanian Deadlift"]',
  '["Banded Good Morning","Glute Bridge"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-049', 'Banded Pull-Through',
  '["Band Pull-Through","Cable Pull-Through"]',
  '["Anchor a band at a low point behind you","Straddle the band, facing away from the anchor, and grab it between your legs","Hinge at the hips, letting the band pull your hands back between your legs","Drive hips forward explosively to stand tall, squeezing glutes at the top"]',
  '["Hinge from hips, not waist","Arms stay straight — power comes from hips","Squeeze glutes at lockout"]',
  'banded pull through form',
  NULL, NULL,
  '["hinge"]', '["glutes","hams"]', '["core","erectors"]',
  '["band"]', '["stand"]', '["lback","hip"]',
  '["str"]', '["sag"]', '["anchor_low"]',
  2, 2, 3, 2, 2, 2, 1,
  'rep', NULL, '[10,15]',
  0, 1, 0, 1, 0,
  '["Banded Romanian Deadlift","Banded Good Morning"]',
  '["Banded Romanian Deadlift"]',
  '["Glute Bridge","Banded Good Morning"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-050', 'Nordic Curl',
  '["Nordic Hamstring Curl","Natural Glute Ham Raise"]',
  '["Kneel on a pad or mat with someone or something holding your ankles firmly","Cross arms over your chest or hold them in front","Slowly lower yourself toward the floor by extending at the knees, keeping hips extended","Control the descent as long as possible, catch yourself with your hands, then push back up and use your hamstrings to pull yourself to the starting position"]',
  '["Hips stay extended — don''t bend at the waist","Control the eccentric as long as possible","Use hands to catch, not to push up fully"]',
  'nordic curl progression tutorial',
  NULL, NULL,
  '["hinge"]', '["hams"]', '["glutes","core","calves"]',
  '["bw","mat"]', '["kneel"]', '["knee"]',
  '["str"]', '["sag"]', '[]',
  5, 3, 3, 1, 2, 1, 1,
  'rep', NULL, '[3,8]',
  0, 0, 0, 1, 0,
  '["Banded Romanian Deadlift","Single-Leg Romanian Deadlift"]',
  '[]',
  '["Banded Romanian Deadlift","Banded Good Morning"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

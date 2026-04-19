-- Batch 08: Glute Isolation
-- Banded Clamshell, Donkey Kick, Banded Fire Hydrant, Banded Kickback, Banded Hip Abduction, Banded Lateral Walk

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
  'ed-061', 'Banded Clamshell',
  '["Clamshell","Band Clamshell"]',
  '["Lie on your side with knees bent at about 45 degrees and a resistance band just above your knees","Keep your feet together and your hips stacked","Open your top knee as far as possible by rotating at the hip, like a clamshell opening","Lower slowly back to the starting position"]',
  '["Feet stay together","Hips stay stacked — don''t roll back","Controlled open and close"]',
  'banded clamshell exercise form',
  NULL, NULL,
  '["iso"]', '["glutes","abductors"]', '["hip_flex"]',
  '["band"]', '["lateral"]', '["hip"]',
  '["str"]', '["front"]', '["anchor_none"]',
  1, 1, 2, 1, 1, 1, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 0,
  '["Banded Fire Hydrant","Banded Hip Abduction"]',
  '["Banded Fire Hydrant","Banded Hip Abduction"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-062', 'Donkey Kick',
  '["Glute Kickback"]',
  '["Start on all fours with hands under shoulders and knees under hips","Keeping the knee bent at 90 degrees, lift one leg toward the ceiling","Press the sole of your foot upward until your thigh is parallel to the floor","Lower back to the starting position with control"]',
  '["Knee stays bent at 90 degrees","Don''t arch the lower back","Squeeze glute at the top"]',
  'donkey kick exercise form',
  NULL, NULL,
  '["iso"]', '["glutes"]', '["hams","core"]',
  '["bw"]', '["quadruped"]', '["lback"]',
  '["str"]', '["sag"]', '[]',
  1, 1, 2, 1, 1, 1, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 0,
  '["Banded Kickback","Glute Bridge"]',
  '["Banded Kickback"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-063', 'Banded Fire Hydrant',
  '["Band Fire Hydrant"]',
  '["Start on all fours with a resistance band just above your knees","Keeping the knee bent at 90 degrees, lift one knee out to the side","Raise until the thigh is roughly parallel to the floor or as high as hip mobility allows","Lower back to the starting position with control"]',
  '["Knee stays bent at 90 degrees","Hips stay level — don''t shift","Controlled lift and lower"]',
  'banded fire hydrant exercise form',
  NULL, NULL,
  '["iso"]', '["glutes","abductors"]', '["core","hip_flex"]',
  '["band","bw"]', '["quadruped"]', '["hip"]',
  '["str"]', '["front"]', '["anchor_none"]',
  1, 1, 2, 1, 1, 1, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 0,
  '["Banded Clamshell","Banded Hip Abduction"]',
  '["Banded Hip Abduction","Banded Lateral Walk"]',
  '["Banded Clamshell"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-064', 'Banded Kickback',
  '["Band Glute Kickback","Standing Band Kickback"]',
  '["Stand on a resistance band with one foot and loop the other end around the opposite ankle","Hold onto something sturdy for balance","Drive the banded leg straight back, squeezing the glute at full extension","Return slowly to the starting position"]',
  '["Keep torso upright — don''t lean forward excessively","Squeeze glute at full extension","Controlled return"]',
  'resistance band glute kickback form',
  NULL, NULL,
  '["iso"]', '["glutes"]', '["hams","core"]',
  '["band","bw"]', '["stand"]', '["hip","lback"]',
  '["str"]', '["sag"]', '["anchor_foot"]',
  1, 1, 2, 2, 1, 1, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 0,
  '["Donkey Kick","Glute Bridge"]',
  '["Banded Pull-Through"]',
  '["Donkey Kick"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-065', 'Banded Hip Abduction',
  '["Band Hip Abduction","Standing Band Abduction"]',
  '["Stand on one leg with a resistance band around both ankles","Hold onto something sturdy for balance","Lift the banded leg out to the side, keeping the leg straight","Lower slowly back to the starting position"]',
  '["Standing leg stays straight","Lift from the hip, not by leaning","Controlled lower"]',
  'banded hip abduction standing form',
  NULL, NULL,
  '["iso"]', '["abductors","glutes"]', '["core"]',
  '["band","bw"]', '["stand"]', '["hip"]',
  '["str"]', '["front"]', '["anchor_none"]',
  1, 1, 2, 2, 1, 1, 1,
  'rep', NULL, '[12,20]',
  1, 0, 0, 0, 0,
  '["Banded Clamshell","Banded Fire Hydrant"]',
  '["Banded Lateral Walk"]',
  '["Banded Clamshell"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-066', 'Banded Lateral Walk',
  '["Band Side Walk","Monster Walk"]',
  '["Place a resistance band around your ankles or just above your knees","Stand in a quarter-squat position with feet hip-width apart","Step laterally one direction, maintaining tension on the band throughout","Complete all steps in one direction, then reverse"]',
  '["Stay in a quarter squat — don''t stand up","Keep tension on the band at all times","Controlled, deliberate steps"]',
  'banded lateral walk form',
  NULL, NULL,
  '["gait"]', '["glutes","abductors"]', '["quads","core","adductors"]',
  '["band","bw"]', '["stand"]', '["hip","knee"]',
  '["str","warmup"]', '["front"]', '["anchor_none"]',
  2, 1, 3, 1, 2, 1, 1,
  'rep', NULL, '[10,20]',
  0, 1, 0, 0, 0,
  '["Banded Hip Abduction","Banded Fire Hydrant"]',
  '[]',
  '["Banded Hip Abduction","Banded Clamshell"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

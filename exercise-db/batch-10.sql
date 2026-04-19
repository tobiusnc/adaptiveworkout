-- Batch 10: Core Anti-Rotation
-- Banded Pallof Press, Banded Anti-Rotation Hold, Banded Pallof Overhead Press, Half-Kneeling Banded Pallof Press

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
  'ed-069', 'Banded Pallof Press',
  '["Pallof Press","Band Pallof Press"]',
  '["Anchor a band at chest height and stand perpendicular to the anchor point","Hold the band at your chest with both hands, feet shoulder-width apart","Press your hands straight out in front of your chest, resisting the band''s pull to rotate you","Return hands to your chest and repeat"]',
  '["Resist rotation — hips and shoulders stay square","Arms press straight out, not toward the anchor","Core braced throughout"]',
  'banded pallof press form',
  NULL, NULL,
  '["iso"]', '["core","obliques"]', '["delt_a","glutes"]',
  '["band"]', '["stand"]', '["lback"]',
  '["str","stab"]', '["trans"]', '["anchor_mid"]',
  2, 2, 2, 2, 1, 2, 1,
  'rep', NULL, '[8,15]',
  0, 0, 0, 0, 0,
  '["Banded Anti-Rotation Hold","Plank Shoulder Tap"]',
  '["Banded Pallof Overhead Press","Half-Kneeling Banded Pallof Press"]',
  '["Plank","Plank Shoulder Tap"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-070', 'Banded Anti-Rotation Hold',
  '["Pallof Hold","Band Anti-Rotation Hold"]',
  '["Anchor a band at chest height and stand perpendicular to the anchor point","Hold the band at your chest with both hands, feet shoulder-width apart","Press your hands straight out in front of your chest","Hold this extended position, resisting the band''s pull for the duration"]',
  '["Arms fully extended","Hips and shoulders stay square to the front","Breathe steadily — don''t hold your breath"]',
  'pallof hold anti rotation form',
  NULL, NULL,
  '["iso"]', '["core","obliques"]', '["delt_a","glutes"]',
  '["band"]', '["stand"]', '["lback"]',
  '["str","stab"]', '["trans"]', '["anchor_mid"]',
  2, 1, 2, 2, 1, 2, 1,
  'timed', '[15,30]', NULL,
  0, 0, 0, 0, 0,
  '["Banded Pallof Press","Plank"]',
  '["Banded Pallof Press","Banded Pallof Overhead Press"]',
  '["Plank"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-071', 'Banded Pallof Overhead Press',
  '["Pallof Overhead Press"]',
  '["Set up in the same position as a Banded Pallof Press with hands extended at chest height","From the extended position, press your hands overhead while maintaining resistance against rotation","Lower hands back to chest height with control","Repeat for all reps"]',
  '["Resist rotation throughout — especially during the overhead press","Core braced — no arching","Controlled press and return"]',
  'pallof press overhead variation',
  NULL, NULL,
  '["iso"]', '["core","obliques"]', '["delt_a","traps","glutes"]',
  '["band"]', '["stand"]', '["lback","shoulder"]',
  '["str","stab"]', '["trans","sag"]', '["anchor_mid"]',
  3, 3, 2, 3, 1, 2, 1,
  'rep', NULL, '[6,12]',
  0, 0, 0, 0, 0,
  '["Banded Pallof Press","Banded Woodchop"]',
  '[]',
  '["Banded Pallof Press","Banded Anti-Rotation Hold"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-072', 'Half-Kneeling Banded Pallof Press',
  '["Half-Kneeling Pallof Press"]',
  '["Anchor a band at chest height and kneel perpendicular to the anchor with the inside knee down","Hold the band at your chest with both hands","Press your hands straight out in front, resisting the band''s rotational pull","Return hands to your chest and repeat; switch sides after completing all reps"]',
  '["Inside knee is down — this increases the anti-rotation demand","Hips stay square","Tall posture — don''t lean"]',
  'half kneeling pallof press form',
  NULL, NULL,
  '["iso"]', '["core","obliques"]', '["glutes","hip_flex"]',
  '["band"]', '["kneel"]', '["lback","knee"]',
  '["str","stab"]', '["trans"]', '["anchor_mid"]',
  2, 2, 2, 2, 1, 2, 1,
  'rep', NULL, '[8,12]',
  0, 0, 0, 0, 0,
  '["Banded Pallof Press","Banded Anti-Rotation Hold"]',
  '["Banded Pallof Overhead Press"]',
  '["Banded Anti-Rotation Hold"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

-- Batch 17: Warmup / Dynamic
-- Arm Circles, Leg Swings, Hip Circles, Inchworm, A-Skip, Bear Crawl

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
  'ed-112', 'Arm Circles',
  '["Shoulder Circles"]',
  '["Stand with feet shoulder-width apart and extend your arms straight out to the sides at shoulder height","Make small forward circles with both arms simultaneously","Gradually increase the circle size","After half the reps or time, reverse direction to backward circles"]',
  '["Arms stay at shoulder height","Start small, go bigger","Keep core engaged and don''t sway"]',
  'arm circles warmup exercise',
  NULL, NULL,
  '["iso"]', '["delt_l","delt_a"]', '["traps","upper_back"]',
  '["bw"]', '["stand"]', '["shoulder"]',
  '["warmup","mob"]', '["sag","front"]', '[]',
  1, 1, 2, 2, 1, 1, 1,
  'timed', '[20,45]', NULL,
  0, 0, 0, 0, 0,
  '["Leg Swings","Hip Circles"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-113', 'Leg Swings',
  '["Leg Pendulum","Standing Leg Swing"]',
  '["Stand on one leg, holding a wall or chair for balance","Swing the free leg forward and backward in a controlled arc, keeping it straight","After the prescribed reps or time, switch to side-to-side swings (across and away from your body)","Switch legs and repeat"]',
  '["Controlled swing — don''t use momentum","Stand tall, don''t lean","Increase range gradually"]',
  'leg swings warmup exercise',
  NULL, NULL,
  '["iso"]', '["hip_flex","hams","glutes"]', '["adductors","abductors","core"]',
  '["bw"]', '["stand"]', '["hip"]',
  '["warmup","mob"]', '["sag","front"]', '[]',
  1, 1, 2, 2, 2, 1, 1,
  'timed', '[20,40]', NULL,
  1, 0, 0, 1, 0,
  '["Hip Circles","Arm Circles"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-114', 'Hip Circles',
  '["Hip CARs","Standing Hip Circles"]',
  '["Stand on one leg, holding something for balance if needed","Lift the free knee up in front of you to hip height","Rotate the knee out to the side and then behind you in a large circle","Reverse the direction after completing the prescribed reps; switch legs"]',
  '["Large, controlled circles","Keep your torso still — movement is from the hip","Go slowly through any sticky points"]',
  'hip circles warmup exercise CARs',
  NULL, NULL,
  '["iso"]', '["hip_flex","glutes"]', '["adductors","abductors","core"]',
  '["bw"]', '["stand"]', '["hip"]',
  '["warmup","mob"]', '["trans","sag","front"]', '[]',
  1, 2, 2, 2, 1, 1, 1,
  'timed', '[20,40]', NULL,
  1, 0, 0, 0, 0,
  '["Leg Swings"]',
  '[]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-115', 'Inchworm',
  '["Walk Out","Inchworm Walk"]',
  '["Stand with feet hip-width apart","Hinge at the hips and place your hands on the floor in front of you (bend knees slightly if needed)","Walk your hands forward until you are in a plank position","Walk your hands back toward your feet and stand up"]',
  '["Keep legs as straight as possible","Engage core in the plank position","Controlled pace — don''t rush"]',
  'inchworm exercise warmup form',
  NULL, NULL,
  '["push_h","hinge"]', '["core","hams","delt_a"]', '["chest","triceps","glutes"]',
  '["bw"]', '["stand"]', '["wrist","shoulder"]',
  '["warmup","mob"]', '["sag"]', '[]',
  2, 2, 3, 2, 3, 1, 1,
  'rep', NULL, '[5,10]',
  0, 1, 0, 1, 0,
  '["Bear Crawl","Mountain Climber"]',
  '["Bear Crawl"]',
  '[]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-116', 'A-Skip',
  '["Power Skip","Skipping"]',
  '["Start standing with feet together","Skip forward by driving one knee up high while hopping off the opposite foot","Pump the opposite arm as the knee drives up","Alternate legs with each skip, moving forward"]',
  '["Drive knee to hip height","Stay on the balls of your feet","Rhythmic, coordinated movement"]',
  'a-skip exercise warmup form',
  NULL, NULL,
  '["plyo","gait"]', '["hip_flex","calves","quads"]', '["glutes","core"]',
  '["bw"]', '["stand"]', '["knee","ankle"]',
  '["warmup","plyo"]', '["sag"]', '[]',
  2, 2, 4, 2, 3, 1, 2,
  'timed', '[20,40]', NULL,
  1, 1, 1, 0, 0,
  '["High Knees","Butt Kicks"]',
  '["High Knees"]',
  '["Jumping Jack"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
),

(
  'ed-117', 'Bear Crawl',
  '["Bear Walk"]',
  '["Start on all fours with knees hovering just above the floor, hands under shoulders and knees under hips","Move forward by stepping the opposite hand and foot at the same time (right hand + left foot)","Keep your hips low and back flat — don''t let hips rise","Continue crawling forward for the prescribed distance or time"]',
  '["Knees hover 1-2 inches off the floor","Opposite hand and foot move together","Keep hips level — don''t let them sway"]',
  'bear crawl exercise form',
  NULL, NULL,
  '["carry"]', '["core","delt_a","quads"]', '["triceps","hip_flex","glutes"]',
  '["bw"]', '["quadruped"]', '["wrist","shoulder"]',
  '["warmup","stab"]', '["sag"]', '[]',
  2, 3, 4, 1, 3, 1, 1,
  'timed', '[15,40]', NULL,
  0, 1, 0, 0, 0,
  '["Inchworm","Mountain Climber"]',
  '[]',
  '["Inchworm"]',
  '2026-04-14T00:00:00Z', '2026-04-14T00:00:00Z'
);

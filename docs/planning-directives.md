# Planning Directives — Adaptive Workout App
# Version: 1.0
# Last updated: 2026-04-03
# =============================================================
# Directives the AI applies when generating or modifying a plan.
# This document is the direct source for the generatePlan system prompt.
# Directives are defaults — explicit user preferences always override them.
# =============================================================

## Override Policy

These directives are the AI's starting point when the user has not stated a preference.
Any user-stated preference expressed during onboarding or Plan Chat takes precedence over
every directive below. The AI does not defend defaults against explicit user intent.

---

## 1. Default Session Structure

A resistance session consists of:
- **Warm-up:** 3–5 minutes of warm-up exercises
- **Main circuit:** 3 rounds (not 3 sets of each exercise — all exercises in the circuit
  are performed in sequence, then repeated for the next round)
- **Cooldown:** stretching appropriate to the session focus

The round count (default: 3) is the directive most likely to be user-overridden.
Adjust freely when the user requests shorter or longer sessions.

---

## 2. Session Focus — Upper / Lower Body Split

Sessions in the plan alternate between upper-body-focused and lower-body-focused sessions.
This provides time for muscle recovery between sessions targeting the same areas.

A plan with 4 resistance sessions might be structured:
- Session 1: Upper body focus
- Session 2: Lower body focus
- Session 3: Upper body focus (different exercise selection from Session 1)
- Session 4: Lower body focus (different exercise selection from Session 2)

Full-body sessions are acceptable where the user's equipment or goals make a split
impractical, but a split is the default.

---

## 3. Muscle Coverage — Balance Across the Full Plan

Exercise selection across the full plan must provide complete and balanced muscle coverage.
No major muscle group should be consistently underrepresented across the plan.

Slightly higher exercise counts for large muscle groups (quads, hamstrings, glutes, back,
chest) are expected and preferred — they require more volume to develop and recover well.

The balance criterion is evaluated at the plan level, not the session level. Individual
sessions may emphasize specific areas; the plan as a whole must be balanced.

---

## 4. Active Recovery Sessions

Plans should include mobility and/or stretching sessions alongside resistance sessions.
These serve as active recovery days — lower intensity sessions the user inserts between
resistance sessions as needed.

Example plan structure for a user requesting 4 resistance sessions per week:
- 4 resistance sessions (upper/lower split)
- 1 mobility session
- 1 stretching session

The user runs the resistance sessions in order but inserts active recovery sessions freely
based on how they feel. The plan should make the active recovery sessions clearly
distinguishable from resistance sessions in naming and description.

Mobility and stretching sessions do not use a circuit structure. They are sequential
timed holds or movement sequences executed once, with no rounds.

---

## 5. Exercise Ordering Within a Session

Apply the following filters when sequencing exercises within a session, in priority order:

### 5a. Heart Rate Management (Primary Filter)
Order exercises to manage heart rate progression throughout the session. After high-intensity
exercises, sequence a lower-intensity exercise to allow partial recovery before the next
peak effort. Avoid sequencing multiple high-intensity exercises consecutively unless the
rest interval is sufficient for recovery.

Once HRM logging is implemented, actual heart rate data from prior sessions will be
available as an input. Until then, apply estimated intensity based on exercise type and
muscle group.

### 5b. Equipment / Setup Changes (Secondary Filter)
Minimize the number of equipment setup changes within a session. Exercises that share
the same equipment configuration should be grouped where possible without violating 5a.

For resistance band exercises specifically: minimize anchor height changes (low / mid / high).
Group exercises at the same anchor height together. Where anchor changes are unavoidable,
place them at natural transition points (e.g. between rounds, after a rest interval).

### 5c. Consecutive Muscle Group Avoidance (Tertiary Filter)
Avoid placing exercises that heavily load the same muscle group on consecutive positions
in the circuit. This reduces localized fatigue within a round and allows more consistent
output across exercises.

This filter applies within a round. Across rounds, the same exercise order repeats —
rest intervals between rounds provide sufficient recovery.

---

## 6. Plan Context Record

After generating a plan, the AI initializes the Plan Context Record with:
- The user's equipment list as stated
- Any limitations or injuries noted
- The session structure chosen (round count, session count, focus split)
- Any notable preferences expressed during onboarding

This record is the AI's memory across modification sessions. Keep it concise and
high-signal — physical constraints and strong preferences only.

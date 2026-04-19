# updateUserContext — Prompt Test Cases
# Version: 1
# Purpose: Manual evaluation via Claude.ai Pro.
# =============================================================
# HOW TO USE
# 1. Open Claude.ai Pro. Start a new conversation.
# 2. Paste the full content of src/ai/prompts/updateUserContext.ts
#    (the string value only, not the TypeScript wrapper) as the system prompt.
# 3. For each test: paste the INPUT block as a user message.
# 4. Compare the model's output to EXPECT.
# 5. Note any misses in the NOTES column for prompt iteration.
#
# Tests are grouped as a narrative journey (state carries forward) plus
# isolated edge-case scenarios.
#
# EVALUATION CRITERIA
# Pass:  All EXPECT fields match; extractionSummary mentions the source phrase.
# Partial: Core fields correct; minor phrasing or secondary field missed.
# Fail:  Wrong field value, hallucinated extraction, or missed clear signal.
# =============================================================

---

## BASELINE — Empty context (copy-paste this to start every journey test)

```json
{
  "id": "ucr-test-001",
  "schemaVersion": 1,
  "userId": null,
  "primaryGoal": "general_fitness",
  "equipment": [],
  "sessionsPerWeek": 3,
  "targetDuration": "30-45",
  "fitnessLevel": "beginner",
  "jointLimitations": [],
  "movementLimitations": [],
  "limitationsNotes": [],
  "preferredExercises": [],
  "preferredMovements": [],
  "preferredEquipment": [],
  "dislikedExercises": [],
  "dislikedMovements": [],
  "prefHigherReps": null,
  "prefLongerRest": null,
  "prefMoreVariety": null,
  "prefHigherIntensity": null,
  "prefLongerSessions": null,
  "prefMoreRounds": null,
  "prefCompoundFocus": null,
  "spaceConstraint": null,
  "noiseConstraint": null,
  "additionalDirections": [],
  "updatedAt": "2026-04-18T10:00:00Z",
  "updatedByModel": "claude-haiku-4-5-20251001"
}
```

---

## JOURNEY — Simulated user progression (run in order; each builds on prior state)

---

### T-01 — Onboarding: clean structured answers

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "onboarding",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "My goal is general fitness. I have resistance bands and a pull-up bar. I want to train 3 days a week, sessions around 30–45 minutes. I'd say I'm intermediate fitness. No injuries right now. I live in an apartment — downstairs neighbours, so nothing too loud or jumpy. I'd like to end every session with a short hip stretch."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| primaryGoal | "general_fitness" |
| equipment | ["band","pullup"] |
| sessionsPerWeek | 3 |
| targetDuration | "30-45" |
| fitnessLevel | "intermediate" |
| jointLimitations | [] |
| movementLimitations | ["plyo"] |
| noiseConstraint | 1 |
| spaceConstraint | 2 (apartment, small space implied) |
| additionalDirections | ["User wants to end every session with a short hip stretch."] |
| extractionSummary | mentions "downstairs neighbours", "nothing too loud", "hip stretch" |

---

### T-02 — Onboarding: mixed free text with preferences

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "onboarding",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "Goal: hypertrophy. Equipment: dumbbells, bench, resistance bands, bodyweight. 4 days per week, 45–60 minutes. I've been lifting for 3 years — experienced. I had a shoulder impingement last year, mostly healed but I want to be careful with overhead pressing. No jumping — I train in a shared building. I'd love to keep things varied, I get bored doing the same exercises every week."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| primaryGoal | "hypertrophy" |
| equipment | contains "db","bench","band","bw" |
| sessionsPerWeek | 4 |
| targetDuration | "45-60" |
| fitnessLevel | "experienced" |
| jointLimitations | ["shoulder"] |
| movementLimitations | ["push_v","plyo"] |
| limitationsNotes | contains a note about overhead pressing / shoulder impingement nuance |
| prefMoreVariety | 2 |
| noiseConstraint | 1 or 2 |
| extractionSummary | mentions "shoulder impingement", "overhead pressing", "bored", "varied" |

---

### T-03 — Post-session feedback: clear negative intensity signal
(Continue from T-01 state)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <state after T-01>,
  "rawInput": "That was way too hard. I could barely finish the last round and I felt sick after. This is too much for me right now."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| prefHigherIntensity | -2 |
| All other fields | unchanged from T-01 |
| extractionSummary | mentions "way too hard", "could barely finish", maps to prefHigherIntensity -2 |

---

### T-04 — Post-session feedback: positive signal + new joint concern
(Continue from T-03 state)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session B — Upper Body (completed)",
  "currentContext": <state after T-03>,
  "rawInput": "Loved the band rows today, those felt great. Knee was a bit achy during the lunges though — not terrible but worth noting."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| preferredExercises | contains "band rows" (or similar) |
| jointLimitations | ["knee"] |
| limitationsNotes | contains a note about knee during lunges — mild, not severe |
| prefHigherIntensity | -2 (unchanged from T-03) |
| extractionSummary | mentions "band rows", "knee", "achy during lunges" |

**TRICKY**: The knee signal is mild ("a bit achy", "not terrible"). The prompt should add it to jointLimitations since it's exercise-related joint discomfort, but limitationsNotes should capture the mild qualifier. If the model skips jointLimitations entirely due to the mild language, that's a partial miss.

---

### T-05 — Plan chat: pure modification request (no signal)
(Continue from T-04 state)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <state after T-04>,
  "rawInput": "Can you replace the lunges in Session B with something else?"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged from T-04 |
| extractionSummary | "No preference signals detected. Message was a plan modification request with no stated preferences." (or equivalent) |

**THIS IS A CRITICAL CASE.** The model must not extract anything here. Replacing lunges is a task for the plan AI, not a preference signal.

---

### T-06 — Plan chat: modification request WITH embedded preference
(Continue from T-04 state)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <state after T-04>,
  "rawInput": "Can you replace the lunges? My knee really can't handle them. Also the rest periods feel too short — I need more time to recover between sets."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["knee"] (already present; confirm not duplicated) |
| movementLimitations | ["plyo","lunge"] |
| prefLongerRest | 1 or 2 |
| extractionSummary | mentions "knee can't handle" lunges → movementLimitations; "rest periods feel too short" → prefLongerRest |

**NOTE**: The "replace the lunges" part is a modification request. The "knee really can't handle them" part IS a preference/constraint signal. Both should be handled correctly. The lunge movement code is "lunge".

---

### T-07 — Plan chat: preference reversal
(Continue from T-06 state — prefHigherIntensity is -2)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <state after T-06>,
  "rawInput": "I've been at this a few weeks now and I feel like I've adapted. I want to make things harder — I'm not being challenged enough anymore."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| prefHigherIntensity | 1 or 2 (reversed from -2) |
| extractionSummary | notes the reversal from prior value; mentions "not being challenged enough" |

---

### T-08 — Plan chat: equipment update
(Continue from T-07 state)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <state after T-07>,
  "rawInput": "Just ordered a TRX, it arrived today. Can we work some TRX exercises into the plan?"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| equipment | previous list + "trx" |
| preferredEquipment | contains "trx" |
| extractionSummary | mentions "Just ordered a TRX" → equipment and preferredEquipment |

---

### T-09 — Feedback: no signal (pure positive, nothing actionable)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <state after T-08>,
  "rawInput": "Good session, felt good."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected." (or equivalent) |

---

### T-10 — Feedback: injury resolution
(Continue from T-09 state — "knee" is in jointLimitations)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session C — Lower Body (completed)",
  "currentContext": <state after T-09>,
  "rawInput": "Did all the lower body work fine today, knee felt completely fine. I think that issue has totally resolved."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | [] (knee removed) |
| limitationsNotes | new entry noting removal and reason |
| extractionSummary | mentions "knee felt completely fine", "totally resolved" → removed from jointLimitations |

**TRICKY**: The model should be confident enough to remove "knee" given the explicit "completely fine" and "totally resolved" language. Hedging ("I think it's better") should NOT be enough to remove a limitation.

---

## ISOLATED EDGE CASES

---

### E-01 — Safety valve: clear unmappable preference

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I always like to have at least one pulling exercise per session. It's just something I need in every workout."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| preferredMovements | ["pull_h","pull_v"] OR additionalDirections captures the "at least one per session" constraint |
| additionalDirections | contains something like "User wants at least one pulling exercise in every session." |
| extractionSummary | explains the split: movement preference vs. structural constraint |

**NOTE**: The preference for pulling is capturable in preferredMovements. But "at least one per session" is a structural constraint that preferredMovements cannot express — that nuance should go to additionalDirections.

---

### E-02 — Ambiguous pronoun reference

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "Less of that."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. Message contains an ambiguous reference with no identifiable subject." |

---

### E-03 — Vague intensity comment in feedback (should NOT trigger prefHigherIntensity)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "It was a bit challenging today."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. 'A bit challenging' is situational and does not constitute a preference for reduced intensity." |

**NOTE**: This is important. Single-session situational comments should not update PreferenceLevel fields. The model should require either repeated signals or explicit preference language ("I want it to be easier").

---

### E-04 — Multiple signals in one message

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session B — Upper Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "Shoulder was killing me on the overhead press, I don't think I can do overhead movements anymore. Also the session was great otherwise — loved the face pulls and I'd love more pulling work in general. The rest between sets felt a bit long honestly."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["shoulder"] |
| movementLimitations | ["push_v"] |
| limitationsNotes | note about overhead press and shoulder |
| preferredExercises | contains "face pulls" |
| preferredMovements | contains "pull_h" or "pull_v" |
| prefLongerRest | -1 |
| extractionSummary | covers all 4 signals with source phrases |

---

### E-05 — Profile edit: explicit goal change

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "profileEdit",
  "sessionContext": null,
  "currentContext": <BASELINE with primaryGoal: "general_fitness">,
  "rawInput": "Changing my goal to strength. I want to get stronger, not just fit."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| primaryGoal | "strength" |
| extractionSummary | mentions goal change from general_fitness to strength |

---

### E-06 — Contradiction: disliked exercise becomes preferred

**INPUT (setup)**: First run a planChat that adds "burpees" to dislikedExercises.
Then run this:

```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <context with "burpees" in dislikedExercises>,
  "rawInput": "Actually I've changed my mind about burpees — I've been practising and I like them now."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| dislikedExercises | "burpees" removed |
| preferredExercises | "burpees" added |
| extractionSummary | notes the reversal explicitly |

---

### E-07 — Environment constraint from context clues (not explicit)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "onboarding",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I live in a small studio apartment in a building with thin walls and floors. I work out in the morning before my neighbours are awake so I need to be quiet. Goal is general fitness, bodyweight only, 3 days a week, 20–30 minutes, beginner."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| noiseConstraint | 1 |
| spaceConstraint | 2 (small studio) |
| movementLimitations | ["plyo"] (implied by noise constraint + morning timing) |
| equipment | ["bw"] |
| targetDuration | "20-30" |
| fitnessLevel | "beginner" |
| extractionSummary | mentions "thin walls and floors", "quiet", morning context |

**NOTE**: "plyo" in movementLimitations is an inference from the noise constraint context. This is borderline — the model might add it or might leave it to the plan AI to filter via noiseConstraint. Either is acceptable; note which behaviour you observe.

---

### E-08 — Onboarding with nuanced limitation

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "onboarding",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "My knee is actually fine for most things — I can do lunges, squats, all of that. But I can't do any high-impact stuff like jumping. It's not painful exactly, it just feels unstable under impact."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["knee"] |
| movementLimitations | ["plyo"] |
| limitationsNotes | contains a note that the knee is fine for squats/lunges but not for impact — unstable, not painful |
| extractionSummary | distinguishes between impact vs. other movement; quotes "fine for lunges, squats" and "unstable under impact" |

---

### E-09 — Equipment removal

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with equipment: ["band","pullup","db"]>,
  "rawInput": "I sold my pull-up bar last week. Can we redo the plan without it?"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| equipment | ["band","db"] — "pullup" removed |
| ALL other fields | unchanged |
| extractionSummary | mentions "sold my pull-up bar" → removed "pullup" from equipment. Notes that "redo the plan" is a modification request, not a preference signal. |

**NOTE**: The "redo the plan" part is a modification request — no additional extraction. Only the equipment state change should be captured.

---

### E-10 — targetDuration change (compound rule)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with targetDuration: "45-60", prefLongerSessions: null>,
  "rawInput": "I don't have as much time anymore, sessions are too long. Can we bring them down?"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| targetDuration | "30-45" (one step down from "45-60") |
| prefLongerSessions | -1 or -2 |
| extractionSummary | mentions "sessions are too long" → targetDuration shifted down, prefLongerSessions set negative |

**NOTE**: The system prompt specifies "I want shorter sessions" → move down one step AND set prefLongerSessions. Both fields must update together. "Can we bring them down" is a preference signal, not just a modification request.

---

### E-11 — Append-only violation attempt (additionalDirections)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with additionalDirections: ["User wants to end every session with a short hip stretch."]>,
  "rawInput": "Actually, forget the hip stretch at the end. I don't need that anymore."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| additionalDirections | ["User wants to end every session with a short hip stretch."] — UNCHANGED |
| extractionSummary | "No preference signals detected." OR notes that the request to remove an additional direction cannot be honored (append-only). |

**NOTE**: This is a CRITICAL structural rule. The model must NOT remove from additionalDirections. The prompt says "Never remove or edit existing entries." A well-behaved model might note the conflict in the extractionSummary but must not modify the array.

---

### E-12 — Question = no signal

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "What's a Bulgarian split squat? Is that the same as a lunge?"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. Message was a question about an exercise with no stated preferences." |

**NOTE**: Questions must never be interpreted as preference signals. The user mentioning "split squat" and "lunge" should not trigger any movement or exercise preference updates.

---

### E-13 — One-time soreness ≠ injury

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "My shoulders are really sore today after all those push-ups yesterday. Like proper DOMS."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. Soreness/DOMS is post-exercise muscle fatigue, not an injury or recurring joint issue." |

**NOTE**: The system prompt explicitly says: "One-time soreness ('I was sore after') does NOT warrant adding a joint limitation." The user even labels it as DOMS, confirming it's normal muscle soreness. This MUST NOT add "shoulder" to jointLimitations.

---

### E-14 — Dual-field movement + joint from one sentence

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session C — Lower Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "Squats are killing my knees. I don't think I can keep doing them."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["knee"] |
| movementLimitations | ["squat"] |
| extractionSummary | mentions "squats are killing my knees" → added "squat" to movementLimitations and "knee" to jointLimitations |

**NOTE**: The system prompt has an explicit rule: "Squats hurt my knees" → add "squat" to movementLimitations AND "knee" to jointLimitations. Both fields must update from one sentence.

---

### E-15 — prefCompoundFocus (isolation preference)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I want more isolation work in my plan — things like curls, lateral raises, tricep extensions. I really like targeting individual muscles."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| prefCompoundFocus | -2 (strong preference for isolation over compound) |
| extractionSummary | mentions "more isolation work", "targeting individual muscles" → prefCompoundFocus set to -2 |

---

### E-16 — Environment constraint reset

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with noiseConstraint: 1, spaceConstraint: 2, movementLimitations: ["plyo"]>,
  "rawInput": "I just moved into a house with a garage gym — plenty of space, no neighbours to worry about. I can jump, drop weights, whatever I want."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| noiseConstraint | null (reset) |
| spaceConstraint | null (reset — "plenty of space") |
| movementLimitations | [] — "plyo" removed (noise was the reason for it) |
| extractionSummary | mentions "garage gym", "no neighbours", "can jump" → reset constraints, removed plyo limitation |

**NOTE**: This tests removal / reset of environment constraints. The "plyo" in movementLimitations was noise-driven — removing the noise constraint should also remove the movement limitation if the user explicitly says they can jump now.

---

### E-17 — Minimal input (no signal)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "ok"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. Message was a minimal acknowledgment with no extractable preferences." |

---

### E-18 — Fitness level progression (mid-journey)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with fitnessLevel: "beginner">,
  "rawInput": "I've been doing this for a few months now and I feel like I've gotten a lot stronger. The beginner exercises feel too easy — I'm ready for intermediate stuff."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| fitnessLevel | "intermediate" |
| extractionSummary | mentions "beginner exercises feel too easy", "ready for intermediate" → updated fitnessLevel |

**NOTE**: The system prompt says "I feel like I've gotten a lot stronger, the beginner stuff feels easy" → "intermediate". But it also says "Do NOT infer progression from a single 'too easy' comment alone." Here the user explicitly names the target level ("intermediate"), which is a clear signal.

---

### E-19 — Fitness level: single "too easy" (should NOT change)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <BASELINE with fitnessLevel: "beginner">,
  "rawInput": "That felt pretty easy today."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged (fitnessLevel stays "beginner") |
| extractionSummary | "No preference signals detected. A single 'easy' comment does not warrant a fitness level change." |

**NOTE**: This is the negative counterpart to E-18. One "too easy" comment could be situational — maybe the session was lighter than usual. The prompt explicitly prohibits inferring progression from a single comment.

---

## ADDITIONAL EDGE CASES (E-20 to E-39)

---

### E-20 — Contradictory signals (injury overrides stated preference)

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session B — Lower Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "I love squats but squats are killing my knees. I don't think I can keep doing them."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["knee"] |
| movementLimitations | ["squat"] |
| preferredExercises | [] (NOT added; constraint overrides preference) |
| extractionSummary | mentions "squats killing knees" → constraint added; preference signal suppressed by injury concern |

**TRICKY**: Injury/constraint signals should win over stated exercise preferences. The user can't do squats safely, so the preference is irrelevant.

---

### E-21 — Ambiguous equipment reference

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I just got some weights for home."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. Equipment reference is ambiguous ('weights' could be dumbbells, kettlebells, barbells, or cables); requires clarification." |

**NOTE**: "Weights" is ambiguous. Per the "never infer" rule, the model should not guess which type.

---

### E-22 — Equipment removal from empty state

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I don't have a TRX anymore."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. User mentions not having TRX, but it was not in the equipment list to begin with." |

---

### E-23 — Weak opposite signal overrides strong prior preference

**INPUT (setup)**: prefHigherIntensity: 2
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <BASELINE with prefHigherIntensity: 2>,
  "rawInput": "That was a bit much today. I'm fatigued."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| prefHigherIntensity | -1 (changed from 2) |
| extractionSummary | mentions "a bit much" → prefHigherIntensity changed to -1; notes potential reversal in preference |

**NOTE**: Per rule "When a PreferenceLevel field already has a value and the user expresses a DIFFERENT preference, update to the newly expressed level". Weak signal (-1) overrides strong prior (2).

---

### E-24 — Target duration at lower boundary

**INPUT (setup)**: targetDuration: "20-30"
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with targetDuration: "20-30">,
  "rawInput": "I want shorter sessions than this."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| targetDuration | "20-30" (unchanged; already at minimum) |
| prefLongerSessions | -1 (extracted from "want shorter") |
| extractionSummary | notes desire for shorter sessions; duration cannot be reduced below minimum |

**NOTE**: The preference signal is captured (prefLongerSessions) even though the duration field cannot move.

---

### E-25 — Target duration at upper boundary

**INPUT (setup)**: targetDuration: "60+"
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with targetDuration: "60+">,
  "rawInput": "I'd love even longer sessions if possible."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| targetDuration | "60+" (unchanged; already at maximum) |
| prefLongerSessions | 2 (extracted from "love...longer") |
| extractionSummary | notes desire for longer sessions; duration already at maximum |

---

### E-26 — Untested joint and movement codes

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session B — Upper Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "My elbow is sore from the overhead press. Also my neck has been feeling tight. Rotation movements bother me."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["elbow", "neck"] |
| movementLimitations | ["rotation"] |
| limitationsNotes | contains notes about elbow soreness and neck tightness |
| extractionSummary | mentions all three codes (elbow, neck, rotation) |

**NOTE**: Tests coverage of valid codes not yet exercised in prior tests.

---

### E-27 — Untested equipment codes

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "Just got a cable machine for my garage. Also picked up a medicine ball."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| equipment | includes "cable", "ball" |
| extractionSummary | mentions both acquisitions |

---

### E-28 — Multiple contradictions stacked

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I hate burpees. Actually, I've been practicing and I like them now. Wait, never mind, they're terrible — I'm done with them."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| dislikedExercises | ["burpees"] |
| preferredExercises | [] (not added) |
| extractionSummary | notes multiple reversals; last statement wins ("they're terrible") |

**NOTE**: Last signal takes precedence. burpees → disliked (final state).

---

### E-29 — Preference signal embedded in modification request

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "Replace the rows with something easier because my back is sore from them."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| jointLimitations | ["lback"] (added from "back is sore") |
| preferredExercises | [] (rows not added as preferred) |
| extractionSummary | mentions "back sore" → added to jointLimitations; "replace rows" is a modification request, not a preference |

---

### E-30 — Session context null in feedback

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "That was hard."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. 'That was hard' is situational; lacks clear preference signal." |

**NOTE**: Session context is informational only. Extraction proceeds normally. "Hard" alone is not a preference signal.

---

### E-31 — Very long additionalDirections entry

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I need to warm up for at least 10 minutes before every session because I have anterior shoulder tightness. It feels so much better if I do band pull-aparts and some arm circles and light stretching beforehand."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| additionalDirections | ["User needs 10-minute warm-up before every session: anterior shoulder tightness improved by band pull-aparts, arm circles, and light stretching."] |
| extractionSummary | mentions appending the long direction |

**NOTE**: Full text appended as single actionable entry; not split into multiple entries.

---

### E-32 — Exercise name case sensitivity

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "I love push-ups. Also pushups are great. And PUSH-UPS are my favorite."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| preferredExercises | ["push-ups"] (deduplicated; case variations treated as same exercise) |
| extractionSummary | mentions "push-ups" preference (single entry, not three) |

**NOTE**: Though the prompt says "as stated by user", common sense deduplication applies to variations of the same exercise name.

---

### E-33 — Repeated identical preference in one message

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session B — Upper Body (completed)",
  "currentContext": <BASELINE>,
  "rawInput": "I loved the rows today. The rows were fantastic. Rows are my favorite exercise."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| preferredExercises | ["rows"] (deduplicated; appears once in array) |
| extractionSummary | mentions preference for rows (single entry) |

---

### E-34 — Movement code preference vs equipment constraint

**INPUT (setup)**: equipment: ["band", "db"]
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with equipment: ["band", "db"]>,
  "rawInput": "I'd love more pulling work in my sessions but I don't have a pull-up bar anymore."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| preferredMovements | ["pull_h", "pull_v"] (added from "love more pulling work") |
| equipment | ["band", "db"] (pullup already absent; no change) |
| extractionSummary | captures both the preference and the equipment constraint separately |

---

### E-35 — Fitness level at experienced; beginner feeling easy

**INPUT (setup)**: fitnessLevel: "experienced"
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session A — Full Body (completed)",
  "currentContext": <BASELINE with fitnessLevel: "experienced">,
  "rawInput": "Today's workout was mostly beginner exercises and they felt very easy for me."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| fitnessLevel | "experienced" (unchanged) |
| ALL other fields | unchanged |
| extractionSummary | "No preference signals detected. User is already experienced; mentioning beginner exercises are easy is expected context." |

**NOTE**: No level change implied when already at highest level.

---

### E-36 — Mild preference overrides strong opposite signal

**INPUT (setup)**: prefMoreVariety: -2 (wants sameness)
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE with prefMoreVariety: -2>,
  "rawInput": "Actually, I'd like some variety in the exercises. Might be nice to try new things."
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| prefMoreVariety | 1 (changed from -2; mild positive preference overrides strong negative) |
| extractionSummary | notes preference reversal: "I'd like some variety" → set to 1; prior value was -2 |

---

### E-37 — Injury resolution confidence levels

**INPUT (setup)**: jointLimitations: ["knee"]

**Variant A: High confidence**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session C — Lower Body (completed)",
  "currentContext": <BASELINE with jointLimitations: ["knee"]>,
  "rawInput": "My knee is definitely completely fine now. Totally resolved."
}
```

**EXPECT (A)**
| Field | Expected value |
|---|---|
| jointLimitations | [] (removed) |
| limitationsNotes | appends note: "Knee limitation resolved — user reports completely fine." |

**Variant B: Low confidence**
```json
{
  "schemaVersion": 1,
  "inputType": "feedback",
  "sessionContext": "Session C — Lower Body (completed)",
  "currentContext": <BASELINE with jointLimitations: ["knee"]>,
  "rawInput": "My knee feels pretty much better now. Seems resolved."
}
```

**EXPECT (B)**
| Field | Expected value |
|---|---|
| jointLimitations | ["knee"] (unchanged; marginal signal) |
| limitationsNotes | appends: "Knee improvement noted but signal not strong enough for full removal; cautious approach retained." |

**NOTE**: Confidence level matters for removal decision.

---

### E-38 — Implicit vs explicit preference in modification

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": "Can you add more compound movements to my plan?"
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| prefCompoundFocus | null (not extracted; framed as modification request, not preference statement) |
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. 'Add more compound movements' is a plan modification request, not a stated preference." |

**TRICKY**: Compare to explicit version: "I love compound movements" would extract prefCompoundFocus: 2. Implicit requests are treated conservatively.

---

### E-39 — Empty raw input

**INPUT**
```json
{
  "schemaVersion": 1,
  "inputType": "planChat",
  "sessionContext": null,
  "currentContext": <BASELINE>,
  "rawInput": ""
}
```

**EXPECT**
| Field | Expected value |
|---|---|
| ALL fields | unchanged |
| extractionSummary | "No preference signals detected. Message is empty." |

---

## SCORING GUIDE

After testing, record results here:

| Test | Result | Notes |
|---|---|---|
| T-01 | **PASS** | All onboarding fields populated correctly; noiseConstraint and spaceConstraint inferred. |
| T-02 | **PASS** | hypertrophy goal, experienced level, shoulder limitation with nuance, plyo blocked by noise. |
| T-03 | **PASS** | Strong negative intensity signal → prefHigherIntensity: -2. |
| T-04 | **PASS** | Exercise preference + mild knee concern both captured; state carries forward. |
| T-05 | **PASS** | Pure modification request correctly identified as no-signal case. |
| T-06 | **PASS** | Embedded preference extracted; lunge added; prefLongerRest: 2. |
| T-07 | **PASS** | Preference reversal from -2 to 2; extractionSummary notes reversal. |
| T-08 | **PASS** | Equipment acquisition added to both equipment array and preferredEquipment. |
| T-09 | **PASS** | Vague positive feedback correctly identified as no-signal. |
| T-10 | **PASS** | Injury resolution correctly identified; knee removed; limitation noted in append-only field. |
| E-01 | **PASS** | Unmappable structural constraint appended; preferredMovements also set. |
| E-02 | **PASS** | Ambiguous pronoun correctly rejected as no-signal. |
| E-03 | **PASS** | Vague situational comment rejected; prefHigherIntensity stays null. |
| E-04 | **PASS** | Multiple independent signals all extracted correctly in one message. |
| E-05 | **PASS** | Profile edit mode: goal change accepted liberally. |
| E-06 | **PASS** | Contradiction reversal: burpees moved from disliked to preferred. |
| E-07 | **PASS** | Environment constraints correctly inferred; plyo blocked as consequence. |
| E-08 | **PASS** | Nuanced limitation captured: knee fine for squats/lunges, unstable under impact only. |
| E-09 | **PASS** | Equipment removal correctly applied; modification request recognized as non-signal. |
| E-10 | **PASS** | Compound rule applied: targetDuration moved down one step AND prefLongerSessions set to -1. |
| E-11 | **PASS** | Append-only rule enforced: additionalDirections unchanged despite removal request. |
| E-12 | **PASS** | Question correctly identified as no-signal. |
| E-13 | **PASS** | DOMS explicitly excluded from joint limitations. |
| E-14 | **PASS** | Dual-field update: joint + movement both updated from one sentence. |
| E-15 | **PASS** | Isolation preference correctly mapped to prefCompoundFocus: -2. |
| E-16 | **PASS** | Environment reset: constraints and dependent movementLimitations both cleared. |
| E-17 | **PASS** | Minimal acknowledgment rejected; all fields unchanged. |
| E-18 | **PASS** | Fitness level progression with explicit level name accepted. |
| E-19 | **PASS** | Single "too easy" correctly rejected; fitnessLevel unchanged. |
| E-20 | **PASS** | Contradictory signals: injury constraint wins; preference not added. |
| E-21 | **PASS** | Ambiguous equipment ("weights") correctly rejected; requires clarification. |
| E-22 | **PASS** | Equipment removal from empty state is no-op; no-signal case. |
| E-23 | **PASS** | Weak opposite signal (-1) overrides strong prior preference (2). |
| E-24 | **PASS** | Duration at lower boundary: field unchanged but prefLongerSessions extracted from signal. |
| E-25 | **PASS** | Duration at upper boundary: field unchanged but prefLongerSessions extracted. |
| E-26 | **PASS** | Untested codes (elbow, neck, rotation) correctly added to appropriate arrays. |
| E-27 | **PASS** | Untested equipment codes (cable, ball) correctly added. |
| E-28 | **PASS** | Multiple contradictions stacked: last signal wins (burpees → disliked). |
| E-29 | **PASS** | Preference signal embedded in modification: joint constraint extracted, rows not added as preferred. |
| E-30 | **PASS** | Session context null in feedback: extraction proceeds normally; "hard" alone is no-signal. |
| E-31 | **PASS** | Long additionalDirections entry appended as single complete actionable direction. |
| E-32 | **PASS** | Exercise name case variations deduplicated to single entry. |
| E-33 | **PASS** | Repeated identical preference deduplicated; single entry in array. |
| E-34 | **PASS** | Movement preference and equipment constraint both captured independently. |
| E-35 | **PASS** | Experienced user mentioning beginner exercises being easy: no level change signal. |
| E-36 | **PASS** | Mild preference (1) overrides strong opposite (-2); both captured in summary. |
| E-37a | **PASS** | High-confidence injury resolution ("definitely completely fine"): removed from jointLimitations. |
| E-37b | **PASS** | Low-confidence improvement ("pretty much better"): remains in jointLimitations; note appended. |
| E-38 | **PASS** | Implicit modification request ("Add more compound") not extracted; explicit preference required. |
| E-39 | **PASS** | Empty rawInput correctly identified as no-signal case. |

**Priority failures** (if these fail, fix prompt before proceeding):
- T-05 (pure modification request — must extract nothing)
- T-03 (strong negative intensity — must extract prefHigherIntensity: -2)
- E-03 (vague comment — must NOT extract)
- E-02 (ambiguous pronoun — must NOT extract)
- E-11 (append-only violation — must NOT remove from additionalDirections)
- E-13 (DOMS/soreness — must NOT add joint limitation)
- E-19 (single "too easy" — must NOT change fitnessLevel)
- E-20 (contradictory signals — injury constraint must win)
- E-21 (ambiguous equipment — must NOT guess the type)
- E-30 (null sessionContext — extraction must proceed normally)
- E-37a (high-confidence resolution — must remove from jointLimitations)
- E-37b (low-confidence improvement — must NOT remove; append note only)
- E-38 (implicit modification — must NOT extract as preference)

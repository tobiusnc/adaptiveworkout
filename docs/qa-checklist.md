# QA Checklist — Adaptive Workout MVP
# PRD Reference: v1.0
# Last updated: 2026-04-13

## How to read this checklist

Each item maps to a specific PRD acceptance criterion.
Tag meanings:
- **[Manual]** — requires a device/emulator; cannot be meaningfully automated
- **[Detox]** — good candidate for Detox E2E automation
- **[Covered: unit]** — underlying logic has unit test coverage; manual pass still verifies wiring

Pass = observed behavior matches description. Fail = note the actual behavior.

---

## 1. App Launch

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 1.1 | Launch app with no active plan | Onboarding conversation shown automatically | [Detox] | |
| 1.2 | Launch app with active plan | Home screen shown with session list | [Detox] | |

---

## 2. Home Screen (PRD §8)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 2.1 | Active plan exists | All sessions listed with: name, focus description, estimated duration, equipment, round count | [Detox] | |
| 2.2 | Active plan exists, at least one session previously executed | Last-run indicator visible on the most recently executed session | [Detox] | |
| 2.3 | User taps a session card | Workout execution begins immediately (no separate Start button) | [Detox] | |
| 2.4 | Active plan exists | FAB (Plan Chat button) is visible | [Detox] | |
| 2.5 | No active plan | FAB (Plan Chat button) is not visible | [Detox] | |

---

## 3. Onboarding (PRD §2.2)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 3.1 | Onboarding starts | Questions presented one at a time | [Detox] | |
| 3.2 | Each question displayed | 3–5 option buttons shown plus a free-form text input | [Detox] | |
| 3.3 | User taps an option button | Selection registered; next question advances | [Detox] | |
| 3.4 | User types in free-form field and submits | Input accepted; next question advances | [Detox] | |
| 3.5 | All required fields collected | Draft plan screen shown after final question | [Detox] | |
| 3.6 | All required fields present | Covers: goal, equipment, sessions/week, duration, fitness level, injuries/avoid, open-ended context | [Manual] | |

---

## 4. Plan Generation + Iteration (PRD §2.3, §6)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 4.1 | Onboarding complete | Draft plan displayed as session list preview | [Detox] | |
| 4.2 | User taps Accept | Plan written to store; home screen shows sessions | [Detox] | |
| 4.3 | User taps Reject | Returns to onboarding | [Detox] | |
| 4.4 | User types a natural language change before accepting (e.g. "make sessions shorter") | AI updates draft; revised plan shown | [Manual] | |
| 4.5 | generatePlan API call fails or times out | User-friendly error message shown; no crash | [Manual] | |

---

## 5. Session Execution — Hold-Before-Step and Step Display (PRD §6.3, §6.10)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 5.1 | Session selected from home | First warm-up item shown: exercise name, equipment, form cues, rep/time target, "Next up" preview | [Detox] | |
| 5.2 | Timed step in hold state | Go button visible; timer has not started | [Detox] | |
| 5.3 | User taps Go | Countdown timer starts; circular progress ring begins animating | [Detox] | |
| 5.4 | Rep-based step displayed | Done button visible; no countdown timer | [Detox] | |
| 5.5 | User taps Done on rep step | Rest step begins | [Detox] | |
| 5.6 | Bilateral timed exercise | Left step shown, then Right step; no rest between sides; durationSec is per-side | [Detox] [Covered: unit] | |
| 5.7 | Bilateral rep exercise | Single step shown; rep count displayed as "N reps each side" | [Detox] [Covered: unit] | |
| 5.8 | Auto-advance step (rest, between, warmup-delay, cooldown-delay) | Step advances without user input | [Detox] | |

---

## 6. Session Execution — TTS Voice Guidance (PRD §6.5)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 6.1 | work / stretch / warmup-work / cooldown-work step starts | TTS announces exercise name; includes rep count or duration | [Manual] | |
| 6.2 | rest / between / warmup-delay / cooldown-delay step starts | TTS announces upcoming exercise name and target | [Manual] | |
| 6.3 | Timed interval has 3 seconds remaining | TTS announces "3", "2", "1" in sequence | [Manual] | |
| 6.4 | Background music playing (e.g. Spotify) during any TTS announcement | Music volume ducks during announcement, restores after | [Manual] | |
| 6.5 | TTS plays throughout session | Background music never stops entirely — only ducks | [Manual] | |

---

## 7. Session Execution — On-Screen Controls (PRD §6.6)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 7.1 | Timed interval running | Pause button visible and tappable | [Detox] | |
| 7.2 | User taps Pause | Timer stops; Resume button shown; TTS stops | [Detox] [Manual: TTS] | |
| 7.3 | User taps Resume | Timer continues from paused point; TTS resumes | [Detox] [Manual: TTS] | |
| 7.4 | Any step active | Skip (→) button visible | [Detox] | |
| 7.5 | User taps Skip | Current step ends; next step begins | [Detox] | |
| 7.6 | Any step active | Prev (←) button visible | [Detox] | |
| 7.7 | User taps Prev | Previous step restarts from beginning | [Detox] | |
| 7.8 | User taps End Session | Confirmation dialog shown | [Detox] | |
| 7.9 | User confirms End Session | Session marked incomplete; post-session feedback screen shown | [Detox] | |
| 7.10 | User cancels End Session dialog | Session continues from current step | [Detox] | |

---

## 8. Session Execution — Progress Strip (PRD §6.9)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 8.1 | Session executing — main circuit | Progress strip shows one dot per exercise in current round | [Detox] | |
| 8.2 | Step advances to next exercise | Active exercise dot is visually distinct from others | [Detox] | |
| 8.3 | Exercise completed | Completed exercise dot is visually marked | [Detox] | |

---

## 9. Session Execution — Exercise Detail Bottom Sheet (PRD §6.8)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 9.1 | work step displayed; user taps exercise name | Timer pauses; bottom sheet opens | [Detox] | |
| 9.2 | Bottom sheet open | Shows: exercise name, equipment, rep/duration target, full form cues (not truncated) | [Detox] | |
| 9.3 | Bottom sheet open | "Watch on YouTube" button visible | [Detox] | |
| 9.4 | User taps "Watch on YouTube" | Device browser opens with YouTube search URL for exercise | [Manual] | |
| 9.5 | User swipes down or taps Close on bottom sheet | Sheet dismisses; timer resumes from where it paused | [Detox] | |

---

## 10. Session Execution — Round and Session Transitions (PRD §6.1, §6.10)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 10.1 | Round completes (not the final round) | Between-round stretch step shown with TTS announcement | [Detox] [Manual: TTS] | |
| 10.2 | Between-round stretch completes | Between-round rest countdown runs | [Detox] | |
| 10.3 | Between-round rest step starts | TTS announces first exercise of next round | [Manual] | |
| 10.4 | restBetweenRoundsSec < 5 on the plan | Between-round rest step is skipped entirely | [Detox] [Covered: unit] | |
| 10.5 | Final round completes | Between-round stretch shown; no between-round rest follows | [Detox] [Covered: unit] | |
| 10.6 | Final cooldown step completes | Done screen shown (not instant navigation to feedback) | [Detox] | |
| 10.7 | Done screen shown | TTS announces "Session complete" or equivalent | [Manual] | |
| 10.8 | User taps Finish on done screen | Navigates to post-session feedback screen | [Detox] | |

---

## 11. Mid-Session Backgrounding and Resume (PRD §6.7)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 11.1 | App backgrounded (home button) mid-session | Timer continues running in the background | [Manual] | |
| 11.2 | User returns to app after backgrounding | Session at correct point; timer state intact | [Manual] | |
| 11.3 | Device back button pressed mid-session | Session state persisted immediately | [Manual] | |
| 11.4 | App reopened after back-button exit | "Resume session?" prompt shown with Yes / End options | [Manual] | |
| 11.5 | User taps Yes on resume prompt | Session resumes from the persisted step | [Manual] | |
| 11.6 | User taps End on resume prompt | Session marked incomplete; user returned to home | [Manual] | |

---

## 12. Post-Session Feedback (PRD §7.1)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 12.1 | Feedback screen shown | Text input displayed with placeholder "How did it feel? Anything to change?" | [Detox] | |
| 12.2 | Mic permission granted | Microphone button visible | [Manual] | |
| 12.3 | User taps mic, speaks | Transcribed text appears in input field | [Manual] | |
| 12.4 | User enters text and taps "Save & Done" | Feedback stored with timestamp and session ID; navigates home | [Detox] [Covered: unit] | |
| 12.5 | User taps "Skip" with no text entered | No feedback written to store; navigates home | [Detox] | |

---

## 13. Plan Chat (PRD §4.3)

| # | Condition | Expected | Tag | Pass/Fail |
|---|---|---|---|---|
| 13.1 | User taps FAB from home screen | Plan Chat screen opens | [Detox] | |
| 13.2 | Plan Chat opens | Opening message acknowledges current plan name and invites user to describe a change | [Detox] | |
| 13.3 | Opening message shown | No AI API call made at mount (hardcoded message) | [Detox] [Covered: unit] | |
| 13.4 | User types a message and taps Send | User message appears in thread (right-aligned) | [Detox] | |
| 13.5 | AI call in progress | Loading indicator shown; input disabled | [Detox] | |
| 13.6 | AI returns a clarification (text-only, no tool call) | AI message appears left-aligned; input re-enabled; no preview shown | [Detox] [Covered: unit] | |
| 13.7 | AI returns a proposal (tool call) | Before/after preview shown below AI summary message | [Detox] [Covered: unit] | |
| 13.8 | Proposal shown | "Apply Change" and "Don't Apply" buttons visible | [Detox] | |
| 13.9 | User taps "Apply Change" | Plan updated in store; navigates to home screen | [Detox] [Covered: unit] | |
| 13.10 | User taps "Don't Apply" | Preview dismissed; conversation continues; input re-enabled | [Detox] | |
| 13.11 | AI call fails or times out | User-friendly error message shown in thread; plan not modified | [Detox] [Covered: unit] | |
| 13.12 | Multiple turns (clarification → proposal) | Full conversation thread visible in scroll view | [Detox] | |
| 13.13 | contextRecordUpdate content > 3000 chars after apply | summarizeContextRecord called; context record condensed | [Manual] [Covered: unit] | |

---

## 14. Non-Functional Requirements (PRD §12)

| # | Requirement | How to verify | Tag | Pass/Fail |
|---|---|---|---|---|
| 14.1 | Session object ready within 500 ms of user selecting a session | Time from tap to first step visible on screen | [Manual] | |
| 14.2 | Timer accuracy within ±100 ms | Compare countdown to reference clock over a 60 s interval | [Manual] | |
| 14.3 | TTS announcement begins within 300 ms of interval start | Listen for announcement immediately after step transition | [Manual] | |
| 14.4 | Network drops mid-session | Kill network; session continues without crash or data loss | [Manual] | |
| 14.5 | All actions available via on-screen controls (no voice required) | Complete full session with TTS muted; all controls reachable | [Manual] | |
| 14.6 | Font sizes respect system accessibility settings | Set device font to largest; verify no text truncated off-screen | [Manual] | |

---

## Summary — Detox Coverage Candidates

Items tagged **[Detox]** across all sections:

| Section | Item count |
|---|---|
| App Launch | 2 |
| Home Screen | 5 |
| Onboarding | 5 |
| Plan Generation | 3 |
| Hold-Before-Step + Step Display | 7 |
| On-Screen Controls | 9 |
| Progress Strip | 3 |
| Exercise Detail Bottom Sheet | 4 |
| Round/Session Transitions | 5 |
| Post-Session Feedback | 2 |
| Plan Chat | 11 |
| **Total** | **56** |

Items requiring **[Manual]** only: 28

Items with existing unit test coverage (**[Covered: unit]**): 8

---

## Notes

- Detox tests for Plan Chat and Plan Generation must mock the AI layer — real API calls are too slow and non-deterministic for automated E2E tests.
- TTS and audio ducking (items 6.1–6.5) cannot be meaningfully asserted in any automated framework; manual verification on a real device with background audio is the only valid test.
- Timer accuracy (14.2) is best verified with a stopwatch against a known-duration step (e.g. a 60-second work interval).
- Mid-session backgrounding (section 11) requires a physical device or emulator with the ability to simulate home-button press and force-close.

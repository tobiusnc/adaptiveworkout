# Product Requirements Document
# Adaptive Workout App
# Version: 1.0
# Author: JD
# Last updated: 2026-04-03
# =============================================================

## Agent Instructions

Before writing any code, read this document in full. Then read `docs/schema.md`,
`docs/architecture.md`, `docs/decisions.md`, and `docs/constraints.md` in that order.

**STOP CONDITION — SCHEMA GAPS:** If you encounter any exercise type, session
structure, feedback signal, or data relationship that cannot be cleanly expressed
by the current schema in `docs/schema.md`, STOP. Do not infer a solution. Do not
extend the schema unilaterally. Describe the gap and wait for instruction.

**STOP CONDITION — AMBIGUOUS REQUIREMENTS:** If a requirement in this document could
be implemented in more than one meaningfully different way and the choice would have
downstream consequences on the schema or data model, STOP and surface the ambiguity
before writing code.

**DECISIONS:** When you make any implementation decision not explicitly specified
here, record it in `docs/decisions.md` with a one-line rationale before continuing.

---

## 1. Product Overview

### 1.1 Purpose

An AI-driven workout application that eliminates friction between plan generation and
plan execution. The AI generates a structured, personalized resistance training plan
through a guided conversation; the runtime executes that plan natively — with timers
and voice guidance — without any manual configuration step between generation and
execution. After each session, the user can leave feedback that is available as
context the next time they ask the AI to modify the plan.

### 1.2 Core Problem Being Solved

Existing AI fitness tools have a seam between plan generation and execution. The AI
generates a plan; the user manually recreates it in a separate timer app to execute
it. This friction degrades compliance and breaks the feedback loop. This application
owns the full loop: generate → execute → capture → adapt.

### 1.3 Design Principles

- **Zero configuration between generation and execution.** The AI generates a
  structured session object; the runtime executes it directly.
- **The schema is the contract.** Both the AI generator and the execution runtime
  speak the same data format. Changes to one must be reflected in the other.
  Data design precedes code — no feature is implemented until its data representation
  is defined in `docs/schema.md`.
- **All plan changes are user-initiated and confirmed.** The AI proposes; the user
  accepts. No change is written to the store until explicitly accepted.
- **Shared codebase, native modules where necessary.** Every native module must have
  a documented iOS equivalent path — platform-specific code is acceptable,
  platform lock-in is not.
- **Security and encryption from the start,** even where not fully implemented in
  MVP, to avoid architectural debt when accounts and sync are added.

### 1.4 Platform Targets

**MVP:** Android native application, portrait orientation only.

**Architecture requirement:** The codebase must be structured to extend to iOS
without a rewrite. Shared application logic, UI, schema, and AI layer across
platforms. Native modules for platform-specific capabilities are expected; each
must have a documented iOS equivalent path. No architectural decision that forecloses
iOS without a structural rewrite.

---

## 2. User Profile

### 2.1 Target User (MVP)

Single user, local device. No authentication in MVP. The application is designed
from the start to support multi-user accounts and cloud sync as a future addition —
data structures and encryption approach must not preclude this.

### 2.2 Onboarding Inputs

Collected via guided AI conversation at first launch. Questions are presented one
at a time with 3–5 likely answer option buttons plus a free-form "Other / add
detail" text input below them. The conversation output is passed to the AI plan
generator as a structured profile object.

**Required fields:**
- Primary fitness goal (general fitness / strength / hypertrophy / weight loss /
  rehabilitation)
- Available equipment (multi-select: TRX, resistance bands, curl bar, kettlebell,
  dumbbells, bodyweight only, other — free form)
- Sessions per week (2, 3, 4, 5, other)
- Target session duration (20–30 min, 30–45 min, 45–60 min, 60+ min)
- Fitness level (beginner / intermediate / experienced)
- Any injuries or movements to avoid (free-form text)

**Future-use fields (collected now, not used in MVP):**
- Age
- Biological sex
- Current weight and height
- Target weight
- Dietary restrictions and preferences

### 2.3 Plan Iteration Before Acceptance

After the initial plan is generated from the questionnaire, the user may iterate via
natural language conversation with the AI before accepting. Examples: "make sessions
shorter," "I don't have a TRX," "I want more core work." When the user accepts, the
plan is written to the session store as the active program.

---

## 2.5 Tech Stack

All decisions in this section are final for MVP. If a package version conflict
arises, surface it for review rather than substituting silently.

### 2.5.1 Framework

**React Native + Expo SDK 55** (New Architecture mandatory). All packages must be
New Architecture compatible. Any package requiring the legacy bridge is incompatible
and must be flagged before use.

### 2.5.2 Audio — TTS and Ducking

**TTS:** `expo-speech` (platform native TTS, platform default voice for MVP).
Routes through the platform audio session automatically.

**Audio ducking:** `expo-audio` with `duckOthers` mode. On Android 8+, the OS
handles ducking automatically via AudioFocus — background media volume is reduced
while announcements play, then restored. A foreground service satisfies Android 15
audio policy via Expo's background task API.

**iOS equivalent path:** `AVAudioSession` with `.duckOthers` via an Expo Module.

### 2.5.3 Storage

**SQLite + SQLCipher** for MVP. Local-only operation. Encryption keys must use
platform secure storage (Android Keystore). All reads and writes go through a
storage abstraction layer — application code does not call SQLite directly. This
ensures the future transition to PowerSync (cloud sync) requires changes only to
the abstraction layer, not to any code that reads or writes data.

**Future path:** PowerSync + SQLCipher. PowerSync operates in local-only mode
initially; when cloud sync is added, the sync engine activates without data
migration or schema changes. User ID fields are included in the schema from the
start to support this transition.

**iOS equivalent path:** SQLite + SQLCipher are cross-platform. No iOS blocker.

### 2.5.4 Navigation

**Expo Router.**

### 2.5.5 State Management

**Zustand.**

### 2.5.6 Testing

**Jest / jest-expo / @testing-library/react-native.**

---

## 3. System Architecture

Four subsystems with clean boundaries. Do not couple them directly.

```
┌─────────────────────┐
│   AI Plan Generator  │  — takes user profile + context, outputs session objects
└────────┬────────────┘
         │ writes session objects to session store
┌────────▼────────────┐
│    Session Store     │  — structured data, source of truth for all sessions
└────────┬────────────┘
         │ reads session objects
┌────────▼────────────┐
│  Execution Runtime   │  — runs timers, voice guidance, captures feedback
└────────┬────────────┘
         │ writes session feedback to history store
┌────────▼────────────┐
│    History Store     │  — completed sessions and post-session feedback
└─────────────────────┘
         │ read by AI Plan Generator at plan modification
```

---

## 4. AI Plan Generator

### 4.1 Responsibilities

- Accept a user profile object and optional history/context as input
- Output a complete program object or modified plan as structured data only
  (no prose output — output is structured data validated against `docs/schema.md`)
- When generating plan modification suggestions, accompany each with a plain-language
  rationale the user can read

### 4.2 Plan Generation Trigger Points

- Initial plan generation from onboarding conversation
- User-initiated natural language iteration before plan acceptance
- User-initiated natural language plan modification via the Plan Chat interface
  (see 4.3)

### 4.3 Plan Chat Interface

A persistent chat entry point is available from the home screen. The user can modify
the active plan via natural language conversation at any time.

**Context available to AI during modification:**
- Current plan (as structured data)
- Plan context record (see 4.4)
- Recent post-session feedback comments (if any)

The AI does not receive full conversation history from prior modification sessions.
The plan context record is the mechanism for retaining significant preferences and
decisions across sessions.

**Scope resolution:**
- Intent clearly applies to full program → AI applies program-wide without asking
- Intent clearly applies to one session → AI applies to that session without asking
- Scope is ambiguous → AI asks one clarifying question before proposing changes;
  does not infer scope silently

**Preview and confirmation:**
Before applying any change, the AI presents a before/after comparison scoped to
only the sessions and exercises directly affected. Primary format: structured diff
(before / after). If diff is impractical, fallback: a short AI-generated narrative
paragraph (generated as part of the `modifyPlan` response, not improvised at render
time). No changes are written to the session store until explicitly confirmed by
the user.

**Acceptance criteria:**

GIVEN an active plan exists
WHEN the user opens Plan Chat
THEN the AI opens with a message acknowledging the current plan and inviting the
     user to describe what they want to change

GIVEN the user describes a change
WHEN the AI proposes a modification
THEN a before/after preview is shown scoped to only the affected items
THEN "Apply Change" and "Don't Apply" buttons are presented

GIVEN the user taps "Apply Change"
WHEN no validation error occurs
THEN the plan is updated in the session store
THEN the conversation continues so the user can make further changes

GIVEN the AI call fails or times out
WHEN the error occurs
THEN a user-friendly error message is shown and the plan is not modified

### 4.4 Plan Context Record

A human-readable, AI-maintained record stored alongside the active plan that
captures significant decisions, user preferences, and constraints established during
onboarding and subsequent modification conversations.

Examples: "user has no TRX," "user dislikes high-impact exercises," "goblet squats
replaced with TRX squat — user finds them uncomfortable," "user prefers sessions
under 25 minutes."

- The AI reads this record at the start of every plan modification conversation
- The AI appends to this record when a meaningful preference or constraint is
  established — this is the AI's responsibility, not a manual user action
- The record is plain text, human-readable, and visible to the user
- When the record grows large, the AI condenses it via `summarizeContextRecord`,
  preserving high-signal persistent facts (physical limitations, equipment
  constraints, strong preferences) and dropping transient or superseded entries

---

## 5. AI Layer

### 5.1 Named Functions

The AI layer is a discrete module. All AI calls pass through this module — no other
part of the application calls an AI provider directly.

| Function | Primary Input | Primary Output | Default Model |
|---|---|---|---|
| `generatePlan` | UserProfile + optional history | Program object (structured) | claude-sonnet-4-6 |
| `modifyPlan` | Current plan + context record + conversation | Diff object + plain-language summary | claude-sonnet-4-6 |
| `summarizeContextRecord` | Current context record + new conversation | Updated context record | claude-haiku-4-5-20251001 |

Each function has its own system prompt, input assembly logic, and output parser.
Changes to one do not affect the others. Model names must be read from
`docs/architecture.md` — never hardcoded in code.

### 5.2 Structured Output Contract

All AI functions return structured data, not prose. The output schema for each
function is defined in `docs/schema.md`. The AI layer is responsible for:

- Assembling the input context before each call
- Validating that the response conforms to the expected output schema
- Retrying with a clarifying prompt if output fails validation (max 2 retries)
- Surfacing a graceful error to the application if validation fails after retries —
  never passing malformed output to the session store

### 5.3 Every AI Call Must Have

1. Async — never block UI thread
2. Timeout — 30 000 ms explicit default
3. Retry — one retry with backoff on timeout or 5xx
4. Fallback — defined behavior when all retries fail
5. Token logging — log model, inputTokens, outputTokens after each call
6. Error logging — log error and context on any failure
7. Loading state — UI shows loading before call starts
8. Error state — UI shows user-friendly message on failure

### 5.4 Prompt Storage

Prompts are stored as versioned files in the codebase alongside the code that calls
them. The AI layer calls `loadPrompt(functionName)` rather than importing prompt
strings directly — in MVP this reads from local files; future path is remote config
with local fallback. Prompt version is logged with every AI call.

---

## 6. Execution Runtime

### 6.1 Session Structure

Each session executes in this fixed order:

1. **Warm-up** — sequential items, each timed or rep-based
2. **Main circuit × N rounds:**
   a. Each exercise: work interval (timed countdown or rep display with pause)
   b. Rest between exercises (per-plan configurable, default 20 s)
   c. End of round (except final): between-round stretch → between-round rest
      (both per-plan configurable; default stretch 30 s, default rest 90 s)
3. **Cooldown** — sequential timed stretches with short automatic delay between each
4. **Done screen → post-session feedback**

### 6.2 Step Types

The full step sequence is constructed from the session object before execution
begins. The session object is a complete, inspectable description — steps are not
generated dynamically during execution.

| Step Type | Description |
|---|---|
| `warmup-work` | Warm-up item — timed or rep-based |
| `warmup-delay` | 5-second automatic pause between warm-up items |
| `work` | Work interval — timed or rep-based |
| `rest` | Rest interval between work sets |
| `stretch` | Between-round stretch (left side and right side are separate steps if bilateral) |
| `between` | Rest interval between rounds |
| `cooldown-work` | Cooldown stretch — timed |
| `cooldown-delay` | Short automatic pause between cooldown items |

**Schema-driven durations:** All durations are carried in the session object per
exercise and per session. There are no runtime constants. The execution runtime reads
durations from the session object only.

### 6.3 Hold-Before-Step Pattern

All timed steps (`warmup-work`, `work`, `stretch`, `cooldown-work`) hold for user
confirmation before the interval begins. The runtime loads the step, displays the
exercise name and form cues, plays the TTS announcement, and shows a "Go" button.
The interval timer does not start until the user taps "Go." All other step types
advance automatically.

**Auto-start on session select:** There is no separate "Start Session" button.
Selecting a session begins execution immediately at the first step.

### 6.4 Rep-Based Exercises

For fixed rep count: the timer is not used; a "Done" button is shown; the user taps
it when reps are complete.

### 6.5 Voice Guidance (TTS)

Two announcement functions fire at step transitions:

- `announceCurrentEx(step)` — fires when a `work`, `stretch`, `warmup-work`, or
  `cooldown-work` step starts. Announces exercise name. If rep-based, includes the
  rep string (e.g. "8 reps"). If timed, includes the duration (e.g. "40 seconds").
- `announceNextEx(step)` — fires when a `rest`, `between`, `warmup-delay`, or
  `cooldown-delay` step starts. Announces what is coming next in the same format.

Countdown: TTS announces "3", "2", "1" in the final 3 seconds of any timed interval.

**All voice output uses audio ducking:** background media volume is temporarily
reduced while the announcement plays, then restored. Voice must not stop background
media — it layers over it using platform audio ducking APIs.

**TTS voice:** Platform default for MVP.

### 6.6 On-Screen Controls

| Control | Behavior |
|---|---|
| Go | Start the current timed interval (shown during hold-before-step) |
| Done | Complete a rep-based interval and begin rest |
| Pause / Resume | Pause/resume the current timer and TTS |
| Skip → | End current step, begin next step |
| ← Prev | Restart previous step from beginning |
| End Session | Confirm dialog → write partial feedback → return to home |

"End Session" requires a confirmation to prevent accidental exit. On confirmation,
the session is marked incomplete, the post-session feedback screen is shown, and the
user is returned to the home screen after submitting or skipping feedback.

### 6.7 Mid-Session Exit and Resume

GIVEN the app is backgrounded or the screen is locked mid-session
WHEN the user returns to the app
THEN the session resumes from the exact point it was paused
THEN the timer continues running in the background while backgrounded

GIVEN the user presses the device back button or navigates away mid-session
WHEN the system triggers an exit
THEN the session state is persisted immediately
THEN on next app open the user is shown "Resume session?" with Yes / End options

### 6.8 Exercise Detail View

GIVEN workout execution is active and a `work` step is displayed
WHEN the user taps the exercise name
THEN the current timer pauses
THEN a bottom sheet opens showing:
     - Exercise name and equipment
     - Rep or duration target
     - Full form cues (complete list, not truncated)
     - "Watch on YouTube" button (opens YouTube search URL in device browser)

GIVEN the exercise detail bottom sheet is open
WHEN the user swipes down or taps Close
THEN the sheet dismisses and the timer resumes from where it paused

### 6.9 Progress Indicator

A progress strip displays one dot per exercise in the current round. The active
exercise dot is visually distinct; completed exercises are marked.

### 6.10 Execution Acceptance Criteria

GIVEN the user selects a session from the home screen
WHEN execution begins
THEN the first warm-up item is displayed with exercise name, equipment, form cues,
     rep/time target, and a "Next up" preview of the following item
THEN TTS announces the first item

GIVEN a timed step is in hold-before-step state
WHEN the user taps "Go"
THEN the countdown timer begins
THEN a circular progress ring animates to reflect elapsed time

GIVEN a timed interval has 3 seconds remaining
WHEN the countdown reaches 3
THEN TTS announces "3", "2", "1" in sequence

GIVEN a timed work interval ends
WHEN the rest step begins
THEN TTS announces "Rest" and the name of the next exercise
THEN the rest countdown displays

GIVEN a round completes (not the final round)
WHEN the between-round sequence begins
THEN the stretch step is shown with TTS announcement
THEN after the stretch, the between-round rest countdown runs
THEN TTS announces the first exercise of the next round at the start of the rest step

GIVEN the final round completes
WHEN the session ends
THEN the stretch step is shown (no between-round rest follows)
THEN TTS announces "Session complete" or similar
THEN the done/feedback screen is shown

GIVEN TTS audio is playing
WHEN background music is also playing
THEN background music volume is ducked for the duration of the announcement
THEN background music restores to full volume after the announcement ends

GIVEN the app is backgrounded mid-session
WHEN the user returns to the app
THEN the session is at the correct point with timer state intact

---

## 7. Post-Session Feedback

### 7.1 Feedback Screen

Shown after every session completion (full or early exit with confirmation).

GIVEN the session completion screen is shown
WHEN it first appears
THEN a text input field is displayed with placeholder "How did it feel? Anything
     to change?"
THEN a microphone button is displayed if mic permission is granted

GIVEN the user taps the microphone button
WHEN speech is detected
THEN transcribed text appears in the text input field

GIVEN the user has entered or dictated a comment
WHEN they tap "Save & Done"
THEN the comment is stored with a timestamp and the session identifier
THEN the user is returned to the home screen

GIVEN the user taps "Skip"
WHEN no comment has been entered
THEN no feedback is stored and the user is returned to the home screen

### 7.2 Feedback Data

Stored as a plain-text comment with timestamp and session identifier. This is the
only feedback structure in MVP. The schema must accommodate future structured fields
(per-exercise form flags, effort rating, rep counts, HR log) without breaking changes.

---

## 8. Session Selection (Home Screen)

GIVEN an active plan exists
WHEN the home screen loads
THEN all sessions in the active plan are listed with: session name, focus
     description, estimated duration, equipment needed, and round count

GIVEN the session list is displayed
WHEN the user taps a session card
THEN workout execution begins for that session

GIVEN no active plan exists
WHEN the home screen loads
THEN the onboarding conversation is shown automatically

---

## 9. Data Schema

`docs/schema.md` is the single source of truth. The entities below are required
for MVP. Every schema object must carry a `schemaVersion` field. Schema changes must
be additive by default; destructive changes require a version bump and a compatibility
layer entry before any dependent code is written.

**Required MVP entities:**

| Entity | Key Fields |
|---|---|
| UserProfile | goals, equipment, sessionsPerWeek, duration, fitnessLevel, limitations, futureUseFields (nullable) |
| Plan | id, name, description, contextRecord, config (defaultWorkSec, restBetweenExSec, restBetweenRoundsSec) |
| Session | id, planId, name, type, orderInPlan, rounds, workSec, restBetweenExSec, restBetweenRoundsSec |
| WarmupItem | id, sessionId, order, name, type (timed/rep), durationSec, reps, equipment, formCues, youtubeUrl |
| Exercise | id, sessionId, order, name, type (timed/rep), durationSec, reps, weight, equipment, formCues, youtubeUrl |
| BetweenRoundStretch | id, sessionId, name, durationSec |
| CooldownItem | id, sessionId, order, name, durationSec, formCues |
| SessionFeedback | id, sessionId, completedAt, isComplete, commentText |
| PlanContextRecord | id, planId, content (plain text), updatedAt |

**Schema must also accommodate future without breaking changes:**
- Per-exercise logging (reps completed, weight used)
- Structured per-exercise form flags
- Session effort rating
- HR time-series log
- Multiple saved plans
- User ID for multi-user / cloud sync
- Nutrition fields (nullable, not populated in MVP)

---

## 10. MVP Scope

### 10.1 In Scope

- AI onboarding questionnaire with prompted conversation UI
- AI plan generation from onboarding output
- Natural language plan iteration before acceptance
- Single-user local storage (SQLite + SQLCipher), cloud-transition-ready architecture
- Home screen session list
- Execution runtime: resistance circuit sessions (timed and rep-based exercises)
- Warm-up, main circuit (N rounds), between-round stretch and rest, cooldown
- Hold-before-step for all timed exercises
- TTS exercise announcements with audio ducking (platform default voice)
- 3-2-1 countdown TTS
- Exercise detail bottom sheet (full form cues + YouTube link)
- Pause / Resume / Skip / Prev / End Session controls
- Progress indicator strip
- Mid-session backgrounding: timer continues, session resumes on return
- Post-session feedback (free-form text + optional voice transcription via mic)
- Plan Chat interface for user-initiated AI plan modification
- Plan context record (AI-maintained across modification conversations)
- Before/after change preview with user confirmation before any write
- Schema versioned for future feature additions
- Android native application (iOS-extensible architecture required)
- Portrait orientation

### 10.2 Explicitly Out of Scope — MVP

- Voice command input (STT: "done", "next", "pause")
- Real-time heart rate integration (Bluetooth HRM, Android Health Connect)
- Automatic rest extension based on HR recovery
- HR voice alerts and HR logging
- Pre-session intensity dial (reduce / normal / push)
- Cardio session execution (rowing, cycling, running) — future consideration only
- User accounts and authentication
- Cloud sync
- Multiple saved plans / plan library
- Manual plan field editing (direct text edit without AI)
- Automatic / unsolicited plan adaptation
- AI plan modification during execution (mid-session)
- Nutrition guidance (schema fields nullable, feature deferred)
- iOS-specific HealthKit integration
- Wearable companion apps (Wear OS, Apple Watch)
- Landscape orientation
- Push notifications / reminders
- Social features
- HRV and sleep quality integration

### 10.3 Future Requirements (Architecture Must Not Preclude)

- User accounts and cloud sync — include user ID fields in schema from start; use
  storage abstraction for seamless PowerSync activation
- iOS HealthKit — HR data abstraction layer must accommodate both Health Connect
  and HealthKit without schema changes
- Cardio session execution — session type field in schema must support extension
- Per-exercise logging — schema must have designated slots for reps completed,
  weight used, form flags
- HRV / sleep readiness — history store must have a place for daily readiness data
  even if not populated in MVP
- Multiple plans — plan schema must support a library, not just one active plan
- Wearable companion — session object must be serializable to watch-compatible format

---

## 11. Walking Skeleton — First Milestone

The first milestone is a complete end-to-end path through the core loop using the
simplest possible session. Nothing else is built until this path works.

**Scope:**

1. Hardcoded user profile (no onboarding UI yet)
2. AI generates a valid single-session resistance circuit object from the profile
3. Session object is written to session store
4. Execution runtime reads session object and executes one complete timed resistance
   session — timers run, exercises advance, TTS announces exercise names
5. Post-session feedback text is captured and written to history store
6. App returns to home screen

**Done condition:** A developer can run the app, complete a full timed resistance
session from first exercise to post-session feedback submission, and observe the
feedback stored in the history store. Additionally, background music playing from
an external app (e.g. Spotify) continues uninterrupted throughout the session,
ducking briefly during TTS announcements then restoring.

**Excluded from walking skeleton:**
- Onboarding UI
- Rep-based exercises (timed circuit only)
- Hold-before-step (auto-start each interval)
- Plan Chat interface
- Voice transcription in feedback
- Exercise detail bottom sheet
- Mid-session resume
- End Session early flow

These are added as subsequent milestones after the walking skeleton is verified.

---

## 12. Non-Functional Requirements

### 12.1 Performance

- Session object must be ready for execution within 500 ms of user selecting a session
- Timer accuracy must be within ±100 ms
- TTS announcement must begin within 300 ms of interval start

### 12.2 Offline Operation

- The execution runtime must function fully offline once a session is loaded
- AI plan generation and modification require network connectivity
- App must not crash or data-lose when network drops mid-session

### 12.3 Security

- All user data stored locally must be encrypted at rest (SQLCipher)
- Encryption keys must not be hardcoded — use Android Keystore
- Data structures must support future per-user encryption without schema migration
- No health data transmitted to any third party without explicit user consent

### 12.4 Accessibility

- All timed intervals must have both visual (timer display) and audio (TTS) indicators
- Voice interface is supplementary — all actions available via on-screen controls
- Font sizes must respect system accessibility settings

---

## 13. Open Questions

All open questions are closed as of v1.0. See changelog for resolution record.

---

## 14. Document Maintenance

When requirements change: update the relevant section, add a changelog entry, and
update `docs/schema.md` if data structures are affected. When the agent makes an
implementation decision not covered here, it records it in `docs/decisions.md`.

### Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1–0.8 | 2026-03-06 to 2026-03-08 | Initial draft through full execution engine spec, AI layer, platform strategy, tech stack, voice input, HR integration (see root PRD.md for detailed per-version notes) |
| 1.0 | 2026-04-03 | Merged root PRD.md (v0.8) with session-based decisions. Voice input (STT) moved to future. HR integration moved to future. Pre-session intensity dial moved to future. Cardio session execution removed (out of scope, may not return). Storage changed to SQLite + SQLCipher for MVP (PowerSync as future path). Post-session feedback simplified to free-form text only in MVP (structured flags future). Plan modification: no full conversation history retained — plan context record is the continuity mechanism. TTS voice: platform default for MVP. Orientation: portrait only. Mid-session exit: default to resume; explicit End Session requires confirmation dialog. Exercise detail bottom sheet added to MVP scope (full form cues + YouTube link). Walking skeleton simplified to match updated MVP scope. All open questions closed. |

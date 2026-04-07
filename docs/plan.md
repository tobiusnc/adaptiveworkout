# Implementation Plan — Walking Skeleton (PRD §11) + Full MVP
# Generated: 2026-04-03 (reconstructed 2026-04-05)
# Status: IN PROGRESS

---

## Phase 1 — Package Installs + Entry Point — DONE
**Scope:**
- Install expo-dev-client, expo-secure-store, @op-engineering/op-sqlite, jest-expo,
  @testing-library/react-native, @types/jest (npx expo install)
- Install @anthropic-ai/sdk (npm install — not in Expo registry)
- Switch package.json "main" to "expo-router/entry"
- Add ESLint config (eslint-config-expo)
- Create .env with EXPO_PUBLIC_ANTHROPIC_API_KEY placeholder; confirm .gitignore covers it
- Update app.json plugins (remove expo-sqlite, add op-sqlite config plugin)
- Record model-names decision in docs/decisions.md
**Done condition:** `npx expo start` launches without errors; ESLint runs clean.

---

## Phase 2 — Types + Screen Stubs + Navigation — DONE
**Scope:**
- Create src/ai/models.ts (model name constants mirroring architecture.md)
- Create src/types/index.ts (all 25 types/interfaces from schema.md)
- Create app/_layout.tsx (Stack navigator)
- Create app/index.tsx, app/session/[id].tsx, app/session/feedback.tsx (screen stubs)
- Delete root index.ts stub
**Done condition:** Navigation stack compiles; all screens reachable; tsc --noEmit clean.

---

## Phase 3 — Storage Layer — DONE
**Scope:**
- Create src/storage/StorageService.ts (abstract interface)
- Create src/storage/OpSqliteStorageService.ts (op-sqlite + SQLCipher implementation)
- Encryption key management via expo-secure-store (Android Keystore-backed)
- Schema migrations pattern (additive only)
- Implement: saveSession, getSession, saveProfile, getProfile, savePlan, getPlan,
  saveExercise, getExercisesForSession, saveSessionFeedback, getSessionFeedback,
  updatePlanContextRecord, getPlanContextRecord
**Done condition:** Storage layer initialises; SQLCipher key generated once and persisted.

---

## Phase 4 — Zustand Store + Home Screen — DONE
**Scope:**
- Create src/store/workoutStore.ts (Zustand store wrapping StorageService)
- Implement store actions: initialize, loadSession, savePlanFromDraft
- Build app/index.tsx home screen: session list, last-run indicator, onboarding redirect
**Done condition:** Home screen renders session list from store; navigates to session screen.

---

## Phase 5 — AI Onboarding Conversation — DONE
**Scope:**
- Build onboarding conversation UI (one question at a time, option buttons + free-form input)
- Collect all PRD §2.2 required fields + future-use fields
- Output structured UserProfile object
- Navigate to plan generation on completion
**Done condition:** Full onboarding conversation completes and produces a valid UserProfile.

---

## Phase 6 — Plan Draft Acceptance Flow — DONE
**Scope:**
- Wire onboarding output → generatePlan stub → plan draft screen
- Build plan draft review UI (session list preview)
- Accept: call savePlanFromDraft, navigate to home
- Reject: return to onboarding
- frozenProfile pattern: profile saved once at acceptance, not at each onboarding step
**Done condition:** Onboarding → draft → accept → home screen shows plan sessions.

---

## Phase 7 — Real generatePlan() API Call — DONE
**Scope:**
- Replace stub in src/ai/generatePlan.ts with real Anthropic API call
- Write engineered system prompt (src/ai/prompts/generatePlan.ts), bump version to 2
- Tool use via submit_plan tool (tool_choice forced)
- AbortController 30s timeout; one network retry with 2s backoff on timeout/5xx
- Zod validation with up to 2 validation retries using tool_result / is_error: true
- Token logging (model + inputTokens + outputTokens + promptVersion) and error logging
- Use REASONING_MODEL from src/ai/models.ts (never hardcode)
**Done condition:** End-to-end: onboarding → generatePlan → savePlanFromDraft → home shows sessions.

---

## Phase 8 — Session Execution Screen — DONE
**Scope:**
- Build app/session/[id].tsx — full execution state machine (HOLD | RUNNING | PAUSED | REP | AUTO | DONE)
- Extract buildStepSequence() to src/session/buildStepSequence.ts (pure function, testable)
- Construct full ExecutionStep[] from Session + Exercise[] before execution begins (PRD §6.2)
- Bilateral timed: Left → Right steps, durationSec per-side, no rest between sides
- Bilateral rep: single step, "N reps each side"
- restBetweenRoundsSec < 5 → skip between-round rest (PRD §6.1)
- Controls: Go, Done, Pause, Resume, Skip, Prev, End Session (confirm dialog)
- DONE state: completion screen with Finish button (not instant navigation)
- loadSession on mount; clearCurrentSession on unmount
**Done condition:** Full resistance circuit executes start to finish; all controls work; tsc clean.

---

## Phase 9 — TTS Voice Guidance — DONE
**Scope:**
- Install expo-speech and expo-audio
- Create src/session/useTTS.ts (custom hook):
  - Audio session setup on mount: setAudioModeAsync({ duckOthers })
  - Audio session teardown on unmount: Speech.stop() then restore mixWithOthers
  - announceStep(index, steps): branches on stepKind for announcement text
  - announceDone(): "Session complete"
  - announceCountdown(n): speaks "3", "2", "1" only
  - stopSpeech(): Speech.stop() fire-and-forget
- Wire into app/session/[id].tsx at all step transitions and pause/resume
- 3-2-1 countdown useEffect watching secondsLeft
**Done condition:** TTS fires at step transitions; audio ducks; 3-2-1 countdown works.

---

## Phase 10 — Post-Session Feedback Screen — DONE
**Scope:**
- Build app/session/feedback.tsx (replace stub):
  - Free-form text input with placeholder "How did it feel? Anything to change?"
  - Mic button deferred (STT deferred to post-MVP)
  - "Save & Done" — writes SessionFeedback to store with timestamp + sessionId; navigate home
  - "Skip" — no write; navigate home
- Wire renderComplete() in [id].tsx to navigate to feedback screen with isComplete: true
- Update store (src/store/useAppStore.ts): pendingFeedback state + setPendingFeedback + saveFeedback actions
- Handle "End Session" early exit → two-step Alert → optional feedback with isComplete: false
**Done condition:** Full session completion navigates to feedback; Save writes to store; Skip bypasses.

---

## Phase 11 — Progress Strip + Exercise Detail Bottom Sheet
**Scope:**
- Progress indicator strip (PRD §6.9):
  - One dot per exercise in the current round
  - Active exercise dot visually distinct; completed exercises marked
  - Displayed during execution in app/session/[id].tsx
- Exercise detail bottom sheet (PRD §6.8):
  - Tap exercise name during a work step → pause timer → open bottom sheet
  - Shows: exercise name, equipment, rep/duration target, full form cues (not truncated)
  - "Watch on YouTube" button → opens YouTube search URL in device browser
  - Swipe down or Close → dismiss sheet, resume timer from where it paused
**Done condition:** Progress strip updates as steps advance; bottom sheet opens/closes; timer pauses/resumes correctly.

---

## Phase 12 — Mid-Session Backgrounding + Resume
**Scope:**
- PRD §6.7: timer continues running while app is backgrounded
- On return: session at correct point, timer state intact
- PRD §6.7: device back button / navigate-away mid-session → persist session state immediately
- On next app open: "Resume session?" prompt with Yes / End options
- Use Expo background task API (foreground service for Android 15 audio policy compliance)
**Done condition:** Background a running session; return; timer is correct. Force-close and reopen; Resume prompt shown.

---

## Phase 13 — Plan Chat + Context Record + summarizeContextRecord
**Scope:**
- Plan Chat interface (PRD §4.3):
  - Persistent entry point from home screen
  - AI opens with acknowledgement of current plan + invitation to describe change
  - modifyPlan() AI function: current plan + context record + conversation → diff object + plain-language summary
  - Before/after preview scoped to only affected sessions/exercises
  - "Apply Change" / "Don't Apply" buttons; no write until confirmed
  - Error state: user-friendly message, plan not modified
- Plan context record (PRD §4.4):
  - AI appends to record when preference/constraint established
  - Record visible to user
  - summarizeContextRecord() AI function: condenses record when large (Haiku model)
- Plan iteration before acceptance (PRD §2.3, deferred from Phase 6):
  - After generatePlan draft, allow natural language iteration before savePlanFromDraft
**Done condition:** User can chat, see a before/after diff, apply or reject a change; context record persists across sessions.

---

## Summary

| Phase | Feature | Status |
|---|---|---|
| 1 | Package installs + entry point | DONE |
| 2 | Types + screen stubs + navigation | DONE |
| 3 | Storage layer | DONE |
| 4 | Zustand store + home screen | DONE |
| 5 | AI onboarding conversation | DONE |
| 6 | Plan draft acceptance flow | DONE |
| 7 | Real generatePlan() API call | DONE |
| 8 | Session execution screen | DONE |
| 9 | TTS voice guidance | DONE |
| 10 | Post-session feedback screen | TODO |
| 11 | Progress strip + exercise detail bottom sheet | TODO |
| 12 | Mid-session backgrounding + resume | TODO |
| 13 | Plan Chat + context record + summarizeContextRecord | TODO |

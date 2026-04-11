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
# Generated: 2026-04-11
# Status: IN PROGRESS

### Phase 13.1 — Schema Update
**Scope:**
- Update `docs/schema.md` to v1.5:
  - Add `recentFeedback: SessionFeedback[]` to `ModifyPlanInput`
  - Add comment to `contextRecordUpdate` clarifying it is full replacement content (not a delta)
- Add v1.5 entry to the schema Change Log

**Agent:** Claude Code (docs edit only)
**Done condition:** `docs/schema.md` updated and version bumped to v1.5.

---

### Phase 13.2 — AI Layer: `modifyPlan`
**Scope:**
- Create `src/ai/prompts/modifyPlan.ts` — system prompt + prompt version constant
  - Instructs AI to read context record, resolve scope (program-wide / single session /
    ask one clarifying question if ambiguous), call `submit_modification` tool only when
    proposing changes (not for clarifications), and return `contextRecordUpdate` with
    full replacement content when a meaningful new preference is established; null otherwise
- Create `src/ai/modifyPlan.ts`:
  - `ModifyPlanResult` discriminated union:
    `{ type: 'clarification'; message: string }` | `{ type: 'proposal'; output: ModifyPlanOutput }`
  - `ModifyPlanError` error class
  - Zod validation schema for `ModifyPlanOutput`
  - `submit_modification` tool definition (JSON Schema matching `ModifyPlanOutput`)
  - `tool_choice: { type: 'auto' }` — AI chooses text (clarification) or tool call (proposal)
  - Response type detection: `tool_use` block → proposal path; `text` block only → clarification path
  - Input assembly from `ModifyPlanInput` (current plan, sessions, exercises, context record,
    conversation, recent feedback)
  - Validation-retry loop (max 2 retries, proposal path only)
  - PRD §5.3 contract: async, 30 000 ms timeout, one network retry with 2s backoff on
    timeout/5xx, token logging (model + promptVersion + inputTokens + outputTokens),
    error logging; throws `ModifyPlanError` when all retries fail
  - Uses `REASONING_MODEL` from `src/ai/models.ts`

**Agent:** ai-layer
**Done condition:** `modifyPlan.ts` compiles; all PRD §5.3 items present; discriminated union
return type handles both clarification and proposal paths; TypeScript clean.

---

### Phase 13.3 — AI Layer: `summarizeContextRecord`
**Scope:**
- Create `src/ai/prompts/summarizeContextRecord.ts` — system prompt + prompt version constant
  - Instructs AI to condense context record, preserving high-signal persistent facts
    (physical limitations, equipment constraints, strong preferences) and dropping
    transient or superseded entries; return full replacement content
- Create `src/ai/summarizeContextRecord.ts`:
  - `SummarizeContextRecordError` error class
  - Zod validation schema for `SummarizeContextRecordOutput`
  - `submit_summary` tool definition; `tool_choice: { type: 'tool' }` (always structured)
  - Input assembly from `SummarizeContextRecordInput`
  - Validation-retry loop (max 2 retries)
  - PRD §5.3 contract: async, 30 000 ms timeout, one network retry, token logging, error logging
  - Uses `SUMMARIZATION_MODEL` (claude-haiku-4-5-20251001)
  - Fallback: throw `SummarizeContextRecordError`; caller skips condensation and retains
    existing record (non-blocking failure)

**Agent:** ai-layer (continue Phase 13.2 session)
**Done condition:** `summarizeContextRecord.ts` compiles; uses `SUMMARIZATION_MODEL`;
all PRD §5.3 items present; TypeScript clean.

---

### Phase 13.4 — Storage: `applyPlanModification`
**Scope:**
- Add `applyPlanModification(planId: string, output: ModifyPlanOutput): Promise<void>`
  to `StorageService` interface
- Implement in `OpSqliteStorageService` as a single atomic SQLite transaction:
  - If `output.planChanges` non-null: read existing Plan, merge partial fields, write back
  - For each `SessionChange`:
    - `'add'`: generate new UUID, insert Session row + exercises from `sessionDraft`
    - `'update'`: read existing Session by `sessionId`, merge `Partial<SessionDraft>`, write back;
      apply nested `exerciseChanges`
    - `'remove'`: delete all Exercise rows for `sessionId`, then delete Session row
  - For each `ExerciseChange` (within an update session):
    - `'add'`: generate new UUID, insert Exercise row
    - `'update'`: read existing Exercise by `exerciseId`, merge `Partial<ExerciseDraft>`, write back
    - `'remove'`: delete Exercise row
  - If `output.contextRecordUpdate` non-null:
    - `getContextRecord(planId)` → exists: `updateContextRecord`; null: `saveContextRecord`
  - Full rollback on any failure; throw `StorageError('QUERY_FAILED')` on DB error

**Agent:** Claude Code (pure TypeScript storage layer — no RN runtime calls)
**Done condition:** Interface updated; implementation compiles; TypeScript clean.

---

### Phase 13.5 — UI: Plan Chat Screen
**Scope:**
- Create `app/plan-chat.tsx`:
  - Ephemeral `ConversationMessage[]` state — initialised on mount, not persisted
  - On mount: display hardcoded opening message acknowledging the active plan name and
    inviting the user to describe what they want to change (no API call)
  - Scrollable message thread (user messages right-aligned, AI messages left-aligned)
  - Text input + Send button at bottom
  - On Send:
    - Append user message to conversation
    - Call `modifyPlan` with current plan data, sessions, exercises, context record,
      conversation, and recent feedback (last 5 records)
    - Show loading indicator during call
    - On `type === 'clarification'`: append AI message to thread, await next input
    - On `type === 'proposal'`: show before/after preview inline (see below)
    - On error: show user-friendly error message in thread; do not modify plan
  - Before/after preview (inline in thread below AI summary message):
    - Primary: render affected sessions/exercises as before/after from
      `sessionChanges` / `planChanges`
    - Fallback: display `output.summary` text only if diff rendering is impractical
    - "Apply Change" button and "Don't Apply" button
  - On "Apply Change":
    - Call `applyPlanModification`
    - If `contextRecordUpdate !== null` and new `content.length > 3000`:
      call `summarizeContextRecord` and update context record with condensed result;
      on `SummarizeContextRecordError`: log and skip (non-blocking)
    - Navigate back to home screen
  - On "Don't Apply": dismiss preview, conversation continues

**Agent:** expo-dev
**Done condition:** Screen renders; opening message on mount; multi-turn clarification works;
proposal preview shows Apply/Don't Apply; Apply writes to store and navigates home;
all loading/error states handled.

---

### Phase 13.6 — UI: FAB + Navigation Wiring
**Scope:**
- Create `src/components/PlanChatButton.tsx` — reusable FAB-style button:
  - Visible only when an active plan exists
  - Taps navigate to `plan-chat` route via Expo Router
  - Designed for reuse across multiple screens in future
- Add `PlanChatButton` to `app/index.tsx` (home screen)
- `plan-chat` route is already registered by the file created in Phase 13.5

**Agent:** expo-dev (continue Phase 13.5 session)
**Done condition:** FAB renders on home screen when active plan exists; hidden when no plan;
tapping opens Plan Chat screen.

---

### Phase 13.7 — Tests
**Scope:**
- `src/ai/__tests__/modifyPlan.test.ts`:
  - Clarification path: text-only response → `{ type: 'clarification' }`
  - Proposal path: tool_use response → validates and returns `{ type: 'proposal' }`
  - Validation retry: first response fails Zod, second succeeds
  - Network retry: first call throws AbortError, second succeeds
  - All retries exhausted → throws `ModifyPlanError`
  - Token logging called on each successful API response
- `src/ai/__tests__/summarizeContextRecord.test.ts`:
  - Happy path: returns condensed content
  - Validation retry on malformed response
  - All retries exhausted → throws `SummarizeContextRecordError`
- Storage tests for `applyPlanModification`:
  - Plan-only change
  - Session update with exercise changes
  - Session add (new UUID assigned)
  - Session remove (cascades to exercises)
  - Context record upsert (create when absent, update when present)
  - Transaction rollback on mid-apply failure
- All existing 162 tests continue to pass

**Agent:** test-writer (FRESH session always)
**Done condition:** All new tests pass; no regressions; TypeScript clean.

---

**Phase 13 overall done condition:** User can open Plan Chat from home screen, conduct a
multi-turn conversation, see a before/after diff, apply or reject a change, and have the
context record persist and auto-condense across sessions.

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

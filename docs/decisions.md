# Architectural Decision Log — Adaptive Workout App
# Append-only. Never delete or modify existing entries.
# Add entries via /log-decision or manually after key decisions.

## Entry Format
### 2026-03-29 — [Decision Title]
**Decision:** [what was decided]
**Alternatives considered:** [what else was evaluated]
**Reasoning:** [why this option was chosen]
**Implications:** [what this constrains]
**Revisit if:** [conditions that would change this]

---

### 2026-03-29 — Initial Stack Selection
**Decision:** React Native / Expo SDK 55 / TypeScript / zustand / powersync-sqlcipher
**Alternatives considered:** Flutter, native iOS/Android
**Reasoning:** Single codebase, strong TypeScript support, managed workflow.
**Implications:** Tied to Expo SDK upgrade cycle.
**Revisit if:** Expo falls significantly behind React Native core.

---

### 2026-04-03 — MVP Storage: SQLite + SQLCipher (not PowerSync)
**Decision:** Use SQLite + SQLCipher directly for MVP local storage. PowerSync is the future cloud-sync path.
**Alternatives considered:** PowerSync in local-only mode from day one.
**Reasoning:** PowerSync local-only mode adds complexity with no MVP benefit. Clean storage abstraction layer makes the future switch to PowerSync a layer-swap only, with no schema or application code changes.
**Implications:** All reads/writes must go through a storage abstraction layer — never call SQLite directly from application code.
**Revisit if:** Cloud sync is needed sooner than expected.

---

### 2026-04-03 — Audio: expo-speech (TTS) + expo-audio (ducking)
**Decision:** expo-speech for TTS announcements; expo-audio with duckOthers for audio ducking.
**Alternatives considered:** expo-av (older unified audio library), pre-generated audio files (web app workaround).
**Reasoning:** expo-speech uses platform native TTS with no cost or service dependency. expo-audio is the current Expo audio library with explicit AudioFocus/duckOthers support. Pre-generated files are not scalable when AI generates dynamic exercise names.
**Implications:** constraints.md "Audio: expo-av only" rule should be updated to "expo-speech + expo-audio." TTS voice is platform default for MVP.
**Revisit if:** TTS quality is unacceptable; consider adding voice preference setting.

---

### 2026-04-03 — Voice Input (STT) Deferred to Post-MVP
**Decision:** No speech-to-text command input ("done", "next", "pause") in MVP. All session controls are touch-only.
**Alternatives considered:** expo-speech-recognition with contextualStrings and continuous mode (fully specced in prior PRD versions).
**Reasoning:** Adds native module complexity and reliability challenges (restart-loop required) with limited MVP value. Touch controls are sufficient.
**Revisit if:** User testing shows strong demand; expo-speech-recognition New Architecture compatibility confirmed.

---

### 2026-04-03 — Heart Rate Integration Deferred to Post-MVP
**Decision:** No BLE HRM, no Android Health Connect, no HR display, no HR-based rest extension in MVP.
**Alternatives considered:** react-native-ble-plx + Android Health Connect (fully specced in prior PRD versions).
**Reasoning:** Adds significant complexity (BLE pairing, background data, HR zone logic) with no dependency from any MVP feature. Schema must accommodate future HR time-series without breaking changes.
**Revisit if:** Core loop is stable and user requests HR features.

---

### 2026-04-03 — Cardio Session Execution Removed from Scope
**Decision:** Cardio session execution (rowing, cycling, running) is out of scope and not planned for any specific future milestone.
**Alternatives considered:** Including cardio as MVP alongside resistance (was in prior PRD versions).
**Reasoning:** JD's workout plan is resistance-only. Cardio session type adds a distinct execution model. No current user need.
**Revisit if:** User explicitly requests cardio tracking.

---

### 2026-04-03 — Post-Session Feedback: Free-Form Text Only for MVP
**Decision:** Post-session feedback is a single free-form text comment with optional voice transcription. No structured per-exercise flags or effort ratings in MVP.
**Alternatives considered:** Structured feedback (too easy / just right / too hard per exercise + overall effort rating).
**Reasoning:** JD described feedback as informal and conversational ("the TRX plank is too hard, let's replace that"). Structured flags add UI complexity with no MVP benefit; they feed into AI adaptation which is also post-MVP.
**Revisit if:** AI adaptation suggestions are added; structured signals will be needed then.

---

### 2026-04-03 — Pre-Session Intensity Dial Deferred to Post-MVP
**Decision:** No pre-session intensity dial (reduce / normal / push) in MVP.
**Alternatives considered:** Including dial as pre-execution step (was in prior PRD versions).
**Reasoning:** Requires in-memory session mutation logic and adds a friction step before every workout. No MVP user need identified.
**Revisit if:** User requests ability to scale a session on the fly.

---

### 2026-04-03 — Portrait Orientation Only for MVP
**Decision:** App is portrait-only for MVP. No landscape support.
**Alternatives considered:** Full orientation support.
**Reasoning:** Simplifies layout decisions significantly. Workout execution is naturally a portrait use case (phone in hand or on stand). Android MVP hardware is portrait-primary.
**Revisit if:** Tablet use case emerges.

---

### 2026-04-03 — Mid-Session Exit Defaults to Resume
**Decision:** Backgrounding or locking the screen mid-session keeps the timer running and resumes on return. An explicit "End Session" button requires a confirmation dialog before exiting.
**Alternatives considered:** Always pause on background; return to session select on exit.
**Reasoning:** Timer continuity matches real workout behavior (phone locked in pocket). Accidental back-button exits are common; confirmation prevents data loss.
**Revisit if:** Background timer causes battery complaints.

---

## [DECISION] Model names stored as TypeScript constants — not read from markdown at runtime
Date: 2026-04-03
Status: Decided
Context: architecture.md lists the canonical model names, but markdown files are not readable at React Native runtime via Metro.
Decision: Define model names as TypeScript string constants in src/ai/models.ts, mirroring architecture.md values.
Rationale: Avoids Metro transformer complexity (no require() for .md files). Constants are type-checked, refactorable, and verifiable at build time.
Consequences: architecture.md remains the human-readable source; models.ts is the runtime source. They must be kept in sync manually.

---

## [DECISION] loadSessions as a Zustand store action, not a direct screen service call
Date: 2026-04-03
Status: Decided
Context: Home screen needs the session list for the active plan. Could call storageService.getSessionsByPlan() directly from the screen, or expose it as a store action.
Decision: Add loadSessions(planId) to the Zustand store, storing results in planSessions state.
Rationale: Consistent with the existing loadSession pattern. Keeps screens storage-agnostic and mockable via useAppStore.setState in tests. planSessions may be needed from multiple screens in later phases.
Consequences: All home screen session list reads go through the store. Direct service calls from screens remain a pattern violation.

---

## [DECISION] Design tokens in src/styles/tokens.ts — skeleton baseline
Date: 2026-04-03
Status: Decided
Context: Phase 5 (home screen) is the first screen with real UI. No design system exists yet.
Decision: Create src/styles/tokens.ts with colors, spacing, and typography constants. All new screens consume tokens rather than hard-coding values.
Rationale: Establishes a single place to update when visual design is applied. Prevents hard-coded magic numbers spreading across files from the first screen onward.
Consequences: Token values are placeholder and will be revised. Screens import from tokens — never define raw color/size values inline.

---

## [DECISION] No-plan redirect uses router.replace, not router.push
Date: 2026-04-03
Status: Decided
Context: When no active plan exists, home screen must redirect to onboarding.
Decision: Use router.replace('/onboarding') and register onboarding with headerBackVisible: false.
Rationale: router.push would leave home screen in the stack — pressing back from onboarding would return to the empty home screen, which immediately redirects again (navigation loop). replace removes home from the stack entirely.
Consequences: From onboarding, back navigation leads to the OS home screen, not app/index. After onboarding completes (future phase), it must push to index rather than relying on back.

---

## [DECISION] generatePlan stubbed — ai-layer agent implements real call
Date: 2026-04-03
Status: Decided
Context: Phase 6 requires a generatePlan() call, but the Anthropic API prompt engineering belongs to the ai-layer agent in a dedicated session.
Decision: generatePlan() is a typed stub returning hardcoded GeneratePlanOutput. Call contract (PRD §5.3 timeout/retry/logging) is documented in comments but not yet implemented.
Rationale: Unblocks the onboarding screen and establishes the interface contract before the AI implementation. Separates RN screen work (expo-dev) from AI work (ai-layer).
Consequences: Production plan generation does not work until the ai-layer agent replaces the stub body. GENERATE_PLAN_PROMPT_VERSION must be bumped when the real prompt is written.

---

## [DECISION] Prompts stored as TypeScript string constants, not external files
Date: 2026-04-03
Status: Decided
Context: PRD §5.4 says prompts are stored in "local files" read via loadPrompt(). React Native's Metro bundler cannot access arbitrary filesystem paths at runtime.
Decision: Store prompt strings as exported TypeScript constants in src/ai/prompts/<functionName>.ts. Version constant in the same file. loadPrompt() is a direct import — no runtime file I/O.
Rationale: Only option that works in the Metro bundle environment. Constants are type-checked, tree-shakeable, and trivially importable in tests.
Consequences: "Remote config with local fallback" future path (PRD §5.4) will require a loadPrompt() abstraction that checks a remote source first and falls back to the local constant. Architecture is compatible — function signature can stay the same.

---

## [DECISION] savePlanFromDraft updates store state directly, does not re-run initialize()
Date: 2026-04-03
Status: Decided
Context: After onboarding writes a plan to storage, the store must reflect the new activePlan. Two options: re-run initialize() (re-reads DB) or directly set({ activePlan: plan }) with data already in memory.
Decision: Direct set() call — no re-run of initialize().
Rationale: All data is already in memory after the write. Re-running initialize() would briefly set isInitializing: true, causing the layout to render a blank screen. Direct update is atomic, avoids the flash, and is semantically precise.
Consequences: If savePlanFromDraft is called and the DB write fails partway through, store state and DB may diverge. Callers must handle thrown errors and not navigate on failure.

---

## [DECISION] Natural language plan iteration before acceptance deferred to post-Phase 6
Date: 2026-04-03
Status: Decided
Context: PRD §2.3 describes a natural language conversation after initial plan generation where the user can iterate before accepting. Phase 6 handoff does not include this.
Decision: Phase 6 onboarding: questionnaire → generatePlan → save → navigate to home. No iteration step.
Rationale: Iteration requires a chat UI and multiple AI round-trips — a meaningful addition beyond the questionnaire. Not in the walking skeleton scope and not specified in the Phase 6 handoff.
Consequences: After onboarding, users land on the home screen with the generated plan already active. Plan iteration is available via Plan Chat (a later phase).

---

## [DECISION] PlanContextRecord created at first modification conversation, not at onboarding
Date: 2026-04-03
Status: Decided
Context: PlanContextRecord is AI-maintained (PRD §4.4). No content exists at onboarding time — the AI populates it during modification conversations.
Decision: No PlanContextRecord row is created during onboarding. The record is created by the ai-layer when the first modifyPlan conversation occurs.
Rationale: An empty record adds no value. Creation at the moment of first meaningful content (plan modification) is semantically correct and avoids unnecessary DB writes.
Consequences: getContextRecord(planId) will return null for plans that have never been modified. All callers of getContextRecord must handle the null case.

---

## [DECISION] Multi-table writes use a dedicated atomic StorageService method (transaction pattern)
Date: 2026-04-04
Status: Decided
Context: savePlanFromDraft writes a plan row, N session rows, and M exercise rows via individual saveX() calls. A failure mid-loop leaves orphaned rows behind. On retry, savePlanFromDraft generates new UUIDs so there are no UNIQUE conflicts — but the orphaned rows remain, and getActivePlan (LIMIT 1, no ORDER BY) may return a ghost plan instead of the new one.
Decision: Any operation that writes to more than one table must be exposed as a single method on StorageService (e.g. savePlanComplete) and implemented with BEGIN / all inserts / COMMIT, with ROLLBACK on any failure. The store or screen assembles all entities in memory first, then calls the atomic method once.
Alternatives considered: Exposing beginTransaction/commit/rollback primitives on StorageService (too easy to misuse); INSERT OR REPLACE everywhere with frozen UUIDs across retries (doesn't prevent ghost active-plan rows); cleaning up orphaned rows on retry (requires knowing what was written).
Rationale: A transaction is the only guarantee of atomicity. The dedicated-method pattern keeps transaction management inside the storage layer where it belongs and keeps the store and screen code simple. Callers pass fully assembled entities; they do not manage rollback.
Consequences: Any future feature that writes to multiple tables (e.g. saving session feedback that also updates plan context) must follow the same pattern. See constraints.md.

---

## [DECISION] @anthropic-ai/sdk installed via npm install (exception to npx expo install rule)
Date: 2026-04-03
Status: Decided
Context: docs/constraints.md requires all packages to be installed via `npx expo install`. However, @anthropic-ai/sdk is a pure JS/TypeScript SDK with no native modules and is not in the Expo package registry.
Decision: Install @anthropic-ai/sdk via `npm install` only. All packages with native modules continue to use `npx expo install`.
Rationale: `npx expo install` only resolves packages in Expo's version alignment registry. Pure SDK packages outside that registry install correctly via npm with no version conflict risk.
Consequences: Exception documented here. Any future pure-JS SDKs without native modules may follow the same pattern with a new decisions.md entry.

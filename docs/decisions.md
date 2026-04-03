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

## [DECISION] @anthropic-ai/sdk installed via npm install (exception to npx expo install rule)
Date: 2026-04-03
Status: Decided
Context: docs/constraints.md requires all packages to be installed via `npx expo install`. However, @anthropic-ai/sdk is a pure JS/TypeScript SDK with no native modules and is not in the Expo package registry.
Decision: Install @anthropic-ai/sdk via `npm install` only. All packages with native modules continue to use `npx expo install`.
Rationale: `npx expo install` only resolves packages in Expo's version alignment registry. Pure SDK packages outside that registry install correctly via npm with no version conflict risk.
Consequences: Exception documented here. Any future pure-JS SDKs without native modules may follow the same pattern with a new decisions.md entry.

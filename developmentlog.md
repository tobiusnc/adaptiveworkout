# Development Log — Adaptive Workout App
# Ongoing record of design decisions, process, and rationale.
# Intended as a portfolio artifact — written for a technical reader unfamiliar with the project.
# Appended automatically on every /handoff.

---

## 2026-03-29 — Project Initialization

**Goal:** Establish project scaffolding and tooling before any code is written.

**Activities:**
- Initialized git repository and Claude Code project
- Installed minimal Claude Code toolkit (CLAUDE.md, docs structure, commit hooks, agent routing)
- Created placeholder docs: PRD.md, architecture.md, constraints.md, decisions.md, schema.md, handoff.md
- Established commit format convention: `feat|fix|refactor|docs|test|chore|WIP|checkpoint`

**Outcome:** Project scaffolding in place. No application code yet. Next step identified as filling in PRD.md before any feature planning begins.

---

## 2026-04-04 — Phase 6: Onboarding Screen

**Goal:** Replace the onboarding stub with a real 7-step questionnaire that collects the user profile, generates a plan via the AI layer, persists everything to storage, and navigates to the home screen.

**What was built:**

**`src/ai/prompts/generatePlan.ts`** — Prompt storage decision: React Native's Metro bundler cannot read arbitrary files at runtime, so "local files" (PRD §5.4) must be TypeScript string constants in the bundle. The file exports `GENERATE_PLAN_PROMPT_V1` (placeholder) and `GENERATE_PLAN_PROMPT_VERSION` (integer). The ai-layer agent fills in the real prompt in the next phase. Bumping the version constant triggers the logging requirement in PRD §5.4 automatically — every AI call logs the version alongside token counts.

**`src/ai/generatePlan.ts`** — A typed stub that defines the permanent interface. The function signature, `GeneratePlanError` class, and the full PRD §5.3 call contract (30 000 ms timeout, retry with backoff, token logging, error logging) are documented in comments and will not change when the ai-layer agent replaces the body. The stub returns a hardcoded `GeneratePlanOutput` with a realistic full session (warm-up, 3-exercise main circuit, cooldown, bilateral between-round stretch) so manual testing has value before the real AI call exists. The 800 ms artificial delay lets the loading state be exercised.

**`src/store/useAppStore.ts` — two new actions:**

`saveProfile(profile)` — persists to storage, updates `state.profile`. Clean separation: the onboarding screen builds the profile object; the store owns the write.

`savePlanFromDraft(output)` — the conversion layer between AI output and storage entities. Handles the only non-trivial mapping in Phase 6: `SessionDraft.betweenRoundExercise` is an inline draft in the AI output but must become a separate `Exercise` row (phase: null) in storage, with its generated UUID written back to `Session.betweenRoundExerciseId`. This conversion lives in the store rather than the screen to keep screens storage-agnostic. Store state is updated directly (`set({ activePlan: plan })`) rather than re-running `initialize()` — avoids the `isInitializing` flash and unnecessary DB round-trips since all data is already in memory.

**`app/onboarding.tsx`** — Several design decisions worth noting:

*Discriminated union step types.* `WizardStep = StructuredStep | FreeFormStep` and `StepAnswer = StructuredSingleAnswer | StructuredMultiAnswer | FreeFormAnswer`. TypeScript enforces exhaustive handling at every switch — adding a step type in the future produces compile errors at every un-updated branch rather than silent runtime bugs.

*Flat answer array.* Seven parallel `useState` calls would have required seven handler functions with identical shapes. A single `answers: StepAnswer[]` array with a copy-on-write `replaceAnswer` helper centralises mutation logic.

*Equipment multi-select coexistence.* For steps 1, 3, 4, 5 — selecting an option clears free-form text; typing clears the selected option (strictly mutually exclusive). For step 2 (equipment) — selected options and free-form text coexist, because `equipment` is `string[]` and the user may legitimately want both preset options and a custom item. Free-form is comma-split at profile assembly time.

*Frozen profile for retry.* `Crypto.randomUUID()` is called once when the user presses "Generate my plan." The resulting profile is stored in `frozenProfile` state. The Retry button passes this directly to `runGeneration` — no new UUID is generated, no duplicate profile record is created in SQLite on retry.

*Known latent issue identified:* If `saveProfile` succeeds but `savePlanFromDraft` fails on the first attempt, the Retry will call `saveProfile` again. `OpSqliteStorageService.saveProfile` uses `INSERT` not upsert — this may fail on the duplicate profile ID. Flagged in the handoff for the next session to verify before releasing.

**Outcome:** Phase 6 complete. Compiler and linter clean. The onboarding-to-home path is end-to-end wired with a stub AI call. Phase 7 replaces the stub with a real Anthropic API call.

---

## 2026-04-03 — Requirements, PRD, and Schema Design

### Part 1: Requirements and PRD

**Context:** The project has an existing web app (`workout_plan_v4.html`, `resistance-timer.html`) that represents the original manual workflow — a static HTML workout plan and a separate browser-based timer. The goal of this application is to replace that workflow with an AI-driven native app that owns the full loop: generate → execute → capture → adapt.

**Activities:**
- Analyzed `workout_plan_v4.html` and `resistance-timer.html` to understand the existing approach and the seam between plan generation and execution that this app is designed to eliminate
- Conducted a full requirements conversation covering open questions across all subsystems: storage, audio, voice input, HR integration, feedback, navigation, session structure, and platform scope
- Discovered a root `PRD.md` (v0.8) with mature architectural detail that predated the session's in-progress draft
- Merged both documents into `docs/PRD.md` v1.0 — single authoritative PRD

**Key decisions made (see docs/decisions.md for full entries):**
- **Storage:** SQLite + SQLCipher for MVP. PowerSync is the future cloud-sync path. A storage abstraction layer ensures the future switch requires no application code changes.
- **Audio:** `expo-speech` for TTS (platform native, no cost/service dependency) + `expo-audio` with `duckOthers` for ducking. Background music from external apps (e.g. Spotify) continues uninterrupted, ducking briefly during announcements.
- **Voice input (STT):** Deferred to post-MVP. Touch controls are sufficient; STT adds native module complexity with limited MVP value.
- **HR integration:** Deferred to post-MVP. Significant complexity, no MVP dependency.
- **Cardio sessions:** Removed from scope entirely. Resistance-only for MVP.
- **Post-session feedback:** Free-form text only for MVP. Structured per-exercise flags deferred.
- **Mid-session exit:** Timer continues in background; defaults to resume on return. Explicit "End Session" requires confirmation.
- **Orientation:** Portrait-only for MVP.

**Outcome:** `docs/PRD.md` v1.0 complete. All open questions closed. No placeholder sections remain.

---

### Part 2: Schema Design

**Context:** The PRD mandates that data design precedes code — no feature is implemented until its data representation is defined in `docs/schema.md`. This session covered the full MVP schema design through a collaborative design conversation.

**Design process and rationale:**

**UserProfile and Plan** were straightforward. Key choices:
- `equipment` stored as `string[]` (free-form) rather than a typed enum — the AI matches exercises to equipment from natural language; locking the onboarding options into the schema adds constraint with no benefit.
- `targetDuration` stored as a range enum (`'20-30' | '30-45' | '45-60' | '60+'`) matching onboarding options, so the AI can balance sessions across the plan to fit within the user's preferred range rather than targeting a single midpoint.
- Session config values are copied explicitly from the Plan at AI generation time (no runtime inheritance). This lets the AI freely vary rest periods, work intervals, etc. per session without the runtime needing to resolve an inheritance chain.

**Exercise entity — unified model:** The original PRD listed `WarmupItem`, `Exercise`, and `CooldownItem` as separate entities. During design review it became clear these are structurally identical — a warmup exercise can have any characteristic of a main exercise. A single `Exercise` entity with a `phase` field (`'warmup' | 'main' | 'cooldown' | null`) covers all cases. Phase drives execution sequencing; the runtime handles phase-specific behavior (warmup executes once, main executes N rounds, cooldown executes once).

**Between-round stretch — absorbed into rest gap:** The original PRD treated the between-round stretch as a separate entity. During design review this was simplified: the stretch is just an Exercise (phase: null), optionally linked from the Session via `betweenRoundExerciseId`. The `stretchBetweenRoundsSec` field on Session is a total time budget — the stretch duration is absorbed into it, and the remaining time becomes the rest countdown. If remaining time after the stretch is under 5 seconds, the rest countdown is skipped entirely.

**Bilateral exercises:** A single `isBilateral: boolean` field on Exercise. The runtime splits the exercise into two sequential steps (Left → Right) at execution time; `durationSec` is per-side. One schema record, no duplication.

**Exercise library — deferred consciously:** A normalized exercise library (canonical definitions shared across sessions) was considered and explicitly deferred. This app is AI-driven — the AI generates fresh exercise instances per plan rather than referencing a library. A library would enable consistent metadata (form cues, dedicated video links) to be built up over time, which is a viable future growth path. The migration from instance model to library model is additive and non-breaking. The `name` field is documented as the future join key to an `ExerciseDefinition` table.

**AI I/O schemas:** Defined alongside the database schema. The AI returns `GeneratePlanOutput` (a complete program draft without storage IDs — the storage layer assigns IDs and timestamps), `ModifyPlanOutput` (a structured diff + plain-language summary; no changes written until user confirms), and `SummarizeContextRecordOutput` (condensed PlanContextRecord content).

**Outcome:** `docs/schema.md` v1.1 complete. All 6 database entities and 3 AI function I/O contracts defined as TypeScript interfaces. Ready for `/preplan` on the Walking Skeleton.

**Housekeeping:**
- `docs/architecture.md` updated: `SQLite+SQLCipher` and `expo-speech + expo-audio` corrected from stale values
- Root `PRD.md` archived as `PRD.md.archived` — superseded by `docs/PRD.md` v1.0

---

## 2026-04-03 — Planning Directives, Project Bootstrap, and Tooling

### Part 1: Planning Directives

**Context:** The PRD defines what the app does; the planning directives define how the AI should think when generating a plan. These are distinct concerns — the PRD is product specification, the directives are AI instruction. Keeping them in a separate file (`docs/planning-directives.md`) means the directives become the direct source for the `generatePlan` system prompt with minimal transformation.

**Directives established (derived from JD's iteration experience with the prototype):**

1. **Default session structure:** 3–5 minute warm-up, 3-round circuit (all exercises in sequence per round, not 3 sets per exercise). Round count is the most frequently overridden parameter.

2. **Upper/lower body split:** Sessions alternate focus to allow muscle recovery between sessions targeting the same areas.

3. **Muscle coverage balance:** Evaluated at the plan level, not session level. Slightly higher volume for large muscle groups (quads, hamstrings, glutes, back, chest) is intentional.

4. **Active recovery sessions:** Plans include mobility and stretching sessions the user inserts freely between resistance sessions. These use a sequential timed hold structure (no rounds/circuit). The home screen shows which resistance session was last run so the user can track their place in the sequence — but session selection is always free, never enforced.

5. **Exercise ordering — three-filter model (priority order):**
   - Heart rate management (primary): avoid back-to-back high-intensity exercises; allow partial recovery between peaks
   - Equipment/setup changes (secondary): group exercises at the same equipment configuration; for resistance bands, minimize anchor height changes (low/mid/high)
   - Consecutive muscle group avoidance (tertiary): avoid loading the same muscle group on consecutive exercises within a round

6. **Plan context record initialization:** After generating a plan, the AI seeds the context record with the user's equipment, limitations, and any notable preferences — establishing the continuity mechanism for future modification sessions.

**Override policy:** All directives are defaults. Any explicit user preference takes precedence. The AI does not defend defaults against user intent.

**Future work noted:** An `analyzePlan` function (muscle coverage analysis, HR profile review, time balance check) was identified as valuable but deliberately deferred. The Walking Skeleton will produce a real AI-generated plan; the analysis capability is better designed against a real output than against a hypothetical one.

### Part 2: Schema Refinements

Two schema gaps identified and closed:

- **Exercise logging removed from Exercise entity.** `repsCompleted` and `weightUsed` were initially placed on `Exercise` as future-use nullable fields. On review, logging is its own concern — it will be an `ExerciseLog` entity referencing `exerciseId`. Exercise stays clean.

- **Mobility and stretching session types added.** `SessionType` expanded from `'resistance'` to `'resistance' | 'mobility' | 'stretching'`. Cardio remains a future type. Mobility and stretching sessions have no circuit structure — they are sequential timed holds.

- **`additionalContext` added to UserProfile.** The final onboarding question ("Is there anything else you'd like me to know before designing your plan?") captures equipment biases, movement preferences, and training philosophy that don't fit structured fields. This is passed to `generatePlan` and seeded into the Plan Context Record.

### Part 3: Expo Project Bootstrap

**Approach:** The Expo project was bootstrapped into the existing repository (which already contained docs, CLAUDE.md, and the original HTML prototype files) rather than creating a new directory. This keeps the full project history — including the prototype that motivated the app — in a single repository.

**Stack confirmed at install:**
- Expo SDK 55, New Architecture enabled (`newArchEnabled: true`)
- React 19.2.0 / React Native 0.83.4
- expo-router 55.0.10, expo-speech 55.0.11, expo-audio 55.0.11, expo-sqlite 55.0.13
- zustand 5.0.12
- TypeScript strict mode — compiler passes clean

**Notable bootstrap challenge:** `create-expo-app` refuses to run in-place when the target directory contains existing files. Resolution: bootstrapped in a temp directory and merged the generated files into the project, preserving all existing content.

**Security decision:** API key stored in `.env` (gitignored) for MVP — acceptable for a single-user local device. The `EXPO_PUBLIC_` prefix exposes the key to the app bundle, which is a known limitation of client-side React Native apps. A backend proxy is the correct V1 solution and is documented as a hard requirement in `docs/constraints.md`.

**Folder structure created:** `src/ai/`, `src/storage/`, `src/prompts/`, `src/store/`, `src/types/` — matching the four-subsystem architecture defined in the PRD.

### Part 4: Tooling

- **Context7 MCP** added globally (`~/.claude/settings.json`) — provides up-to-date library documentation to all Claude Code sessions across all projects.
- **Permissions broadened** — `Write` and `Edit` permissions expanded to `*` globally. Subagents running bootstrap operations need access to temp directories, npm cache, and AppData — path-scoped restrictions were causing permission prompts without providing meaningful security (since `Bash(*)` was already unrestricted).

**Outcome:** All planning documentation complete. Expo project bootstrapped and compiling clean. Ready to `/preplan` the Walking Skeleton in a fresh session.

---

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

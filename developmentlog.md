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

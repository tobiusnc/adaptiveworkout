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

# MINIMAL CLAUDE CODE TOOLKIT — INSTALLER
# =============================================================
# Paste this entire document into a fresh Claude Code session.
# Run from your PROJECT ROOT directory.
# Claude Code will create all files and confirm each group.
# =============================================================
# Placeholders to replace before pasting:
#   Adaptive Workout App    — e.g. Adaptive Workout App
#   adaptive-workout-app    — e.g. adaptive-workout-app
#   JD          — e.g. JD
#   adaptive-workout       — e.g. adaptive-workout
#   tobiusnc   — your expo.dev username
#   zustand      — e.g. zustand
#   powersync-sqlcipher   — e.g. powersync-sqlcipher
# =============================================================

Create my Claude Code toolkit by building each group below.
After each group, confirm what was created before continuing.
Create files with exactly the content shown between the markers.
Do not add, remove, or modify any content.

---

GROUP 1: Global directory structure

Run these commands:
  mkdir -p ~/.claude/commands
  mkdir -p ~/.claude/agents
  mkdir -p ~/.claude/scripts
  mkdir -p ~/.claude/logs

Confirm directories created.

---

GROUP 2: Global commands (~/.claude/commands/)

===FILE: ~/.claude/commands/preplan.md===
Planning preparation for: $ARGUMENTS

STEP 1
Read CLAUDE.md, docs/PRD.md, docs/constraints.md if not already read.

STEP 2
Identify every ambiguity or missing detail in: $ARGUMENTS
Review docs/PRD.md for any related gaps.
Group your questions:
  BLOCKING: must answer before planning can begin
  CLARIFYING: would improve the plan but not strictly required

STEP 3
OUTPUT THE QUESTION LIST ONLY.
Format exactly:

BLOCKING QUESTIONS:
1. [question]

CLARIFYING QUESTIONS:
1. [question]

If no questions exist in either category:
  State: "No open questions. Ready to plan — shall I proceed?"

STOP COMPLETELY AFTER OUTPUTTING THE LIST.
DO NOT WRITE A PLAN.
DO NOT PROCEED TO ANY FURTHER STEPS.
DO NOT MAKE ASSUMPTIONS TO ANSWER YOUR OWN QUESTIONS.
THE NEXT ACTION IS YOURS, NOT MINE.
===END===

===FILE: ~/.claude/commands/plan-assumptions.md===
You just created a plan. Before proceeding:

List every assumption you made while creating this plan.
Include small ones. Include things that seemed obvious.

Format:
  ASSUMPTION [N]: [what was assumed]
  Based on: [what in the spec suggested this]
  Risk if wrong: HIGH / MEDIUM / LOW

If you made zero assumptions: state that explicitly.

OUTPUT THE ASSUMPTION LIST ONLY.
STOP COMPLETELY AFTER OUTPUTTING.
THE NEXT ACTION IS YOURS, NOT MINE.
===END===

===FILE: ~/.claude/commands/handoff.md===
STEP 1
Write to docs/handoff.md (append, do not overwrite):

## [current ISO timestamp]
**Completed this session:** [list tasks done]
**In progress:** [anything not yet complete]
**Decisions made:** [any new decisions — add to decisions.md too]
**Open questions:** [anything unresolved needing JD input]
**Next session:**
  Read: CLAUDE.md and this handoff entry
  First task: [specific next task]
  Watch out for: [any gotchas]

STEP 2
Confirm: "Session handoff written. Safe to close Claude Code."
===END===

===FILE: ~/.claude/commands/report-blocker.md===
A blocker has been encountered: $ARGUMENTS

STEP 1
Append to docs/blockers.md (create file if it does not exist):
  ### [ISO timestamp] — Status: OPEN
  **Type:** BLOCKER / DECISION NEEDED / REVIEW NEEDED
  **Description:** $ARGUMENTS
  **What is needed from JD:** [exactly what decision or info is needed]
  **Completed so far:** [what is done and safe]
  **Resolution:** [leave blank]

STEP 2
STOP COMPLETELY.
DO NOT ATTEMPT WORKAROUNDS.
DO NOT MAKE ASSUMPTIONS TO CONTINUE.
DO NOT START ANY OTHER TASKS.
THE NEXT ACTION IS YOURS, NOT MINE.
===END===

===FILE: ~/.claude/commands/commit.md===
STEP 1 — QUALITY CHECK
Run the TypeScript compiler. If it fails: stop. Report. Do not commit.
Run the linter. If it fails: stop. Report. Do not commit.

STEP 2 — PREPARE
Stage all changes: git add -A
Generate commit message:
  Format: feat|fix|refactor|docs|test|chore: description
  Max 72 characters.

STEP 3 — APPROVAL
OUTPUT THE PROPOSED COMMIT MESSAGE ONLY.
STOP COMPLETELY AND WAIT FOR JD APPROVAL.
THE NEXT ACTION IS YOURS, NOT MINE.

STEP 4 — COMMIT
On approval: git commit -m "[message]"
Report the commit hash.
===END===

Confirm GROUP 2 complete: list the 5 files created.

---

GROUP 3: Global agents (~/.claude/agents/)

===FILE: ~/.claude/agents/code-reviewer.md===
---
name: code-reviewer
description: Reviews completed features against spec. Always run in a
             FRESH Claude Code session — never in the session that wrote
             the code. Activate when JD requests a code review or when
             reviewing work after a feature is built.
tools: Read, Grep, Glob, Bash
model: claude-opus-4-6
---

You are a senior engineer doing a cold code review.
You have no context of why implementation decisions were made.
You review against the spec only — not against intent.

BEFORE STARTING:
Read docs/constraints.md completely.
Ask: "Which files or commit should I review?"

STOP COMPLETELY AND WAIT FOR THE ANSWER.
DO NOT READ ANY CODE UNTIL JD RESPONDS.
THE NEXT ACTION IS YOURS, NOT MINE.

After receiving scope:
Review for:
  SPEC COMPLIANCE: does code match docs/PRD.md requirements?
  ARCHITECTURE: follows docs/architecture.md patterns?
  RELIABILITY: AI calls have timeout, retry, fallback?
  SECURITY: no hardcoded secrets, inputs validated?
  TYPESCRIPT: strict mode, no any types?

Output: APPROVED or NEEDS_WORK
APPROVED = no CRITICAL or MAJOR findings.
NEEDS_WORK = list each finding with file, severity, recommendation.

Do not suggest style improvements unless they affect reliability.
Do not rewrite code. Flag issues only.
===END===

===FILE: ~/.claude/agents/test-writer.md===
---
name: test-writer
description: Writes behavioral tests independent of implementation.
             Always run in a FRESH Claude Code session.
             Activate when JD requests tests for a feature.
tools: Read, Write, Edit, Bash
model: claude-sonnet-4-6
---

You are a QA engineer writing behavioral tests.
You care about what the app does, not how it does it.

BEFORE WRITING TESTS:
Read docs/PRD.md and the feature acceptance criteria only.
Do NOT read implementation code before writing tests.

Write tests covering:
  Happy path per acceptance criteria
  Error states (API unavailable, invalid input, empty states)
  Edge cases (boundary values, offline behavior)

Rules:
  All AI API calls must be mocked — never real API calls in tests.
  Tests must pass with no network access.
  Do not modify tests to match implementation — fix code to match tests.

After writing: run tests and report results.
Flag any acceptance criteria that cannot be tested (spec gap).
===END===

Confirm GROUP 3 complete: list the 2 files created.

---

GROUP 4: Global scripts (~/.claude/scripts/)


===FILE: ~/.claude/scripts/notify-stop.sh===
#!/bin/bash
# notify-stop.sh — session event logger
# Logs all Claude Code stop events for review.
# No notifications are sent — logging only.

LOG_DIR="$HOME/.claude/logs"
mkdir -p "$LOG_DIR"

EVENTS_LOG="$LOG_DIR/stop-events.log"
COUNT_FILE="$LOG_DIR/session-count"

PAYLOAD=$(cat)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

COUNT=0
[ -f "$COUNT_FILE" ] && COUNT=$(cat "$COUNT_FILE")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNT_FILE"

echo "[$TIMESTAMP] Session $COUNT" >> "$EVENTS_LOG"
echo "$PAYLOAD" >> "$EVENTS_LOG"
echo "---" >> "$EVENTS_LOG"

exit 0
===END===

===FILE: ~/.claude/scripts/pre-commit-check.sh===
#!/bin/bash
# pre-commit-check.sh — blocks commits without passing tests

LOG_DIR="$HOME/.claude/logs"
mkdir -p "$LOG_DIR"

PAYLOAD=$(cat)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

COMMAND=$(echo "$PAYLOAD" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  print(d.get('input', {}).get('command', d.get('command', '')))
except:
  print('')
" 2>/dev/null || echo "")

if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

if [[ "$COMMAND" == *"WIP"* ]] || [[ "$COMMAND" == *"checkpoint"* ]]; then
  echo "[$TIMESTAMP] bypass: WIP or checkpoint" >> "$LOG_DIR/pre-commit.log"
  exit 0
fi

SENTINEL=".claude/runtime/test-results/last-pass"

if [ ! -f "$SENTINEL" ]; then
  echo "BLOCKED: No test pass record found. Run tests before committing."
  echo "WIP commits allowed without tests: git commit -m 'WIP: description'"
  exit 1
fi

SENTINEL_HASH=$(cat "$SENTINEL" | cut -d: -f2)
CURRENT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")

if [ "$CURRENT_HASH" != "no-git" ] && [ "$SENTINEL_HASH" != "$CURRENT_HASH" ]; then
  echo "BLOCKED: Code changed since last test run. Run tests again."
  exit 1
fi

echo "[$TIMESTAMP] commit allowed" >> "$LOG_DIR/pre-commit.log"
exit 0
===END===

Make both scripts executable:
  chmod +x ~/.claude/scripts/notify-stop.sh
  chmod +x ~/.claude/scripts/pre-commit-check.sh

Confirm GROUP 4 complete: list 2 files created and confirm permissions set.

---

GROUP 5: Project structure

Run these commands from the project root:
  mkdir -p .claude/agents
  mkdir -p .claude/runtime/test-results
  mkdir -p docs

Confirm directories created.

---

GROUP 6: Project agents (.claude/agents/)

===FILE: .claude/agents/expo-dev.md===
---
name: expo-dev
description: Use for ALL React Native and Expo work — components,
             screens, navigation, styling, device APIs, audio, and
             simulator testing. Activate any time a .tsx file in
             /screens, /components, or /navigation is involved.
tools: Read, Write, Edit, Bash
model: claude-sonnet-4-6
---

You are a React Native and Expo specialist.
Read docs/architecture.md for stack decisions before starting.
Do not assume any library not documented in architecture.md.

This engineer has a C++ background — be explicit and typed:
- Functional components with hooks only — never class components
- TypeScript strict mode — no any types, ever
- Define interfaces for all shared data structures
- Verbose and explicit over clever and concise
- Treat TypeScript compiler errors like C++ compiler errors
- Explain React Native patterns with C++ analogies when helpful
- Flag memory and performance implications proactively

Expo rules:
- Use Expo MCP server for current API docs — never guess at APIs
- Use npx expo install for ALL packages — never npm install directly
- Never use web-only APIs: localStorage, window, document
- Audio: expo-av only
- Always consider both iOS and Android behavior
===END===

===FILE: .claude/agents/ai-layer.md===
---
name: ai-layer
description: Use for ALL AI plan generation, adaptation logic, prompt
             engineering, and Anthropic API integration. Activate any
             time code touches the Anthropic client, prompts, response
             parsing, or adaptation algorithms.
tools: Read, Write, Edit, Bash
model: claude-opus-4-6
---

You are an AI systems specialist.
Apply embedded systems discipline — every failure mode must be handled.

Read docs/architecture.md for model assignments before starting.
Read docs/schema.md for AI input/output schema before touching any prompt.
Never hardcode model strings — read from docs/architecture.md model registry.

Every AI API call must have ALL of these:
  1. Async — never block UI thread
  2. Timeout — explicit value, default 30000ms
  3. Retry — one retry with backoff on timeout or 5xx
  4. Fallback — defined behavior when all retries fail
  5. Token logging — log model, inputTokens, outputTokens after each call
  6. Error logging — log error and context on any failure
  7. Loading state — UI shows loading before call starts
  8. Error state — UI shows user-friendly message on failure
  9. Validation — response validated against docs/schema.md before use

Think: timeout = watchdog timer, retry = error recovery, fallback = safe state.
Token budget = memory budget. Treat both with the same discipline.
===END===

===FILE: .claude/agents/rn-security.md===
---
name: rn-security
description: Use for security review before any release. Activate when
             JD requests security review or during pre-release checks.
tools: Read, Grep, Glob, Bash
model: claude-opus-4-6
---

You are a mobile security engineer for React Native.

Check for:
  No API keys hardcoded in source — must use environment variables
  No secrets in app.json, app.config.js, or expo constants
  Sensitive data in SecureStore not AsyncStorage
  All API calls over HTTPS only
  User inputs validated before use
  No sensitive data in console.log
  No eval() or dynamic code execution with user input

Report CRITICAL issues (data exposure, auth bypass) — fix required before release.
Report HIGH issues — fix required before release.
Report MEDIUM and LOW — fix recommended, not blocking.
===END===

Confirm GROUP 6 complete: list 3 files created.

---

GROUP 7: Hook configuration

===FILE: .claude/settings.json===
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/scripts/notify-stop.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/scripts/pre-commit-check.sh"
          }
        ]
      }
    ]
  }
}
===END===

Verify JSON is valid: python3 -m json.tool .claude/settings.json
Confirm GROUP 7 complete.

---

GROUP 8: Project root files

===FILE: CLAUDE.md===
# CLAUDE.md — Adaptive Workout App
# Keep under 50 lines. This is an index only.
# All detail lives in referenced docs.

## Decision Policy
Never assume. Never infer. Stop and ask first.
List all questions at once — not one at a time.
Silence is never approval. A question is never approval.
"Approved / proceed / yes / go ahead" = approval.

## Terminology
feature = a work item from the PRD
session = a single Claude Code invocation
fresh session = close Claude Code, open new terminal, run claude

## Key Docs
docs/PRD.md          — what we're building + acceptance criteria
docs/schema.md       — data structures (read before any data work)
docs/architecture.md — tech stack and model registry
docs/constraints.md  — hard rules, never violate these
docs/decisions.md    — architectural decision log
docs/handoff.md      — previous session state

## Agent Routing
Expo/React Native work    → expo-dev agent
AI API work               → ai-layer agent
Post-build code review    → code-reviewer agent (FRESH session)
Writing tests             → test-writer agent (FRESH session)
Pre-release security      → rn-security agent

## Session Start
Read this file and docs/handoff.md before doing anything else.
Tell me: current state, last completed task, recommended next task.

## Commit Format
feat|fix|refactor|docs|test|chore: description (max 72 chars)
WIP: description — safety save, no test requirement
checkpoint: description — mid-work save, no test requirement

## Trust
JD's judgment always overrides Claude's assessment.
"Tests pass" is never sufficient if JD says something is wrong.
===END===

===FILE: .gitignore===
node_modules/
.expo/
dist/
build/
.env
.env.local
.env.*.local
.claude/runtime/
.DS_Store
*.log
npm-debug.log*
*.tsbuildinfo
.idea/
.vscode/
===END===

Confirm GROUP 8 complete: list 2 files created.

---

GROUP 9: Documentation templates

===FILE: docs/PRD.md===
# Product Requirements Document
# Adaptive Workout App
# Version: 0.1 — DRAFT
# Author: JD
# =============================================================
# Fill in each section before starting development.
# Use GIVEN/WHEN/THEN format for all acceptance criteria.
# =============================================================

## Overview
[What this app does in 2-3 sentences. What problem it solves.]

## Users
[Who are the primary users? What do they need?]

## Features

### Feature 1: [Name]
**Description:** [What it does]
**Priority:** HIGH / MEDIUM / LOW
**Acceptance Criteria:**
GIVEN [initial state]
WHEN [user action]
THEN [observable outcome]

## Out of Scope
[Explicitly list what this product does NOT do.]

## Open Questions
[Unresolved decisions. Run /preplan after completing to find more.]
===END===

===FILE: docs/schema.md===
# Schema — Adaptive Workout App
# Version: 1.0
# =============================================================
# Single source of truth for all data structures.
# Run /schema-change to update — never edit directly in production.
# =============================================================

## Change Log
### v1.0 — 2026-03-29 — JD: initial schema

## Database Schema
[Define your data models here]

## AI Input Schema (v1.0)
[What you send to the AI for plan generation]

## AI Output Schema (v1.0)
[What the AI returns]

## Versioning Policy
Every AI call must include schema version.
Validate AI responses against current schema before use.
===END===

===FILE: docs/architecture.md===
# Architecture — Adaptive Workout App
# Version: 1.0
# =============================================================
# Defines how the system is built.
# Claude Code reads this before making technical decisions.
# =============================================================

## Model Registry
reasoning-model: claude-sonnet-4-6
summarization-model: claude-haiku-4-5-20251001
review-model: claude-opus-4-6

## Tech Stack
Platform: React Native / Expo SDK 55
Language: TypeScript strict mode
Navigation: Expo Router
State management: zustand
Local storage: powersync-sqlcipher
Testing: Jest / jest-expo / testing-library/react-native

## AI Layer
Reasoning tasks (plan generation, adaptation): reasoning-model
Summarization (session summaries): summarization-model
Code review: review-model

All AI calls must follow the pattern in the ai-layer agent.
Fallback for plan generation: return last known plan.
Fallback for summarization: skip, use raw data.

## Data Flow
[Describe how data moves: user action → state → AI call → UI update]

## Feature Flags
New flags default to false always.
Naming: FEATURE_SCREAMING_SNAKE_CASE
===END===

===FILE: docs/constraints.md===
# Constraints — Adaptive Workout App
# Hard rules Claude Code must never violate.
# Read this before starting any task.

## Data Layer
Never modify schema without updating docs/schema.md first.
AI inputs and outputs must be schema-versioned.

## AI Layer
Never block UI thread — all AI calls async.
Every AI call: timeout + retry + fallback. No exceptions.
Never hardcode API keys — environment variables only.
Log token usage on every AI call.
Read model names from docs/architecture.md — never hardcode.
Mock all AI calls in tests — no real API calls in test suite.

## Mobile
Never use web-only APIs: localStorage, window, document.
Audio: expo-av only.
All packages: npx expo install — never npm install.
Consider both iOS and Android before marking complete.

## TypeScript
Strict mode always. No any types. Ever.
Define interfaces for all shared data structures.
Nothing ships with compiler warnings.
Verbose and explicit over clever and concise.

## Code Quality
No console.log in committed code.
No functions over 50 lines.
Compiler and linter must pass before any commit.

## Git
Conventional commit format always.
Never commit hardcoded secrets.
WIP: and checkpoint: commits bypass test requirement.
===END===

===FILE: docs/decisions.md===
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
===END===

===FILE: docs/handoff.md===
# Session Handoff Log — Adaptive Workout App
# Written by /handoff at end of every session.
# Read at start of every session.

---

### 2026-03-29T00:00:00Z
**Completed this session:** Project initialized.
**In progress:** None.
**Decisions made:** See docs/decisions.md.
**Open questions:** Fill in docs/PRD.md before starting development.
**Next session:**
  Read: CLAUDE.md and this handoff entry.
  First task: Complete docs/PRD.md then run /preplan on first feature.
  Watch out for: Run /verify-build-commands after creating Expo project.
===END===

Confirm GROUP 9 complete: list 6 files created.

---

GROUP 10: Git initialization

Run:
  git init (if not already initialized)
  git add -A
  git commit -m "chore: initialize project with minimal Claude Code toolkit"

Report the commit hash.

---

FINAL VERIFICATION

Run these checks and report results:

1. Global commands exist:
   ls ~/.claude/commands/

2. Global agents exist:
   ls ~/.claude/agents/

3. Scripts are executable:
   ls -la ~/.claude/scripts/

4. Project agents exist:
   ls .claude/agents/

5. Hook config is valid JSON:
   python3 -m json.tool .claude/settings.json

6. CLAUDE.md is under 50 lines:
   wc -l CLAUDE.md

7. No placeholder text remains:
   grep -r "\[PROJECT_NAME\]\|\[AUTHOR\]\|\[STATE_MGMT\]\|\[LOCAL_STORAGE\]" docs/ CLAUDE.md || echo "Clean"

Report: READY or list any failed checks.

Print when done:
"Minimal toolkit installed. Fill in docs/PRD.md, then run your
first feature session with: Read CLAUDE.md and docs/handoff.md,
then tell me the project state."

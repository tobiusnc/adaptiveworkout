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

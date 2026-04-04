# Constraints — Adaptive Workout App
# Hard rules Claude Code must never violate.
# Read this before starting any task.

## Data Layer
Never modify schema without updating docs/schema.md first.
AI inputs and outputs must be schema-versioned.
Multi-table writes must use a transaction (savePlanComplete or equivalent).
  Never write across multiple tables with individual save calls — partial
  writes leave orphaned rows and an inconsistent DB on failure or retry.
  Add a dedicated atomic method to StorageService for each multi-table operation.

## AI Layer
Never block UI thread — all AI calls async.
Every AI call: timeout + retry + fallback. No exceptions.
Never hardcode API keys — environment variables only (EXPO_PUBLIC_ANTHROPIC_API_KEY in .env).
API key in .env is acceptable for MVP (local device only, .gitignore enforced).
V1 REQUIRED: Move API calls to a backend proxy so the key never ships in the app bundle.
Log token usage on every AI call.
Read model names from docs/architecture.md — never hardcode.
Mock all AI calls in tests — no real API calls in test suite.

## Mobile
Never use web-only APIs: localStorage, window, document.
Audio: expo-speech + expo-audio.
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
Compiler, linter, and unit tests must pass before any commit.
  Unit test command: npx jest --findRelatedTests --passWithNoTests
  WIP: and checkpoint: commits are exempt from all three checks.
Before writing code that calls an unfamiliar library: read its type definitions
  in node_modules/[package]/src/*.ts first. Never assume sync vs async from docs alone.
When verifying generated code: use Grep for specific patterns rather than reading
  entire files. Only read full files if Grep findings require it.

## Git
Conventional commit format always.
Never commit hardcoded secrets.
WIP: and checkpoint: commits bypass test requirement.

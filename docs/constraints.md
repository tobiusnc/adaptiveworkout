# Constraints — Adaptive Workout App
# Hard rules Claude Code must never violate.
# Read this before starting any task.

## Data Layer
Never modify schema without updating docs/schema.md first.
AI inputs and outputs must be schema-versioned.

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
Compiler and linter must pass before any commit.

## Git
Conventional commit format always.
Never commit hardcoded secrets.
WIP: and checkpoint: commits bypass test requirement.

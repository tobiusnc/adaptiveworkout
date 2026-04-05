Read the last entry of docs/handoff.md (use offset to skip prior entries).

STEP 1 — IDENTIFY TARGETS
From the "Completed this session" list, identify files that contain testable logic.

Include:
  src/ai/*.ts           — AI functions with retry, timeout, error, validation logic
  src/store/*.ts        — Zustand store actions with conditional logic
  src/storage/*.ts      — Storage service methods (only if they contain pure logic;
                          skip if the method is a thin SQL wrapper with no branching)
  src/session/*.ts      — Pure session logic extracted from screen files (e.g. buildStepSequence)

Exclude:
  app/**                — screens (UI, not unit-testable here)
  src/types/**          — interfaces only
  src/styles/**         — token constants
  src/ai/prompts/**     — string constants
  docs/**               — documentation

Extraction rule:
  If a screen file (app/**) contains a pure function with no React/RN/expo-router
  dependencies, it must be extracted to src/<domain>/<function>.ts before writing
  tests. Do NOT import screen files in tests — the mocks required to do so hide
  real coverage gaps and inflate test complexity. Extract first, then test the
  extracted module directly.

For each included file, read it. Then decide: does it have at least two distinct
behavioral paths (success, failure, retry, edge case)? If not, skip it.

STEP 2 — PLAN TESTS
For each target file, list:
  - The behaviors to test (one line each)
  - What needs to be mocked (external SDKs, native modules, env vars)
  - Where the test file goes (mirror src/ path under __tests__/)

Show this plan. Do not write any test code yet.

STEP 3 — WRITE TESTS
For each target, write the test file.

Style rules (match src/store/__tests__/useAppStore.test.ts):
  - Section comments with ── heading ──────────── dividers
  - beforeEach resets mocks and restores env
  - Tests are fully isolated — no shared mutable state
  - No network, no filesystem, no real external API calls
  - Mock at the module level (jest.mock) for SDK dependencies
  - Mock process.env values in beforeEach

Test each behavioral path identified in Step 2:
  - Happy path (valid input → expected output)
  - Each distinct error/failure path
  - Retry logic: verify call counts on retry scenarios
  - Exhaustion: verify the correct error type is thrown after all retries fail

If a Zod schema is defined in the source file but not exported, add minimal
exports only — do not restructure the source file. Note any such change.

STEP 4 — RUN AND FIX
Run: npx jest --testPathPattern="__tests__" --no-coverage
Fix any failures. Do not modify source files to make tests pass — if a test
cannot pass without changing source, note it as a comment and skip that assertion.
Run: npx tsc --noEmit
Fix any type errors.

STEP 5 — COVERAGE
Run: npx jest --coverage --coverageReporters=text
Show the per-file coverage table.
Call out any file in src/ai/, src/store/, src/storage/, or src/session/ with
uncovered branches that contain error paths or retry logic. This is
informational — do not block on numbers, but note anything worth a follow-up
test in the handoff.

STEP 6 — REPORT
List each test file created, the behaviors covered, and any skipped assertions
with the reason.

STEP 7 — CLOSE SESSION
Run /commit, then /handoff.

The handoff entry must include:
  - Each test file created and the behavior count
  - Any source exports added (minimal-export changes)
  - Any skipped assertions and why

"Next session" block must say:
  First task: /review in a fresh session
  (If review was already done this cycle, say so and name the next build task.)

Do not edit the previous session's handoff entry. Write a new one.

We are building a testable feature: $ARGUMENTS

PHASE 1 — PLAN
Run /preplan $ARGUMENTS
Wait for JD answers.
Write the plan.
Run /plan-assumptions
Wait for JD confirmation.

PHASE 2 — BUILD
Run /build $ARGUMENTS
Write testable code per build command rules.

PHASE 3 — TEST (fresh session required)
When build is complete, output exactly:

"Build complete. Open a FRESH Claude Code session and run:
  /write-tests $ARGUMENTS"

Do not run tests in this session.
Tests must be written in a fresh session by the test-writer agent.

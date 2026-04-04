Run these steps in order before running /handoff.

STEP 1 — COMPLETENESS CHECK
Read the last entry of docs/handoff.md (use offset to skip prior entries).
Find the "Next session: First task" block — this is what was planned for the
session now ending.

For each planned task and watch-out item, state one of:
  DONE       — completed as planned
  DEFERRED   — deliberately deferred (note why)
  INCOMPLETE — not done and not deferred (flag clearly)

If anything is INCOMPLETE, stop and surface it before continuing.

STEP 2 — COVERAGE
Run: npx jest --coverage --coverageReporters=text-summary
Show the output.
Call out any file in src/ai/, src/store/, or src/storage/ with 0% coverage
that contains branching logic or error paths. This is informational — do not
block on numbers.

STEP 3 — TOKEN EFFICIENCY
Review this session's work. Give 2-3 specific recommendations to reduce token
usage next session. Look for:
  - Files read in full when a targeted read or grep would have sufficed
  - The same file read more than once
  - Agent output re-verified by re-reading generated files (tsc passing + spot
    grep is sufficient; full re-read is not)
  - PRD or schema reads that pulled in sections not relevant to the task

Reference specific examples from this session. Skip generic advice.

When all three steps are done, say: "Ready for /handoff."

Load the code-reviewer agent.

Read docs/constraints.md before reviewing any code.
Ask me which files or commit to review before reading any code.

STOP COMPLETELY AND WAIT FOR MY ANSWER.
THE NEXT ACTION IS YOURS, NOT MINE.

─── After review findings are returned ────────────────────────────────────────

Fix all Critical findings before proceeding. Fix Minor findings unless JD
explicitly defers them.

When all fixes are applied:
  1. Run /commit
  2. Run /handoff

The handoff entry must include:
  - Each finding (severity + one-line description)
  - What was fixed vs. deferred and why
  - Any decisions made (e.g. new patterns established)

"Next session" block must say what the next build task is.

Do not edit the previous session's handoff entry. Write a new one.

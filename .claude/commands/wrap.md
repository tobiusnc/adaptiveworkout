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

STEP 2 — TOKEN EFFICIENCY
Review this session's work. Give 2-3 specific recommendations to reduce token
usage next session. Look for:
  - Files read in full when a targeted read or grep would have sufficed
  - The same file read more than once
  - Agent output re-verified by re-reading generated files (tsc passing + spot
    grep is sufficient; full re-read is not)
  - PRD or schema reads that pulled in sections already summarized in the handoff's "Watch out for" block
  - PRD or schema reads that pulled in sections not relevant to the task

Reference specific examples from this session. Skip generic advice.

STEP 3 — ENCODE LESSONS
For each pattern identified in STEP 2: decide if it should be encoded in a
toolkit file so it does not recur. Apply any changes now (before /handoff).

Common targets:
  - handoff.md template  — add a field that forces authors to specify the info
  - build.md / wrap.md   — add a rule to the command that prevents the pattern
  - Agent invocation     — if the pattern came from a subagent, note in the
                           next handoff's "Watch out for:" to include explicit
                           verification guidance in the agent prompt

If no toolkit changes are warranted, state why and move on.

When all three steps are done, say: "Ready for /handoff."

STEP 4 — POST-BUILD SEQUENCE REMINDER
After /handoff completes, print this checklist verbatim so JD has the full
sequence in front of him before closing the session:

  Post-build sequence:
  ┌─ This session (now complete) ──────────────────────────┐
  │  /wrap → /commit → /handoff                            │
  └────────────────────────────────────────────────────────┘
  ┌─ Fresh session — unit tests ───────────────────────────┐
  │  /unit-tests → /commit → /handoff                      │
  └────────────────────────────────────────────────────────┘
  ┌─ Fresh session — code review ──────────────────────────┐
  │  /review → fix findings → /commit → /handoff           │
  └────────────────────────────────────────────────────────┘
  ┌─ Next build session ───────────────────────────────────┐
  │  /start-session → /proceed                             │
  └────────────────────────────────────────────────────────┘

  Rules:
  - /commit always before /handoff — code is the source of truth
  - Never edit old handoff entries — write a new entry each session
  - Each session ends with /commit → /handoff, no exceptions

Load the test-writer agent.
Write tests for: $ARGUMENTS

Read docs/PRD.md and docs/schema.md for the spec.
Do NOT read any implementation files first.

Write tests covering:
  - Happy path per acceptance criteria
  - Edge cases: empty, null, maximum values
  - Error states: API unavailable, invalid input, network offline

Rules:
  All AI API calls must be mocked — no real API calls in tests.
  Tests must pass with no network access.
  Mock all external dependencies.

After writing: run them and report results.
For each failure: is it a code bug or a spec gap?
Flag any acceptance criteria that cannot be tested.

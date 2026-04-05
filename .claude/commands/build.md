Build the feature: $ARGUMENTS

Follow docs/constraints.md strictly.

Write testable code:
  - Pure functions where possible — no hidden dependencies
  - Dependency injection for any external calls
  - No direct API calls inside components — put them in service files
  - Export all functions that contain logic

If anything is unclear: stop and ask.
Do not assume. Do not proceed past any ambiguity.
Do not mark complete until the TypeScript compiler and linter pass.
When verifying generated code: Grep for specific patterns first. Only read full files if Grep findings require it.
When invoking a subagent: if the prompt already names exact call sites and line ranges, do NOT also tell the agent to re-read those files from scratch — the prompt is the source of truth. Agents that re-read described context waste tokens without adding accuracy.

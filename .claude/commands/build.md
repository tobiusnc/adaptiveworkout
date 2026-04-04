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

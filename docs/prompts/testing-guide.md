# updateUserContext — Testing Guide

## Test Levels

1. **Unit Tests (Jest)** — Test implementation with mocked API responses
2. **Prompt Evaluation Tests (Manual/Role-play)** — Test system prompt behavior directly
3. **Prompt Integration Tests (API)** — Run test cases against real Haiku (future)

## Commands

```bash
# Unit tests
npm test                                          # all tests
npm test -- src/ai/__tests__/updateUserContext.test.ts  # just updateUserContext
npm run test:watch                                # watch mode
npm run test:coverage                             # with coverage

# Prompt evaluation (mock — validates test parsing)
npm run test:prompt

# Prompt integration (real API — requires EXPO_PUBLIC_ANTHROPIC_API_KEY)
npm run test:prompt:real
```

## Test Structure

### Unit Tests (`src/ai/__tests__/updateUserContext.test.ts`)
- Mocked Anthropic API responses
- Validates: input parsing, tool response handling, Zod validation, retries, error handling

### Prompt Evaluation Tests (`docs/prompts/updateUserContext-tests.md`)
- **T-01 to T-10**: Journey tests (state carries forward through user progression)
- **E-01 to E-19+**: Edge cases (independent, each uses BASELINE or specified setup)

### How to Run Prompt Tests Manually

**Option A: Claude Code slash command**
```
/test-prompt
```

**Option B: Claude.ai Pro (interactive)**
1. Open Claude.ai Pro, select Haiku
2. Paste the system prompt from `src/ai/prompts/updateUserContext.ts` (string content only)
3. Paste each INPUT block as a user message
4. Compare output to EXPECT table

## Priority Test Cases

These validate core prompt correctness. If any fail, fix the prompt before proceeding:

| Test | Rule | Failure Impact |
|---|---|---|
| T-05 | Pure modification request = no extraction | Would extract unwanted preferences |
| T-03 | Strong negative intensity = prefHigherIntensity: -2 | Would miss user pain threshold |
| E-02 | Ambiguous pronoun = no signal | Would make nonsensical extractions |
| E-03 | Vague comment = no signal | Would infer from situational feedback |
| E-11 | Append-only field = never remove | Would lose user history |
| E-13 | DOMS/soreness = NOT a joint limitation | Would flag normal fatigue as injury |
| E-19 | Single "too easy" = no level change | Would infer progression from one comment |

## When to Re-run

**Unit tests:** After modifying `src/ai/updateUserContext.ts` or `src/types/index.ts`

**Prompt evaluation:** After modifying `src/ai/prompts/updateUserContext.ts`

## References

- Implementation: `src/ai/updateUserContext.ts`
- System prompt: `src/ai/prompts/updateUserContext.ts`
- Test cases: `docs/prompts/updateUserContext-tests.md`
- Test runner: `run-prompt-tests.js`
- Slash command: `.claude/commands/test-prompt.md`

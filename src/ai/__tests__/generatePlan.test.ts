// src/ai/__tests__/generatePlan.test.ts
//
// Unit tests for generatePlan — Anthropic API integration.
//
// Strategy:
//   - @anthropic-ai/sdk is mocked at the module level; messages.create is a
//     jest.fn() shared across all instances. Real API calls are never made.
//   - process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY is injected in beforeEach.
//   - jest.useFakeTimers() + jest.runAllTimersAsync() control the 2 s backoff
//     in network-retry tests without real delays.
//   - The Zod schemas are not exported from the source; they are exercised
//     indirectly through generatePlan by providing valid / invalid tool args.

import Anthropic from '@anthropic-ai/sdk';
import { generatePlan, GeneratePlanError } from '../generatePlan';
import type { GeneratePlanInput } from '../../types/index';

// ── Mock @anthropic-ai/sdk ────────────────────────────────────────────────────
// jest.mock() is hoisted above imports at runtime, so the import above receives
// the mocked module. APIError is defined inside the factory so the same class
// instance is used for both throwing and `instanceof Anthropic.APIError` checks.

jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  const mockCreate = jest.fn();

  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));

  // Expose APIError as a static property (mirrors the real SDK shape).
  (MockAnthropic as unknown as Record<string, unknown>).APIError = APIError;
  // Expose mockCreate so tests can configure return values without
  // re-importing or calling new Anthropic() in test setup code.
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;

  return { __esModule: true, default: MockAnthropic };
});

// Retrieve shared references from the mock after module registration.
const AnthropicMock = Anthropic as unknown as Record<string, unknown>;
const mockMessagesCreate = AnthropicMock.__mockCreate as jest.Mock;
const MockAPIError = AnthropicMock.APIError as new (
  message: string,
  status: number,
) => Error & { readonly status: number };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURE_INPUT: GeneratePlanInput = {
  schemaVersion: 1,
  userProfile: {
    id: 'profile-1',
    schemaVersion: 1,
    primaryGoal: 'strength',
    equipment: ['dumbbells'],
    sessionsPerWeek: 3,
    targetDuration: '45-60',
    fitnessLevel: 'intermediate',
    limitations: '',
    additionalContext: null,
    age: null,
    biologicalSex: null,
    weightKg: null,
    heightCm: null,
    targetWeightKg: null,
    dietaryNotes: null,
    userId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  recentFeedback: [],
};

// Minimal valid tool args that pass GeneratePlanOutputSchema.
const VALID_TOOL_ARGS = {
  schemaVersion: 1,
  plan: {
    name: 'Strength Plan',
    description: 'A strength-focused training plan',
    config: {
      defaultWorkSec: 40,
      restBetweenExSec: 15,
      stretchBetweenRoundsSec: 30,
      restBetweenRoundsSec: 60,
      warmupDelayBetweenItemsSec: 5,
      cooldownDelayBetweenItemsSec: 5,
    },
  },
  sessions: [
    {
      name: 'Day 1 — Upper Body',
      type: 'resistance',
      orderInPlan: 1,
      rounds: 3,
      estimatedDurationMinutes: 45,
      workSec: 40,
      restBetweenExSec: 15,
      stretchBetweenRoundsSec: 30,
      restBetweenRoundsSec: 60,
      warmupDelayBetweenItemsSec: 5,
      cooldownDelayBetweenItemsSec: 5,
      betweenRoundExercise: null,
      exercises: [
        {
          phase: 'main',
          order: 1,
          name: 'Push-up',
          type: 'rep',
          durationSec: null,
          reps: 10,
          weight: null,
          equipment: 'bodyweight',
          formCues: ['keep core tight'],
          youtubeSearchQuery: null,
          isBilateral: false,
        },
      ],
    },
  ],
};

// Invalid args — missing required 'plan' key; will fail Zod validation.
const INVALID_TOOL_ARGS = {
  schemaVersion: 1,
  sessions: [],
};

// Helper: build a mock Anthropic.Message with a submit_plan tool_use block.
function makeSuccessResponse(
  args: Record<string, unknown> = VALID_TOOL_ARGS,
  toolUseId = 'tu-1',
) {
  return {
    id: 'msg-success',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: toolUseId,
        name: 'submit_plan',
        input: args,
      },
    ],
    model: 'claude-sonnet-4-6',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 200 },
  };
}

// Helper: build a mock response with no tool_use block (plain text only).
function makeNoToolResponse() {
  return {
    id: 'msg-no-tool',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'I forgot to call submit_plan.' }],
    model: 'claude-sonnet-4-6',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 10 },
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
});

// ── Missing API key ───────────────────────────────────────────────────────────

describe('generatePlan — missing API key', () => {
  it('throws GeneratePlanError when EXPO_PUBLIC_ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(GeneratePlanError);
    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(
      'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set',
    );
    // No API call should be made.
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('generatePlan — happy path', () => {
  it('returns GeneratePlanOutput matching the tool args on a valid response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    const result = await generatePlan(FIXTURE_INPUT);

    expect(result.schemaVersion).toBe(1);
    expect(result.plan.name).toBe('Strength Plan');
    expect(result.plan.description).toBe('A strength-focused training plan');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].exercises).toHaveLength(1);
    expect(result.sessions[0].exercises[0].name).toBe('Push-up');
    expect(result.sessions[0].exercises[0].reps).toBe(10);
  });

  it('makes exactly one API call on success', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    await generatePlan(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });
});

// ── Token logging ─────────────────────────────────────────────────────────────

describe('generatePlan — token logging', () => {
  it('logs model, promptVersion, inputTokens, and outputTokens after a successful call', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    await generatePlan(FIXTURE_INPUT);

    const logCalls = (console.log as jest.Mock).mock.calls;
    const tokenLog = logCalls.find(
      (call: unknown[]) =>
        typeof call[1] === 'object' &&
        call[1] !== null &&
        'inputTokens' in (call[1] as object),
    );
    expect(tokenLog).toBeDefined();
    expect(tokenLog[1]).toMatchObject({ inputTokens: 100, outputTokens: 200 });
  });
});

// ── Network retry ─────────────────────────────────────────────────────────────

describe('generatePlan — network retry', () => {
  it('retries once on AbortError (timeout) and succeeds on the second call', async () => {
    jest.useFakeTimers();
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockMessagesCreate
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(makeSuccessResponse());

    const p = generatePlan(FIXTURE_INPUT);
    await jest.runAllTimersAsync();
    const result = await p;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.plan.name).toBe('Strength Plan');
  });

  it('retries once on a 5xx APIError and succeeds on the second call', async () => {
    jest.useFakeTimers();
    const serverError = new MockAPIError('Internal Server Error', 500);
    mockMessagesCreate
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(makeSuccessResponse());

    const p = generatePlan(FIXTURE_INPUT);
    await jest.runAllTimersAsync();
    const result = await p;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.plan.name).toBe('Strength Plan');
  });

  it('throws GeneratePlanError after both network attempts time out', async () => {
    jest.useFakeTimers();
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockMessagesCreate.mockRejectedValue(abortError);

    const p = generatePlan(FIXTURE_INPUT);
    // Register the rejection handler BEFORE advancing timers so the promise
    // rejection is not considered unhandled at the moment it occurs.
    const rejection = expect(p).rejects.toThrow(GeneratePlanError);
    await jest.runAllTimersAsync();
    await rejection;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a non-retryable 4xx APIError', async () => {
    const clientError = new MockAPIError('Bad Request', 400);
    mockMessagesCreate.mockRejectedValueOnce(clientError);

    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(GeneratePlanError);
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('logs console.error when the API call fails', async () => {
    const clientError = new MockAPIError('Bad Request', 400);
    mockMessagesCreate.mockRejectedValueOnce(clientError);

    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(GeneratePlanError);

    expect(console.error).toHaveBeenCalled();
  });
});

// ── Validation retry ──────────────────────────────────────────────────────────

describe('generatePlan — validation retry', () => {
  it('retries on Zod validation failure and returns valid output on the second attempt', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'))
      .mockResolvedValueOnce(makeSuccessResponse(VALID_TOOL_ARGS, 'tu-good'));

    const result = await generatePlan(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.plan.name).toBe('Strength Plan');
  });

  it('sends a tool_result error message in the retry conversation', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'))
      .mockResolvedValueOnce(makeSuccessResponse());

    await generatePlan(FIXTURE_INPUT);

    // The second call receives [user, assistant_bad_args, tool_result_error]
    const secondCallArgs = mockMessagesCreate.mock.calls[1][0] as {
      messages: { role: string; content: unknown }[];
    };
    const messages = secondCallArgs.messages;
    expect(messages).toHaveLength(3);

    const toolResultMsg = messages[2];
    expect(toolResultMsg.role).toBe('user');
    const content = toolResultMsg.content as {
      type: string;
      tool_use_id: string;
      is_error: boolean;
    }[];
    expect(Array.isArray(content)).toBe(true);
    expect(content[0].type).toBe('tool_result');
    expect(content[0].tool_use_id).toBe('tu-bad');
    expect(content[0].is_error).toBe(true);
  });

  it('throws GeneratePlanError after exhausting all 3 validation attempts', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
    );

    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(GeneratePlanError);
    // initial attempt + 2 retries = 3 total calls
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });

  it('GeneratePlanError message references validation failure after exhaustion', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
    );

    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(/Validation failed after/);
  });
});

// ── Tool extraction retry ─────────────────────────────────────────────────────

describe('generatePlan — tool extraction retry', () => {
  it('retries when the response contains no submit_plan block', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeNoToolResponse())
      .mockResolvedValueOnce(makeSuccessResponse());

    const result = await generatePlan(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.plan.name).toBe('Strength Plan');
  });

  it('appends the text-only assistant response to the conversation on retry', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeNoToolResponse())
      .mockResolvedValueOnce(makeSuccessResponse());

    await generatePlan(FIXTURE_INPUT);

    const secondCallArgs = mockMessagesCreate.mock.calls[1][0] as {
      messages: { role: string; content: unknown }[];
    };
    const messages = secondCallArgs.messages;
    // [original user message, assistant text-only response]
    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('assistant');
  });

  it('throws GeneratePlanError after 3 responses all lack submit_plan block', async () => {
    mockMessagesCreate.mockResolvedValue(makeNoToolResponse());

    await expect(generatePlan(FIXTURE_INPUT)).rejects.toThrow(GeneratePlanError);
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });
});

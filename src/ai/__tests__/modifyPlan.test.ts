// src/ai/__tests__/modifyPlan.test.ts
//
// Unit tests for modifyPlan — Anthropic API integration.
//
// Strategy:
//   - @anthropic-ai/sdk is mocked at the module level; messages.create is a
//     jest.fn() shared across all instances. Real API calls are never made.
//   - process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY is injected in beforeEach.
//   - jest.useFakeTimers() + jest.runAllTimersAsync() control the 2 s backoff
//     in network-retry tests without real delays.
//   - Both response paths tested: clarification (text-only) and proposal (tool_use).
//   - The Zod schemas are not exported; exercised indirectly via valid/invalid tool args.

import Anthropic from '@anthropic-ai/sdk';
import { modifyPlan, ModifyPlanError } from '../modifyPlan';
import { logger } from '../../utils/logger';
import type { ModifyPlanInput } from '../../types/index';

// ── Mock @anthropic-ai/sdk ────────────────────────────────────────────────────

jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() },
}));

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

  (MockAnthropic as unknown as Record<string, unknown>).APIError = APIError;
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;

  return { __esModule: true, default: MockAnthropic };
});

const AnthropicMock = Anthropic as unknown as Record<string, unknown>;
const mockMessagesCreate = AnthropicMock.__mockCreate as jest.Mock;
const MockAPIError = AnthropicMock.APIError as new (
  message: string,
  status: number,
) => Error & { readonly status: number };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURE_INPUT: ModifyPlanInput = {
  schemaVersion: 1,
  currentPlan: {
    id: 'plan-1',
    schemaVersion: 1,
    userId: null,
    name: 'Strength Plan',
    description: 'A plan',
    isActive: true,
    config: {
      defaultWorkSec: 40,
      restBetweenExSec: 15,
      stretchBetweenRoundsSec: 30,
      restBetweenRoundsSec: 60,
      warmupDelayBetweenItemsSec: 5,
      cooldownDelayBetweenItemsSec: 5,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  currentSessions: [],
  currentExercises: [],
  contextRecord: {
    id: 'cr-1',
    schemaVersion: 1,
    planId: 'plan-1',
    content: 'User prefers morning workouts.',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  recentFeedback: [],
  conversation: [
    { role: 'user', content: 'Please add a cooldown session.' },
  ],
};

// Minimal valid tool args that pass ModifyPlanOutputSchema.
const VALID_TOOL_ARGS = {
  schemaVersion: 1,
  summary: 'Added a cooldown session.',
  planChanges: null,
  sessionChanges: [],
  contextRecordUpdate: null,
};

// Invalid args — missing required fields.
const INVALID_TOOL_ARGS = {
  schemaVersion: 1,
  // missing: summary, planChanges, sessionChanges, contextRecordUpdate
};

// Helper: build a mock response with a submit_modification tool_use block.
function makeProposalResponse(
  args: Record<string, unknown> = VALID_TOOL_ARGS,
  toolUseId = 'tu-1',
) {
  return {
    id: 'msg-proposal',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: toolUseId,
        name: 'submit_modification',
        input: args,
      },
    ],
    model: 'claude-opus-4-6',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 200 },
  };
}

// Helper: build a mock response with text only (clarification path).
function makeClarificationResponse(text = 'Could you clarify which session you want to modify?') {
  return {
    id: 'msg-clarification',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-opus-4-6',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 20 },
  };
}

// Helper: build a mock response with no content (empty — neither tool nor text).
function makeEmptyResponse() {
  return {
    id: 'msg-empty',
    type: 'message',
    role: 'assistant',
    content: [] as { type: string }[],
    model: 'claude-opus-4-6',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 0 },
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
});

// ── Missing API key ───────────────────────────────────────────────────────────

describe('modifyPlan — missing API key', () => {
  it('throws ModifyPlanError when EXPO_PUBLIC_ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(ModifyPlanError);
    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(
      'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set',
    );
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});

// ── Happy path — clarification ────────────────────────────────────────────────

describe('modifyPlan — clarification path', () => {
  it('returns { type: clarification } when the response is text-only', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeClarificationResponse());

    const result = await modifyPlan(FIXTURE_INPUT);

    expect(result.type).toBe('clarification');
    if (result.type === 'clarification') {
      expect(result.message).toBe('Could you clarify which session you want to modify?');
    }
  });

  it('makes exactly one API call on a clarification response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeClarificationResponse());

    await modifyPlan(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('concatenates multiple text blocks into one clarification message', async () => {
    const multiTextResponse = {
      ...makeClarificationResponse(),
      content: [
        { type: 'text', text: 'First part. ' },
        { type: 'text', text: 'Second part.' },
      ],
    };
    mockMessagesCreate.mockResolvedValueOnce(multiTextResponse);

    const result = await modifyPlan(FIXTURE_INPUT);

    expect(result.type).toBe('clarification');
    if (result.type === 'clarification') {
      expect(result.message).toBe('First part. \nSecond part.');
    }
  });

  it('throws ModifyPlanError when response has no tool call and no text', async () => {
    mockMessagesCreate.mockResolvedValue(makeEmptyResponse());

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(ModifyPlanError);
    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(
      'AI returned an empty response with no tool call and no text',
    );
  });
});

// ── Happy path — proposal ─────────────────────────────────────────────────────

describe('modifyPlan — proposal path', () => {
  it('returns { type: proposal } with validated output on a valid tool_use response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeProposalResponse());

    const result = await modifyPlan(FIXTURE_INPUT);

    expect(result.type).toBe('proposal');
    if (result.type === 'proposal') {
      expect(result.output.schemaVersion).toBe(1);
      expect(result.output.summary).toBe('Added a cooldown session.');
      expect(result.output.planChanges).toBeNull();
      expect(result.output.sessionChanges).toEqual([]);
      expect(result.output.contextRecordUpdate).toBeNull();
    }
  });

  it('makes exactly one API call when proposal is valid on first attempt', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeProposalResponse());

    await modifyPlan(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });
});

// ── Token logging ─────────────────────────────────────────────────────────────

describe('modifyPlan — token logging', () => {
  it('logs inputTokens and outputTokens after a successful clarification call', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeClarificationResponse());

    await modifyPlan(FIXTURE_INPUT);

    const logCalls = (logger.log as jest.Mock).mock.calls;
    const tokenLog = logCalls.find(
      (call: unknown[]) =>
        typeof call[1] === 'object' &&
        call[1] !== null &&
        'inputTokens' in (call[1] as object),
    );
    expect(tokenLog).toBeDefined();
    expect(tokenLog[1]).toMatchObject({ inputTokens: 50, outputTokens: 20 });
  });

  it('logs inputTokens and outputTokens after a successful proposal call', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeProposalResponse());

    await modifyPlan(FIXTURE_INPUT);

    const logCalls = (logger.log as jest.Mock).mock.calls;
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

describe('modifyPlan — network retry', () => {
  it('retries once on AbortError (timeout) and succeeds on the second call', async () => {
    jest.useFakeTimers();
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    mockMessagesCreate
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(makeClarificationResponse());

    const p = modifyPlan(FIXTURE_INPUT);
    await jest.runAllTimersAsync();
    const result = await p;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.type).toBe('clarification');
  });

  it('retries once on a 5xx APIError and succeeds on the second call', async () => {
    jest.useFakeTimers();
    const serverError = new MockAPIError('Internal Server Error', 500);
    mockMessagesCreate
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(makeProposalResponse());

    const p = modifyPlan(FIXTURE_INPUT);
    await jest.runAllTimersAsync();
    const result = await p;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.type).toBe('proposal');
  });

  it('throws ModifyPlanError after both network attempts time out', async () => {
    jest.useFakeTimers();
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    mockMessagesCreate.mockRejectedValue(abortError);

    const p = modifyPlan(FIXTURE_INPUT);
    const rejection = expect(p).rejects.toThrow(ModifyPlanError);
    await jest.runAllTimersAsync();
    await rejection;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a non-retryable 4xx APIError', async () => {
    const clientError = new MockAPIError('Bad Request', 400);
    mockMessagesCreate.mockRejectedValueOnce(clientError);

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(ModifyPlanError);
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('logs an error when the API call fails', async () => {
    const clientError = new MockAPIError('Bad Request', 400);
    mockMessagesCreate.mockRejectedValueOnce(clientError);

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(ModifyPlanError);

    expect(logger.error).toHaveBeenCalled();
  });
});

// ── Validation retry — proposal path ─────────────────────────────────────────

describe('modifyPlan — validation retry (proposal)', () => {
  it('retries on Zod validation failure and returns valid output on the second attempt', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeProposalResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'))
      .mockResolvedValueOnce(makeProposalResponse(VALID_TOOL_ARGS, 'tu-good'));

    const result = await modifyPlan(FIXTURE_INPUT);

    // Initial call in modifyPlan + 1 retry in runProposalValidationLoop
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.type).toBe('proposal');
    if (result.type === 'proposal') {
      expect(result.output.summary).toBe('Added a cooldown session.');
    }
  });

  it('sends a tool_result error message in the retry conversation', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeProposalResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'))
      .mockResolvedValueOnce(makeProposalResponse(VALID_TOOL_ARGS, 'tu-good'));

    await modifyPlan(FIXTURE_INPUT);

    // Second call receives [user_msg, assistant_bad_args, tool_result_error]
    const secondCallArgs = mockMessagesCreate.mock.calls[1][0] as {
      messages: { role: string; content: unknown }[];
    };
    const messages = secondCallArgs.messages;
    // [original user message, assistant w/ bad tool use, tool_result error]
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

  it('throws ModifyPlanError after exhausting all validation attempts (initial + 2 retries)', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeProposalResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
    );

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(ModifyPlanError);
    // initial + MAX_VALIDATION_RETRIES=2 retries = 3 calls total
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });

  it('error message references validation failure after exhaustion', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeProposalResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
    );

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(/Validation failed after/);
  });

  it('throws ModifyPlanError when model returns text instead of tool call on validation retry', async () => {
    // First: valid proposal (triggers validation loop)... wait, need invalid first to enter retry loop
    // Then retries return text (no tool call) — treated as validation failure
    mockMessagesCreate
      .mockResolvedValueOnce(makeProposalResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'))
      .mockResolvedValue(makeClarificationResponse()); // retries return text

    await expect(modifyPlan(FIXTURE_INPUT)).rejects.toThrow(ModifyPlanError);
    // initial + MAX_VALIDATION_RETRIES=2 retries
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });
});

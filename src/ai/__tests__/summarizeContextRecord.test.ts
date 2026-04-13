// src/ai/__tests__/summarizeContextRecord.test.ts
//
// Unit tests for summarizeContextRecord — Anthropic API integration.
//
// Strategy:
//   - @anthropic-ai/sdk is mocked at the module level; same pattern as
//     generatePlan.test.ts and modifyPlan.test.ts.
//   - Unlike modifyPlan, summarizeContextRecord uses forced tool_use
//     (tool_choice: { type: 'tool', name: 'submit_summary' }) so there is
//     no clarification path — only the proposal / validation-retry path.
//   - extractToolCallArgs in summarizeContextRecord THROWS (not returns null)
//     when no submit_summary block is found — unlike modifyPlan which returns null.
//     This means a text-only response is treated as a retryable tool-extraction failure.

import Anthropic from '@anthropic-ai/sdk';
import { summarizeContextRecord, SummarizeContextRecordError } from '../summarizeContextRecord';
import { logger } from '../../utils/logger';
import type { SummarizeContextRecordInput } from '../../types/index';

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

const FIXTURE_INPUT: SummarizeContextRecordInput = {
  schemaVersion: 1,
  currentRecord: {
    id: 'cr-1',
    schemaVersion: 1,
    planId: 'plan-1',
    content: 'User prefers morning workouts. User has a bad left knee. User owns dumbbells.',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  conversation: [
    { role: 'user', content: 'Add a note that I prefer low-impact exercises.' },
    { role: 'assistant', content: 'Noted — I have updated the context record.' },
  ],
};

const FIXTURE_INPUT_NO_CONVERSATION: SummarizeContextRecordInput = {
  schemaVersion: 1,
  currentRecord: {
    id: 'cr-2',
    schemaVersion: 1,
    planId: 'plan-2',
    content: 'User has no limitations.',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  conversation: [],
};

// Minimal valid tool args that pass SummarizeContextRecordOutputSchema.
const VALID_TOOL_ARGS = {
  schemaVersion: 1,
  content: 'User prefers morning, low-impact workouts. Bad left knee. Owns dumbbells.',
};

// Invalid args — missing required 'content' field.
const INVALID_TOOL_ARGS = {
  schemaVersion: 1,
  // missing: content
};

// Helper: build a mock response with a submit_summary tool_use block.
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
        name: 'submit_summary',
        input: args,
      },
    ],
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 80, output_tokens: 40 },
  };
}

// Helper: build a mock response with no submit_summary block (text only).
// Since tool_choice is forced, this simulates an unexpected model failure.
function makeNoToolResponse() {
  return {
    id: 'msg-no-tool',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'I forgot to call submit_summary.' }],
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 40, output_tokens: 10 },
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

describe('summarizeContextRecord — missing API key', () => {
  it('throws SummarizeContextRecordError when EXPO_PUBLIC_ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(
      SummarizeContextRecordError,
    );
    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(
      'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set',
    );
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('summarizeContextRecord — happy path', () => {
  it('returns SummarizeContextRecordOutput matching the tool args on a valid response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    const result = await summarizeContextRecord(FIXTURE_INPUT);

    expect(result.schemaVersion).toBe(1);
    expect(result.content).toBe(
      'User prefers morning, low-impact workouts. Bad left knee. Owns dumbbells.',
    );
  });

  it('makes exactly one API call when the response is valid on the first attempt', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    await summarizeContextRecord(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('succeeds without conversation entries (empty conversation path)', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    const result = await summarizeContextRecord(FIXTURE_INPUT_NO_CONVERSATION);

    expect(result.schemaVersion).toBe(1);
    expect(result.content).toBeDefined();
  });
});

// ── Token logging ─────────────────────────────────────────────────────────────

describe('summarizeContextRecord — token logging', () => {
  it('logs model, promptVersion, inputTokens, and outputTokens after a successful call', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeSuccessResponse());

    await summarizeContextRecord(FIXTURE_INPUT);

    const logCalls = (logger.log as jest.Mock).mock.calls;
    const tokenLog = logCalls.find(
      (call: unknown[]) =>
        typeof call[1] === 'object' &&
        call[1] !== null &&
        'inputTokens' in (call[1] as object),
    );
    expect(tokenLog).toBeDefined();
    expect(tokenLog[1]).toMatchObject({ inputTokens: 80, outputTokens: 40 });
  });
});

// ── Network retry ─────────────────────────────────────────────────────────────

describe('summarizeContextRecord — network retry', () => {
  it('retries once on AbortError (timeout) and succeeds on the second call', async () => {
    jest.useFakeTimers();
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    mockMessagesCreate
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(makeSuccessResponse());

    const p = summarizeContextRecord(FIXTURE_INPUT);
    await jest.runAllTimersAsync();
    const result = await p;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.schemaVersion).toBe(1);
  });

  it('retries once on a 5xx APIError and succeeds on the second call', async () => {
    jest.useFakeTimers();
    const serverError = new MockAPIError('Internal Server Error', 500);
    mockMessagesCreate
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(makeSuccessResponse());

    const p = summarizeContextRecord(FIXTURE_INPUT);
    await jest.runAllTimersAsync();
    const result = await p;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.schemaVersion).toBe(1);
  });

  it('throws SummarizeContextRecordError after both network attempts fail', async () => {
    jest.useFakeTimers();
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    mockMessagesCreate.mockRejectedValue(abortError);

    const p = summarizeContextRecord(FIXTURE_INPUT);
    const rejection = expect(p).rejects.toThrow(SummarizeContextRecordError);
    await jest.runAllTimersAsync();
    await rejection;

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a non-retryable 4xx APIError', async () => {
    const clientError = new MockAPIError('Bad Request', 400);
    mockMessagesCreate.mockRejectedValueOnce(clientError);

    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(
      SummarizeContextRecordError,
    );
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('logs an error when the API call fails', async () => {
    const clientError = new MockAPIError('Unauthorized', 401);
    mockMessagesCreate.mockRejectedValueOnce(clientError);

    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(
      SummarizeContextRecordError,
    );
    expect(logger.error).toHaveBeenCalled();
  });
});

// ── Tool extraction retry ─────────────────────────────────────────────────────
// extractToolCallArgs throws when no submit_summary block is found.
// runSummaryLoop catches this, appends the assistant response, and continues.

describe('summarizeContextRecord — tool extraction retry', () => {
  it('retries when the response contains no submit_summary block', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeNoToolResponse())
      .mockResolvedValueOnce(makeSuccessResponse());

    const result = await summarizeContextRecord(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.schemaVersion).toBe(1);
  });

  it('appends assistant response + tool_result error to conversation on tool-extraction retry', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(makeNoToolResponse())
      .mockResolvedValueOnce(makeSuccessResponse());

    await summarizeContextRecord(FIXTURE_INPUT);

    // Second call messages = [original_user, assistant_no_tool, user_tool_result_error]
    const secondCallArgs = mockMessagesCreate.mock.calls[1][0] as {
      messages: { role: string; content: unknown }[];
    };
    const messages = secondCallArgs.messages;
    expect(messages).toHaveLength(3);
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');
    const userContent = messages[2].content as { type: string; is_error: boolean }[];
    expect(userContent[0].type).toBe('tool_result');
    expect(userContent[0].is_error).toBe(true);
  });

  it('throws SummarizeContextRecordError after all 3 responses lack submit_summary', async () => {
    mockMessagesCreate.mockResolvedValue(makeNoToolResponse());

    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(
      SummarizeContextRecordError,
    );
    // attempt 0 + attempt 1 + attempt 2 = 3 total calls
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });
});

// ── Validation retry ──────────────────────────────────────────────────────────

describe('summarizeContextRecord — validation retry', () => {
  it('retries on Zod validation failure and succeeds on the second attempt', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(
        makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
      )
      .mockResolvedValueOnce(makeSuccessResponse(VALID_TOOL_ARGS, 'tu-good'));

    const result = await summarizeContextRecord(FIXTURE_INPUT);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(result.content).toBe(
      'User prefers morning, low-impact workouts. Bad left knee. Owns dumbbells.',
    );
  });

  it('sends a tool_result error message in the retry conversation on validation failure', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(
        makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
      )
      .mockResolvedValueOnce(makeSuccessResponse(VALID_TOOL_ARGS, 'tu-good'));

    await summarizeContextRecord(FIXTURE_INPUT);

    const secondCallArgs = mockMessagesCreate.mock.calls[1][0] as {
      messages: { role: string; content: unknown }[];
    };
    const messages = secondCallArgs.messages;
    // [original_user, assistant_bad_tool_use, tool_result_error]
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

  it('throws SummarizeContextRecordError after exhausting all validation attempts', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
    );

    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(
      SummarizeContextRecordError,
    );
    // attempt 0 + attempt 1 + attempt 2 = 3 total calls
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });

  it('error message references validation failure after exhaustion', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeSuccessResponse(INVALID_TOOL_ARGS as Record<string, unknown>, 'tu-bad'),
    );

    await expect(summarizeContextRecord(FIXTURE_INPUT)).rejects.toThrow(/Validation failed after/);
  });
});

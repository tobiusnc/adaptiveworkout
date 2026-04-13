// src/ai/summarizeContextRecord.ts
// AI function: summarizeContextRecord
//
// Condenses a PlanContextRecord, preserving high-signal persistent facts
// (physical limitations, equipment constraints, strong preferences) and
// dropping transient or superseded entries.
//
// Call contract (PRD §5.3):
//   1. Async — never blocks UI thread.
//   2. Timeout — 30 000 ms explicit.
//   3. Retry — one retry with backoff on timeout or 5xx.
//   4. Fallback — throw SummarizeContextRecordError when all retries fail.
//      Callers SKIP condensation and retain the existing record on failure.
//      This is a non-blocking failure: the app continues with the uncondensed record.
//   5. Token logging — log model, inputTokens, outputTokens, promptVersion after each call.
//   6. Error logging — log error + context on any failure.
//   7. Loading state — caller responsibility (show loading UI before calling this function).
//   8. Error state — caller responsibility (catch SummarizeContextRecordError, retain existing record).

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  SummarizeContextRecordInput,
  SummarizeContextRecordOutput,
} from '../types/index';
import { SUMMARIZATION_MODEL } from './models';
import { logger } from '../utils/logger';
import {
  SUMMARIZE_CONTEXT_RECORD_PROMPT_VERSION,
  SUMMARIZE_CONTEXT_RECORD_SYSTEM_PROMPT,
} from './prompts/summarizeContextRecord';

// ── Error type ────────────────────────────────────────────────────────────────
// Thrown when all retries fail. Callers must catch and retain the existing
// context record — condensation failure is non-blocking.

export class SummarizeContextRecordError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SummarizeContextRecordError';
  }
}

// ── Zod validation schema ─────────────────────────────────────────────────────

const SummarizeContextRecordOutputSchema = z.object({
  schemaVersion: z.number(),
  content: z.string(),
});

// ── Tool definition (JSON Schema for Anthropic SDK) ───────────────────────────

const SUBMIT_SUMMARY_TOOL: Anthropic.Tool = {
  name: 'submit_summary',
  description:
    'Submit the condensed context record. This is the only way to return output.',
  input_schema: {
    type: 'object' as const,
    required: ['schemaVersion', 'content'],
    properties: {
      schemaVersion: { type: 'number' as const },
      content: { type: 'string' as const },
    },
  },
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;
const NETWORK_RETRY_BACKOFF_MS = 2_000;
const MAX_VALIDATION_RETRIES = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create an AbortSignal that fires after the given timeout.
 * Returns both the signal and a cleanup function to clear the timer.
 */
function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timerId),
  };
}

/**
 * Determine whether an error is retryable at the network level
 * (timeout or HTTP 5xx).
 */
function isNetworkRetryable(error: unknown): boolean {
  // AbortController timeout — check by name because DOMException does not exist in Hermes.
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  // Anthropic SDK wraps HTTP errors in APIError
  if (error instanceof Anthropic.APIError && error.status >= 500) {
    return true;
  }
  return false;
}

/**
 * Build the user message from SummarizeContextRecordInput.
 * Includes the current context record content and the conversation history.
 */
function buildUserMessage(input: SummarizeContextRecordInput): string {
  const parts: string[] = [
    '## Current Context Record',
    input.currentRecord.content,
  ];

  if (input.conversation.length > 0) {
    parts.push('');
    parts.push('## Recent Conversation');
    for (const msg of input.conversation) {
      parts.push(`[${msg.role}]: ${msg.content}`);
    }
  }

  parts.push('');
  parts.push(
    'Condense the context record above, preserving all high-signal persistent facts ' +
    'and dropping transient or superseded entries. ' +
    'Call the submit_summary tool with the condensed content. ' +
    'Set schemaVersion to 1.',
  );

  return parts.join('\n');
}

/**
 * Extract the tool call arguments from the API response.
 * Throws if no submit_summary tool_use block is found.
 */
function extractToolCallArgs(response: Anthropic.Message): unknown {
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'submit_summary') {
      return block.input;
    }
  }
  throw new Error('No submit_summary tool_use block found in response');
}

// ── Core API call ─────────────────────────────────────────────────────────────

/**
 * Make a single Anthropic API call with timeout.
 * Returns the raw Message on success.
 * Throws on timeout (AbortError) or SDK error.
 */
async function callAnthropic(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);
  try {
    const response = await client.messages.create(
      {
        model: SUMMARIZATION_MODEL,
        max_tokens: 4096,
        system: SUMMARIZE_CONTEXT_RECORD_SYSTEM_PROMPT,
        messages,
        tools: [SUBMIT_SUMMARY_TOOL],
        tool_choice: { type: 'tool', name: 'submit_summary' },
      },
      { signal },
    );
    return response;
  } finally {
    cleanup();
  }
}

/**
 * Attempt one API call with one network-level retry on timeout / 5xx.
 */
async function callWithNetworkRetry(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
  try {
    return await callAnthropic(client, messages);
  } catch (error: unknown) {
    if (isNetworkRetryable(error)) {
      logger.error('[summarizeContextRecord] network error, retrying after backoff:', {
        message: error instanceof Error ? error.message : String(error),
        context: 'network_retry',
      });
      await new Promise<void>((resolve) => setTimeout(resolve, NETWORK_RETRY_BACKOFF_MS));
      return await callAnthropic(client, messages);
    }
    throw error;
  }
}

/**
 * Attempt one API call, log token usage, and throw SummarizeContextRecordError on failure.
 */
async function executeApiAttempt(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  attempt: number,
): Promise<Anthropic.Message> {
  let response: Anthropic.Message;
  try {
    response = await callWithNetworkRetry(client, messages);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[summarizeContextRecord] error:', {
      message: msg,
      context: 'api_call_failed',
      attempt,
    });
    throw new SummarizeContextRecordError(`API call failed: ${msg}`, error);
  }
  // Token logging (PRD §5.3 item 5)
  logger.log('[summarizeContextRecord] tokens:', {
    model: SUMMARIZATION_MODEL,
    promptVersion: SUMMARIZE_CONTEXT_RECORD_PROMPT_VERSION,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });
  return response;
}

/**
 * Build the two conversation messages that ask the model to correct a
 * validation failure: [assistant tool-use, user tool_result with error].
 */
function buildValidationRetryMessages(
  response: Anthropic.Message,
  validationErrorStr: string,
): Anthropic.MessageParam[] {
  const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
  const toolUseId =
    toolUseBlock && 'id' in toolUseBlock ? (toolUseBlock as { id: string }).id : 'unknown';
  return [
    { role: 'assistant', content: response.content },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          is_error: true,
          content: `Schema validation failed:\n${validationErrorStr}\n\nPlease fix these issues and call submit_summary again.`,
        },
      ],
    },
  ];
}

/**
 * Run the validation-retry loop: up to MAX_VALIDATION_RETRIES + 1 API calls,
 * returning the first valid SummarizeContextRecordOutput.
 */
async function runSummaryLoop(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
): Promise<SummarizeContextRecordOutput> {
  // Work on a local copy so the caller's array is never mutated.
  const localMessages = [...messages];

  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const response = await executeApiAttempt(client, localMessages, attempt);

    let rawArgs: unknown;
    try {
      rawArgs = extractToolCallArgs(response);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[summarizeContextRecord] error:', {
        message: msg,
        context: 'tool_extraction_failed',
        attempt,
      });
      if (attempt < MAX_VALIDATION_RETRIES) {
        localMessages.push(...buildValidationRetryMessages(response, msg));
        continue;
      }
      throw new SummarizeContextRecordError(`Tool extraction failed: ${msg}`, error);
    }

    const parseResult = SummarizeContextRecordOutputSchema.safeParse(rawArgs);
    if (parseResult.success) {
      logger.log('[summarizeContextRecord] validation passed, returning summary');
      return parseResult.data as SummarizeContextRecordOutput;
    }

    const validationErrorStr = parseResult.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    logger.error('[summarizeContextRecord] error:', {
      message: 'Zod validation failed',
      context: 'validation_failed',
      attempt,
      errors: validationErrorStr,
    });

    if (attempt < MAX_VALIDATION_RETRIES) {
      localMessages.push(...buildValidationRetryMessages(response, validationErrorStr));
      continue;
    }
    throw new SummarizeContextRecordError(
      `Validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts:\n${validationErrorStr}`,
    );
  }
  // Unreachable — TypeScript requires a return path after the loop.
  throw new SummarizeContextRecordError('Unexpected: exited retry loop without result');
}

// ── summarizeContextRecord ───────────────────────────────────────────────────

export async function summarizeContextRecord(
  input: SummarizeContextRecordInput,
): Promise<SummarizeContextRecordOutput> {
  logger.log('[summarizeContextRecord] starting:', {
    model: SUMMARIZATION_MODEL,
    promptVersion: SUMMARIZE_CONTEXT_RECORD_PROMPT_VERSION,
    schemaVersion: input.schemaVersion,
  });

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    const msg = 'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set';
    logger.error('[summarizeContextRecord] error:', { message: msg, context: 'missing_api_key' });
    throw new SummarizeContextRecordError(msg);
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildUserMessage(input) },
  ];
  return runSummaryLoop(client, messages);
}

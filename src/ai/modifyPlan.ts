// src/ai/modifyPlan.ts
// AI function: modifyPlan
//
// Call contract (PRD §5.3):
//   1. Async — never blocks UI thread.
//   2. Timeout — 30 000 ms explicit.
//   3. Retry — one retry with backoff on timeout or 5xx.
//   4. Fallback — throw ModifyPlanError when all retries fail.
//   5. Token logging — log model, inputTokens, outputTokens after each call.
//   6. Error logging — log error + context on any failure.
//   7. Loading state — callers show loading UI before calling this function.
//   8. Error state — callers show user-friendly message on ModifyPlanError.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  ModifyPlanInput,
  ModifyPlanOutput,
  Exercise,
  Session,
  SessionFeedback,
  ConversationMessage,
} from '../types/index';
import { REASONING_MODEL } from './models';
import { logger } from '../utils/logger';
import {
  MODIFY_PLAN_PROMPT_VERSION,
  MODIFY_PLAN_SYSTEM_PROMPT,
} from './prompts/modifyPlan';

// ── Error type ────────────────────────────────────────────────────────────────
// Thrown when all retries fail. Callers must catch and display user-friendly UI.

export class ModifyPlanError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ModifyPlanError';
  }
}

// ── Discriminated union return type ──────────────────────────────────────────

export type ModifyPlanResult =
  | { type: 'clarification'; message: string }
  | { type: 'proposal'; output: ModifyPlanOutput };

// ── Zod validation schema ────────────────────────────────────────────────────

const ExerciseDraftPartialSchema = z.object({
  phase: z
    .union([
      z.literal('warmup'),
      z.literal('main'),
      z.literal('cooldown'),
      z.null(),
    ])
    .optional(),
  order: z.number().optional(),
  name: z.string().optional(),
  type: z.union([z.literal('timed'), z.literal('rep')]).optional(),
  durationSec: z.number().nullable().optional(),
  reps: z.number().nullable().optional(),
  weight: z.string().nullable().optional(),
  equipment: z.string().optional(),
  formCues: z.array(z.string()).optional(),
  youtubeSearchQuery: z.string().nullable().optional(),
  isBilateral: z.boolean().optional(),
});

const PlanConfigPartialSchema = z.object({
  defaultWorkSec: z.number().optional(),
  restBetweenExSec: z.number().optional(),
  stretchBetweenRoundsSec: z.number().optional(),
  restBetweenRoundsSec: z.number().optional(),
  warmupDelayBetweenItemsSec: z.number().optional(),
  cooldownDelayBetweenItemsSec: z.number().optional(),
});

const PlanDraftPartialSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  config: PlanConfigPartialSchema.optional(),
});

const SessionDraftPartialSchema = z.object({
  name: z.string().optional(),
  type: z
    .union([
      z.literal('resistance'),
      z.literal('mobility'),
      z.literal('stretching'),
    ])
    .optional(),
  orderInPlan: z.number().optional(),
  rounds: z.number().optional(),
  estimatedDurationMinutes: z.number().optional(),
  workSec: z.number().optional(),
  restBetweenExSec: z.number().optional(),
  stretchBetweenRoundsSec: z.number().optional(),
  restBetweenRoundsSec: z.number().optional(),
  warmupDelayBetweenItemsSec: z.number().optional(),
  cooldownDelayBetweenItemsSec: z.number().optional(),
  betweenRoundExercise: ExerciseDraftPartialSchema.nullable().optional(),
});

const ExerciseChangeSchema = z.object({
  exerciseId: z.string().nullable(),
  action: z.union([
    z.literal('update'),
    z.literal('add'),
    z.literal('remove'),
  ]),
  exerciseDraft: ExerciseDraftPartialSchema.nullable(),
});

const SessionChangeSchema = z.object({
  sessionId: z.string().nullable(),
  action: z.union([
    z.literal('update'),
    z.literal('add'),
    z.literal('remove'),
  ]),
  sessionDraft: SessionDraftPartialSchema.nullable(),
  exerciseChanges: z.array(ExerciseChangeSchema),
});

const ModifyPlanOutputSchema = z.object({
  schemaVersion: z.number(),
  summary: z.string(),
  planChanges: PlanDraftPartialSchema.nullable(),
  sessionChanges: z.array(SessionChangeSchema),
  contextRecordUpdate: z.string().nullable(),
});

// ── Tool definition (JSON Schema for Anthropic SDK) ─────────────────────────

const EXERCISE_DRAFT_PARTIAL_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    phase: {
      anyOf: [
        {
          type: 'string' as const,
          enum: ['warmup', 'main', 'cooldown'],
        },
        { type: 'null' as const },
      ],
    },
    order: { type: 'number' as const },
    name: { type: 'string' as const },
    type: { type: 'string' as const, enum: ['timed', 'rep'] },
    durationSec: {
      anyOf: [{ type: 'number' as const }, { type: 'null' as const }],
    },
    reps: {
      anyOf: [{ type: 'number' as const }, { type: 'null' as const }],
    },
    weight: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
    },
    equipment: { type: 'string' as const },
    formCues: { type: 'array' as const, items: { type: 'string' as const } },
    youtubeSearchQuery: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
    },
    isBilateral: { type: 'boolean' as const },
  },
};

const SUBMIT_MODIFICATION_TOOL: Anthropic.Tool = {
  name: 'submit_modification',
  description:
    'Submit proposed plan modifications. Only call this when proposing a concrete change, not for clarifications.',
  input_schema: {
    type: 'object' as const,
    required: [
      'schemaVersion',
      'summary',
      'planChanges',
      'sessionChanges',
      'contextRecordUpdate',
    ],
    properties: {
      schemaVersion: { type: 'number' as const },
      summary: { type: 'string' as const },
      planChanges: {
        anyOf: [
          {
            type: 'object' as const,
            properties: {
              name: { type: 'string' as const },
              description: { type: 'string' as const },
              config: {
                type: 'object' as const,
                properties: {
                  defaultWorkSec: { type: 'number' as const },
                  restBetweenExSec: { type: 'number' as const },
                  stretchBetweenRoundsSec: { type: 'number' as const },
                  restBetweenRoundsSec: { type: 'number' as const },
                  warmupDelayBetweenItemsSec: { type: 'number' as const },
                  cooldownDelayBetweenItemsSec: { type: 'number' as const },
                },
              },
            },
          },
          { type: 'null' as const },
        ],
      },
      sessionChanges: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          required: [
            'sessionId',
            'action',
            'sessionDraft',
            'exerciseChanges',
          ],
          properties: {
            sessionId: {
              anyOf: [
                { type: 'string' as const },
                { type: 'null' as const },
              ],
            },
            action: {
              type: 'string' as const,
              enum: ['update', 'add', 'remove'],
            },
            sessionDraft: {
              anyOf: [
                {
                  type: 'object' as const,
                  properties: {
                    name: { type: 'string' as const },
                    type: {
                      type: 'string' as const,
                      enum: ['resistance', 'mobility', 'stretching'],
                    },
                    orderInPlan: { type: 'number' as const },
                    rounds: { type: 'number' as const },
                    estimatedDurationMinutes: { type: 'number' as const },
                    workSec: { type: 'number' as const },
                    restBetweenExSec: { type: 'number' as const },
                    stretchBetweenRoundsSec: { type: 'number' as const },
                    restBetweenRoundsSec: { type: 'number' as const },
                    warmupDelayBetweenItemsSec: { type: 'number' as const },
                    cooldownDelayBetweenItemsSec: { type: 'number' as const },
                    betweenRoundExercise: {
                      anyOf: [
                        EXERCISE_DRAFT_PARTIAL_JSON_SCHEMA,
                        { type: 'null' as const },
                      ],
                    },
                  },
                },
                { type: 'null' as const },
              ],
            },
            exerciseChanges: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                required: ['exerciseId', 'action', 'exerciseDraft'],
                properties: {
                  exerciseId: {
                    anyOf: [
                      { type: 'string' as const },
                      { type: 'null' as const },
                    ],
                  },
                  action: {
                    type: 'string' as const,
                    enum: ['update', 'add', 'remove'],
                  },
                  exerciseDraft: {
                    anyOf: [
                      EXERCISE_DRAFT_PARTIAL_JSON_SCHEMA,
                      { type: 'null' as const },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      contextRecordUpdate: {
        anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
      },
    },
  },
};

// ── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;
const NETWORK_RETRY_BACKOFF_MS = 2_000;
const MAX_VALIDATION_RETRIES = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create an AbortSignal that fires after the given timeout.
 * Returns both the signal and a cleanup function to clear the timer.
 */
function createTimeoutSignal(ms: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
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
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Anthropic.APIError && error.status >= 500) {
    return true;
  }
  return false;
}

/**
 * Format a single exercise for the user message context block.
 */
function formatExercise(exercise: Exercise): string {
  const parts: string[] = [
    `    - [${exercise.id}] ${exercise.name}`,
    `      phase: ${exercise.phase ?? 'between-round'}`,
    `      order: ${exercise.order}`,
    `      type: ${exercise.type}`,
  ];
  if (exercise.durationSec !== null) {
    parts.push(`      durationSec: ${exercise.durationSec}`);
  }
  if (exercise.reps !== null) {
    parts.push(`      reps: ${exercise.reps}`);
  }
  if (exercise.weight !== null) {
    parts.push(`      weight: ${exercise.weight}`);
  }
  parts.push(`      equipment: ${exercise.equipment}`);
  parts.push(`      isBilateral: ${exercise.isBilateral}`);
  parts.push(`      formCues: ${exercise.formCues.join('; ')}`);
  return parts.join('\n');
}

/**
 * Format a single session and its exercises for the user message context block.
 */
function formatSession(
  session: Session,
  exercises: Exercise[],
): string {
  const sessionExercises = exercises.filter(
    (ex) => ex.sessionId === session.id,
  );
  const parts: string[] = [
    `  Session [${session.id}]: ${session.name}`,
    `    type: ${session.type}`,
    `    orderInPlan: ${session.orderInPlan}`,
    `    rounds: ${session.rounds}`,
    `    estimatedDurationMinutes: ${session.estimatedDurationMinutes}`,
    `    workSec: ${session.workSec}`,
    `    restBetweenExSec: ${session.restBetweenExSec}`,
    `    stretchBetweenRoundsSec: ${session.stretchBetweenRoundsSec}`,
    `    restBetweenRoundsSec: ${session.restBetweenRoundsSec}`,
    `    warmupDelayBetweenItemsSec: ${session.warmupDelayBetweenItemsSec}`,
    `    cooldownDelayBetweenItemsSec: ${session.cooldownDelayBetweenItemsSec}`,
    `    betweenRoundExerciseId: ${session.betweenRoundExerciseId ?? 'none'}`,
    '    Exercises:',
  ];
  for (const exercise of sessionExercises) {
    parts.push(formatExercise(exercise));
  }
  return parts.join('\n');
}

/**
 * Format recent feedback entries for the user message context block.
 * Skips entries where commentText is null.
 */
function formatFeedback(feedback: SessionFeedback[]): string {
  const entries: string[] = [];
  for (const fb of feedback) {
    if (fb.commentText !== null) {
      entries.push(`- [${fb.completedAt}] ${fb.commentText}`);
    }
  }
  if (entries.length === 0) {
    return '';
  }
  return '## Recent Session Feedback\n' + entries.join('\n');
}

/**
 * Format the conversation history for inclusion in the user message.
 */
function formatConversation(conversation: ConversationMessage[]): string {
  const parts: string[] = [];
  for (const msg of conversation) {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    parts.push(`${roleLabel}: ${msg.content}`);
  }
  return parts.join('\n\n');
}

/**
 * Build the single user message string from ModifyPlanInput.
 * Assembles all plan context + conversation into one message.
 */
function buildUserMessage(
  input: ModifyPlanInput,
): string {
  const recentFeedback = input.recentFeedback;
  const plan = input.currentPlan;
  const parts: string[] = [
    '## Current Plan',
    `Name: ${plan.name}`,
    `Description: ${plan.description}`,
    `Config:`,
    `  defaultWorkSec: ${plan.config.defaultWorkSec}`,
    `  restBetweenExSec: ${plan.config.restBetweenExSec}`,
    `  stretchBetweenRoundsSec: ${plan.config.stretchBetweenRoundsSec}`,
    `  restBetweenRoundsSec: ${plan.config.restBetweenRoundsSec}`,
    `  warmupDelayBetweenItemsSec: ${plan.config.warmupDelayBetweenItemsSec}`,
    `  cooldownDelayBetweenItemsSec: ${plan.config.cooldownDelayBetweenItemsSec}`,
    '',
    '## Sessions',
  ];

  for (const session of input.currentSessions) {
    parts.push(formatSession(session, input.currentExercises));
    parts.push('');
  }

  parts.push('## Context Record');
  parts.push(input.contextRecord.content || '(empty)');
  parts.push('');

  const feedbackBlock = formatFeedback(recentFeedback);
  if (feedbackBlock.length > 0) {
    parts.push(feedbackBlock);
    parts.push('');
  }

  parts.push('## Conversation');
  parts.push(formatConversation(input.conversation));

  return parts.join('\n');
}

/**
 * Extract the tool call arguments from the API response.
 * Returns null if no submit_modification tool_use block is found
 * (indicates a clarification response).
 */
function extractToolCallArgs(
  response: Anthropic.Message,
): Record<string, unknown> | null {
  for (const block of response.content) {
    if (
      block.type === 'tool_use' &&
      block.name === 'submit_modification'
    ) {
      return block.input as Record<string, unknown>;
    }
  }
  return null;
}

/**
 * Extract the text content from the API response.
 * Returns concatenated text from all text blocks.
 */
function extractTextContent(response: Anthropic.Message): string {
  const textParts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
    }
  }
  return textParts.join('\n');
}

// ── Core API call ────────────────────────────────────────────────────────────

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
        model: REASONING_MODEL,
        max_tokens: 8192,
        system: MODIFY_PLAN_SYSTEM_PROMPT,
        messages,
        tools: [SUBMIT_MODIFICATION_TOOL],
        tool_choice: { type: 'auto' },
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
      logger.error('[modifyPlan] network error, retrying after backoff:', {
        message: error instanceof Error ? error.message : String(error),
        context: 'network_retry',
      });
      await new Promise<void>((resolve) =>
        setTimeout(resolve, NETWORK_RETRY_BACKOFF_MS),
      );
      return await callAnthropic(client, messages);
    }
    throw error;
  }
}

/**
 * Attempt one API call, log token usage, and throw ModifyPlanError on failure.
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
    logger.error('[modifyPlan] error:', {
      message: msg,
      context: 'api_call_failed',
      attempt,
    });
    throw new ModifyPlanError(`API call failed: ${msg}`, error);
  }
  // Token logging (PRD §5.3 item 5)
  logger.log('[modifyPlan] tokens:', {
    model: REASONING_MODEL,
    promptVersion: MODIFY_PLAN_PROMPT_VERSION,
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
    toolUseBlock && 'id' in toolUseBlock
      ? (toolUseBlock as { id: string }).id
      : 'unknown';
  return [
    { role: 'assistant', content: response.content },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          is_error: true,
          content: `Schema validation failed:\n${validationErrorStr}\n\nPlease fix these issues and call submit_modification again.`,
        },
      ],
    },
  ];
}

/**
 * Run the validation-retry loop for the proposal path:
 * up to MAX_VALIDATION_RETRIES + 1 API calls,
 * returning the first valid ModifyPlanOutput.
 *
 * The clarification path has no schema to validate,
 * so it returns immediately from the main modifyPlan function.
 */
async function runProposalValidationLoop(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  rawArgs: unknown,
  initialResponse: Anthropic.Message,
): Promise<ModifyPlanOutput> {
  // Attempt 0: validate the initial response
  const firstParseResult = ModifyPlanOutputSchema.safeParse(rawArgs);
  if (firstParseResult.success) {
    logger.log('[modifyPlan] validation passed on initial response');
    return firstParseResult.data as ModifyPlanOutput;
  }

  const firstErrorStr = firstParseResult.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  logger.error('[modifyPlan] error:', {
    message: 'Zod validation failed',
    context: 'validation_failed',
    attempt: 0,
    errors: firstErrorStr,
  });

  // Retry loop for validation failures
  const retryMessages: Anthropic.MessageParam[] = [
    ...messages,
    ...buildValidationRetryMessages(initialResponse, firstErrorStr),
  ];

  for (let attempt = 1; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const retryResponse = await executeApiAttempt(
      client,
      retryMessages,
      attempt,
    );

    const retryRawArgs = extractToolCallArgs(retryResponse);
    if (retryRawArgs === null) {
      // Model switched to clarification on retry — treat as validation failure
      logger.error('[modifyPlan] error:', {
        message: 'Model returned text instead of tool call on validation retry',
        context: 'validation_retry_text_response',
        attempt,
      });
      if (attempt < MAX_VALIDATION_RETRIES) {
        retryMessages.push(
          ...buildValidationRetryMessages(
            retryResponse,
            'Expected submit_modification tool call, got text response.',
          ),
        );
        continue;
      }
      throw new ModifyPlanError(
        'Validation failed: model did not call submit_modification on retry',
      );
    }

    const parseResult = ModifyPlanOutputSchema.safeParse(retryRawArgs);
    if (parseResult.success) {
      logger.log('[modifyPlan] validation passed on retry', {
        attempt,
      });
      return parseResult.data as ModifyPlanOutput;
    }

    const validationErrorStr = parseResult.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    logger.error('[modifyPlan] error:', {
      message: 'Zod validation failed',
      context: 'validation_failed',
      attempt,
      errors: validationErrorStr,
    });

    if (attempt < MAX_VALIDATION_RETRIES) {
      retryMessages.push(
        ...buildValidationRetryMessages(retryResponse, validationErrorStr),
      );
      continue;
    }

    throw new ModifyPlanError(
      `Validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts:\n${validationErrorStr}`,
    );
  }

  // Unreachable — TypeScript requires a return path after the loop.
  throw new ModifyPlanError('Unexpected: exited validation retry loop without result');
}

// ── modifyPlan ───────────────────────────────────────────────────────────────

/**
 * Send a plan modification request to the AI.
 *
 * Returns a discriminated union:
 * - { type: 'clarification', message } when the AI needs more info
 * - { type: 'proposal', output } when the AI proposes concrete changes
 *
 * @param input - The modification input containing plan, sessions, exercises,
 *   context record, recent feedback, and conversation history.
 *
 * @throws ModifyPlanError when all retries are exhausted or the API key
 *   is missing.
 */
export async function modifyPlan(
  input: ModifyPlanInput,
): Promise<ModifyPlanResult> {
  logger.log('[modifyPlan] starting:', {
    model: REASONING_MODEL,
    promptVersion: MODIFY_PLAN_PROMPT_VERSION,
    schemaVersion: input.schemaVersion,
    conversationLength: input.conversation.length,
  });

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    const msg = 'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set';
    logger.error('[modifyPlan] error:', {
      message: msg,
      context: 'missing_api_key',
    });
    throw new ModifyPlanError(msg);
  }

  const client = new Anthropic({ apiKey });
  const userMessage = buildUserMessage(input);
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  const response = await executeApiAttempt(client, messages, 0);

  // Detect response type: tool_use (proposal) vs text-only (clarification)
  const toolArgs = extractToolCallArgs(response);

  if (toolArgs !== null) {
    // Proposal path — validate with Zod, retry on failure
    const validatedOutput = await runProposalValidationLoop(
      client,
      messages,
      toolArgs,
      response,
    );
    return { type: 'proposal', output: validatedOutput };
  }

  // Clarification path — extract text content
  const clarificationText = extractTextContent(response);
  if (clarificationText.length === 0) {
    logger.error('[modifyPlan] error:', {
      message: 'Response contained neither tool call nor text content',
      context: 'empty_response',
    });
    throw new ModifyPlanError(
      'AI returned an empty response with no tool call and no text',
    );
  }

  logger.log('[modifyPlan] returning clarification response');
  return { type: 'clarification', message: clarificationText };
}

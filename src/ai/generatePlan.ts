// src/ai/generatePlan.ts
// AI function: generatePlan
//
// Call contract (PRD §5.3):
//   1. Async — never blocks UI thread.
//   2. Timeout — 30 000 ms explicit.
//   3. Retry — one retry with backoff on timeout or 5xx.
//   4. Fallback — throw GeneratePlanError when all retries fail.
//   5. Token logging — log model, inputTokens, outputTokens after each call.
//   6. Error logging — log error + context on any failure.
//   7. Loading state — callers show loading UI before calling this function.
//   8. Error state — callers show user-friendly message on GeneratePlanError.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { GeneratePlanInput, GeneratePlanOutput } from '../types/index';
import { REASONING_MODEL } from './models';
import { logger } from '../utils/logger';
import {
  GENERATE_PLAN_PROMPT_V2,
  GENERATE_PLAN_PROMPT_VERSION,
} from './prompts/generatePlan';

// ── Error type ────────────────────────────────────────────────────────────────
// Thrown when all retries fail. Callers must catch and display user-friendly UI.

export class GeneratePlanError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeneratePlanError';
  }
}

// ── Zod validation schema ─────────────────────────────────────────────────────

const ExerciseDraftSchema = z.object({
  phase: z.union([
    z.literal('warmup'),
    z.literal('main'),
    z.literal('cooldown'),
    z.null(),
  ]),
  order: z.number(),
  name: z.string(),
  type: z.union([z.literal('timed'), z.literal('rep')]),
  durationSec: z.number().nullable(),
  reps: z.number().nullable(),
  weight: z.string().nullable(),
  equipment: z.string(),
  formCues: z.array(z.string()),
  youtubeSearchQuery: z.string().nullable(),
  isBilateral: z.boolean(),
});

const PlanConfigSchema = z.object({
  defaultWorkSec: z.number(),
  restBetweenExSec: z.number(),
  stretchBetweenRoundsSec: z.number(),
  restBetweenRoundsSec: z.number(),
  warmupDelayBetweenItemsSec: z.number(),
  cooldownDelayBetweenItemsSec: z.number(),
});

const SessionDraftWithExercisesSchema = z.object({
  name: z.string(),
  type: z.union([
    z.literal('resistance'),
    z.literal('mobility'),
    z.literal('stretching'),
  ]),
  orderInPlan: z.number(),
  rounds: z.number(),
  estimatedDurationMinutes: z.number(),
  workSec: z.number(),
  restBetweenExSec: z.number(),
  stretchBetweenRoundsSec: z.number(),
  restBetweenRoundsSec: z.number(),
  warmupDelayBetweenItemsSec: z.number(),
  cooldownDelayBetweenItemsSec: z.number(),
  betweenRoundExercise: ExerciseDraftSchema.nullable(),
  exercises: z.array(ExerciseDraftSchema),
});

const GeneratePlanOutputSchema = z.object({
  schemaVersion: z.number(),
  plan: z.object({
    name: z.string(),
    description: z.string(),
    config: PlanConfigSchema,
  }),
  sessions: z.array(SessionDraftWithExercisesSchema),
});

// ── Tool definition (JSON Schema for Anthropic SDK) ───────────────────────────

const SUBMIT_PLAN_TOOL: Anthropic.Tool = {
  name: 'submit_plan',
  description:
    'Submit the generated workout plan. This is the only way to return the plan.',
  input_schema: {
    type: 'object' as const,
    required: ['schemaVersion', 'plan', 'sessions'],
    properties: {
      schemaVersion: { type: 'number' as const },
      plan: {
        type: 'object' as const,
        required: ['name', 'description', 'config'],
        properties: {
          name: { type: 'string' as const },
          description: { type: 'string' as const },
          config: {
            type: 'object' as const,
            required: [
              'defaultWorkSec',
              'restBetweenExSec',
              'stretchBetweenRoundsSec',
              'restBetweenRoundsSec',
              'warmupDelayBetweenItemsSec',
              'cooldownDelayBetweenItemsSec',
            ],
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
      sessions: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          required: [
            'name',
            'type',
            'orderInPlan',
            'rounds',
            'estimatedDurationMinutes',
            'workSec',
            'restBetweenExSec',
            'stretchBetweenRoundsSec',
            'restBetweenRoundsSec',
            'warmupDelayBetweenItemsSec',
            'cooldownDelayBetweenItemsSec',
            'betweenRoundExercise',
            'exercises',
          ],
          properties: {
            name: { type: 'string' as const },
            type: { type: 'string' as const, enum: ['resistance', 'mobility', 'stretching'] },
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
                {
                  type: 'object' as const,
                  required: [
                    'phase',
                    'order',
                    'name',
                    'type',
                    'durationSec',
                    'reps',
                    'weight',
                    'equipment',
                    'formCues',
                    'youtubeSearchQuery',
                    'isBilateral',
                  ],
                  properties: {
                    phase: { anyOf: [{ type: 'string' as const, enum: ['warmup', 'main', 'cooldown'] }, { type: 'null' as const }] },
                    order: { type: 'number' as const },
                    name: { type: 'string' as const },
                    type: { type: 'string' as const, enum: ['timed', 'rep'] },
                    durationSec: { anyOf: [{ type: 'number' as const }, { type: 'null' as const }] },
                    reps: { anyOf: [{ type: 'number' as const }, { type: 'null' as const }] },
                    weight: { anyOf: [{ type: 'string' as const }, { type: 'null' as const }] },
                    equipment: { type: 'string' as const },
                    formCues: { type: 'array' as const, items: { type: 'string' as const } },
                    youtubeSearchQuery: { anyOf: [{ type: 'string' as const }, { type: 'null' as const }] },
                    isBilateral: { type: 'boolean' as const },
                  },
                },
                { type: 'null' as const },
              ],
            },
            exercises: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                required: [
                  'phase',
                  'order',
                  'name',
                  'type',
                  'durationSec',
                  'reps',
                  'weight',
                  'equipment',
                  'formCues',
                  'youtubeSearchQuery',
                  'isBilateral',
                ],
                properties: {
                  phase: { anyOf: [{ type: 'string' as const, enum: ['warmup', 'main', 'cooldown'] }, { type: 'null' as const }] },
                  order: { type: 'number' as const },
                  name: { type: 'string' as const },
                  type: { type: 'string' as const, enum: ['timed', 'rep'] },
                  durationSec: { anyOf: [{ type: 'number' as const }, { type: 'null' as const }] },
                  reps: { anyOf: [{ type: 'number' as const }, { type: 'null' as const }] },
                  weight: { anyOf: [{ type: 'string' as const }, { type: 'null' as const }] },
                  equipment: { type: 'string' as const },
                  formCues: { type: 'array' as const, items: { type: 'string' as const } },
                  youtubeSearchQuery: { anyOf: [{ type: 'string' as const }, { type: 'null' as const }] },
                  isBilateral: { type: 'boolean' as const },
                },
              },
            },
          },
        },
      },
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
  // AbortController timeout
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  // Anthropic SDK wraps HTTP errors in APIError
  if (error instanceof Anthropic.APIError && error.status >= 500) {
    return true;
  }
  return false;
}

/**
 * Build the user message from GeneratePlanInput.
 */
function buildUserMessage(input: GeneratePlanInput): string {
  const profile = input.userProfile;
  const parts: string[] = [
    '## User Profile',
    `Primary Goal: ${profile.primaryGoal}`,
    `Equipment: ${profile.equipment.length > 0 ? profile.equipment.join(', ') : 'bodyweight only'}`,
    `Sessions Per Week: ${profile.sessionsPerWeek}`,
    `Target Duration: ${profile.targetDuration} minutes`,
    `Fitness Level: ${profile.fitnessLevel}`,
    `Limitations: ${profile.limitations || 'None stated'}`,
  ];

  if (profile.additionalContext) {
    parts.push(`Additional Context: ${profile.additionalContext}`);
  }

  if (input.recentFeedback.length > 0) {
    parts.push('');
    parts.push('## Recent Session Feedback');
    for (const fb of input.recentFeedback) {
      if (fb.commentText) {
        parts.push(`- [${fb.completedAt}] ${fb.commentText}`);
      }
    }
  }

  parts.push('');
  parts.push(
    `Generate a complete workout plan with exactly ${profile.sessionsPerWeek} sessions. ` +
    `Each session should target ${profile.targetDuration} minutes. ` +
    'Call the submit_plan tool with the result.',
  );

  return parts.join('\n');
}

/**
 * Extract the tool call arguments from the API response.
 * Throws if no tool_use block is found.
 */
function extractToolCallArgs(response: Anthropic.Message): unknown {
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'submit_plan') {
      return block.input;
    }
  }
  throw new Error('No submit_plan tool_use block found in response');
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
        model: REASONING_MODEL,
        max_tokens: 8192,
        system: GENERATE_PLAN_PROMPT_V2,
        messages,
        tools: [SUBMIT_PLAN_TOOL],
        tool_choice: { type: 'tool', name: 'submit_plan' },
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
      logger.error('[generatePlan] network error, retrying after backoff:', {
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
 * Attempt one API call, log token usage, and throw GeneratePlanError on failure.
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
    logger.error('[generatePlan] error:', { message: msg, context: 'api_call_failed', attempt });
    throw new GeneratePlanError(`API call failed: ${msg}`, error);
  }
  // Token logging (PRD §5.3 item 5)
  logger.log('[generatePlan] tokens:', {
    model: REASONING_MODEL,
    promptVersion: GENERATE_PLAN_PROMPT_VERSION,
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
          content: `Schema validation failed:\n${validationErrorStr}\n\nPlease fix these issues and call submit_plan again.`,
        },
      ],
    },
  ];
}

/**
 * Run the validation-retry loop: up to MAX_VALIDATION_RETRIES + 1 API calls,
 * returning the first valid GeneratePlanOutput.
 */
async function runPlanLoop(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
): Promise<GeneratePlanOutput> {
  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const response = await executeApiAttempt(client, messages, attempt);

    let rawArgs: unknown;
    try {
      rawArgs = extractToolCallArgs(response);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[generatePlan] error:', { message: msg, context: 'tool_extraction_failed', attempt });
      if (attempt < MAX_VALIDATION_RETRIES) {
        messages.push({ role: 'assistant', content: response.content });
        continue;
      }
      throw new GeneratePlanError(`Tool extraction failed: ${msg}`, error);
    }

    const parseResult = GeneratePlanOutputSchema.safeParse(rawArgs);
    if (parseResult.success) {
      logger.log('[generatePlan] validation passed, returning plan');
      return parseResult.data as GeneratePlanOutput;
    }

    const validationErrorStr = parseResult.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    logger.error('[generatePlan] error:', {
      message: 'Zod validation failed', context: 'validation_failed', attempt, errors: validationErrorStr,
    });

    if (attempt < MAX_VALIDATION_RETRIES) {
      messages.push(...buildValidationRetryMessages(response, validationErrorStr));
      continue;
    }
    throw new GeneratePlanError(
      `Validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts:\n${validationErrorStr}`,
    );
  }
  // Unreachable — TypeScript requires a return path after the loop.
  throw new GeneratePlanError('Unexpected: exited retry loop without result');
}

// ── generatePlan ──────────────────────────────────────────────────────────────

export async function generatePlan(input: GeneratePlanInput): Promise<GeneratePlanOutput> {
  logger.log('[generatePlan] starting:', {
    model: REASONING_MODEL,
    promptVersion: GENERATE_PLAN_PROMPT_VERSION,
    schemaVersion: input.schemaVersion,
  });

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    const msg = 'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set';
    logger.error('[generatePlan] error:', { message: msg, context: 'missing_api_key' });
    throw new GeneratePlanError(msg);
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildUserMessage(input) },
  ];
  return runPlanLoop(client, messages);
}

// src/ai/updateUserContext.ts
// AI function: updateUserContext
//
// Call contract (PRD §5.4):
//   1. Async — never blocks UI thread.
//   2. Timeout — 30 000 ms explicit.
//   3. Retry — one retry with backoff on timeout or 5xx.
//   4. Fallback — throw UpdateUserContextError when all retries fail.
//   5. Token logging — log model, inputTokens, outputTokens after each call.
//   6. Error logging — log error + context on any failure.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  UpdateUserContextInput,
  UpdateUserContextOutput,
  UserContextRecord,
} from '../types/index';
import { SUMMARIZATION_MODEL } from './models';
import { logger } from '../utils/logger';
import {
  UPDATE_USER_CONTEXT_PROMPT_VERSION,
  UPDATE_USER_CONTEXT_SYSTEM_PROMPT,
} from './prompts/updateUserContext';

// ── Error type ────────────────────────────────────────────────────────────────

export class UpdateUserContextError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UpdateUserContextError';
  }
}

// ── Zod validation schema ────────────────────────────────────────────────────

const PreferenceLevelSchema = z.union([
  z.literal(-2),
  z.literal(-1),
  z.literal(1),
  z.literal(2),
  z.null(),
]);

const UpdateUserContextOutputSchema = z.object({
  schemaVersion: z.number(),
  updatedContext: z.object({
    id: z.string(),
    schemaVersion: z.number(),
    userId: z.string().nullable(),
    primaryGoal: z.union([
      z.literal('general_fitness'),
      z.literal('strength'),
      z.literal('hypertrophy'),
      z.literal('weight_loss'),
      z.literal('rehabilitation'),
    ]),
    equipment: z.array(z.string()),
    sessionsPerWeek: z.number(),
    targetDuration: z.union([
      z.literal('20-30'),
      z.literal('30-45'),
      z.literal('45-60'),
      z.literal('60+'),
    ]),
    fitnessLevel: z.union([
      z.literal('beginner'),
      z.literal('intermediate'),
      z.literal('experienced'),
    ]),
    jointLimitations: z.array(z.string()),
    movementLimitations: z.array(z.string()),
    limitationsNotes: z.array(z.string()),
    preferredExercises: z.array(z.string()),
    preferredMovements: z.array(z.string()),
    preferredEquipment: z.array(z.string()),
    dislikedExercises: z.array(z.string()),
    dislikedMovements: z.array(z.string()),
    prefHigherReps: PreferenceLevelSchema,
    prefLongerRest: PreferenceLevelSchema,
    prefMoreVariety: PreferenceLevelSchema,
    prefHigherIntensity: PreferenceLevelSchema,
    prefLongerSessions: PreferenceLevelSchema,
    prefMoreRounds: PreferenceLevelSchema,
    prefCompoundFocus: PreferenceLevelSchema,
    spaceConstraint: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.null(),
    ]),
    noiseConstraint: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.null(),
    ]),
    additionalDirections: z.array(z.string()),
    updatedAt: z.string(),
    updatedByModel: z.string(),
  }),
  extractionSummary: z.string(),
});

// ── Tool definition (JSON Schema for Anthropic SDK) ─────────────────────────

const SUBMIT_CONTEXT_UPDATE_TOOL: Anthropic.Tool = {
  name: 'submit_context_update',
  description:
    'Submit the updated user context record with extracted preferences and constraints.',
  input_schema: {
    type: 'object' as const,
    required: ['schemaVersion', 'updatedContext', 'extractionSummary'],
    properties: {
      schemaVersion: { type: 'number' as const },
      updatedContext: {
        type: 'object' as const,
        required: [
          'id',
          'schemaVersion',
          'userId',
          'primaryGoal',
          'equipment',
          'sessionsPerWeek',
          'targetDuration',
          'fitnessLevel',
          'jointLimitations',
          'movementLimitations',
          'limitationsNotes',
          'preferredExercises',
          'preferredMovements',
          'preferredEquipment',
          'dislikedExercises',
          'dislikedMovements',
          'prefHigherReps',
          'prefLongerRest',
          'prefMoreVariety',
          'prefHigherIntensity',
          'prefLongerSessions',
          'prefMoreRounds',
          'prefCompoundFocus',
          'spaceConstraint',
          'noiseConstraint',
          'additionalDirections',
          'updatedAt',
          'updatedByModel',
        ],
        properties: {
          id: { type: 'string' as const },
          schemaVersion: { type: 'number' as const },
          userId: { anyOf: [{ type: 'string' as const }, { type: 'null' as const }] },
          primaryGoal: {
            type: 'string' as const,
            enum: [
              'general_fitness',
              'strength',
              'hypertrophy',
              'weight_loss',
              'rehabilitation',
            ],
          },
          equipment: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          sessionsPerWeek: { type: 'number' as const },
          targetDuration: {
            type: 'string' as const,
            enum: ['20-30', '30-45', '45-60', '60+'],
          },
          fitnessLevel: {
            type: 'string' as const,
            enum: ['beginner', 'intermediate', 'experienced'],
          },
          jointLimitations: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          movementLimitations: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          limitationsNotes: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          preferredExercises: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          preferredMovements: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          preferredEquipment: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          dislikedExercises: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          dislikedMovements: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          prefHigherReps: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          prefLongerRest: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          prefMoreVariety: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          prefHigherIntensity: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          prefLongerSessions: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          prefMoreRounds: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          prefCompoundFocus: {
            anyOf: [
              { type: 'number' as const, enum: [-2, -1, 1, 2] },
              { type: 'null' as const },
            ],
          },
          spaceConstraint: {
            anyOf: [
              { type: 'number' as const, enum: [1, 2, 3] },
              { type: 'null' as const },
            ],
          },
          noiseConstraint: {
            anyOf: [
              { type: 'number' as const, enum: [1, 2, 3] },
              { type: 'null' as const },
            ],
          },
          additionalDirections: {
            type: 'array' as const,
            items: { type: 'string' as const },
          },
          updatedAt: { type: 'string' as const },
          updatedByModel: { type: 'string' as const },
        },
      },
      extractionSummary: { type: 'string' as const },
    },
  },
};

// ── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;
const NETWORK_RETRY_BACKOFF_MS = 2_000;
const MAX_VALIDATION_RETRIES = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNetworkRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return true;
  }
  if (error instanceof Anthropic.APIUserAbortError) {
    return true;
  }
  if (error instanceof Anthropic.APIError && error.status >= 500) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractToolCallArgs(
  block: Anthropic.ContentBlockParam,
): Record<string, unknown> | null {
  if (block.type !== 'tool_use') {
    return null;
  }
  return block.input as Record<string, unknown>;
}

// ── Main function ────────────────────────────────────────────────────────────

export async function updateUserContext(
  input: UpdateUserContextInput,
): Promise<UpdateUserContextOutput> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new UpdateUserContextError('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  }

  const client = new Anthropic({ apiKey });
  let lastError: unknown;
  let lastValidationError: unknown;

  // Network retry loop (timeout or 5xx)
  for (let networkAttempt = 0; networkAttempt < 2; networkAttempt++) {
    try {
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ];

      // Validation retry loop (Zod failures)
      for (
        let validationAttempt = 0;
        validationAttempt < MAX_VALIDATION_RETRIES + 1;
        validationAttempt++
      ) {
        let response: Anthropic.Message;

        try {
          response = await client.messages.create(
            {
              model: SUMMARIZATION_MODEL,
              max_tokens: 1024,
              system: UPDATE_USER_CONTEXT_SYSTEM_PROMPT,
              tools: [SUBMIT_CONTEXT_UPDATE_TOOL],
              tool_choice: { type: 'tool', name: 'submit_context_update' },
              messages,
            },
            {
              timeout: TIMEOUT_MS,
            },
          );
        } catch (error) {
          lastError = error;
          if (isNetworkRetryable(error)) {
            if (networkAttempt < 1) {
              await sleep(NETWORK_RETRY_BACKOFF_MS);
              continue; // retry at network level
            }
          }
          const msg = error instanceof Error ? error.message : String(error);
          throw new UpdateUserContextError(`API call failed: ${msg}`, error);
        }

        // Extract tool call
        const toolBlock = response.content.find(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );

        if (!toolBlock) {
          throw new UpdateUserContextError(
            'Response missing submit_context_update tool call',
          );
        }

        const toolArgs = extractToolCallArgs(toolBlock);
        if (!toolArgs) {
          throw new UpdateUserContextError('Failed to extract tool call arguments');
        }

        // Validate output
        const validationResult = UpdateUserContextOutputSchema.safeParse(toolArgs);

        if (validationResult.success) {
          // Success! Log and return.
          logger.log('[updateUserContext] tokens:', {
            model: SUMMARIZATION_MODEL,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            promptVersion: UPDATE_USER_CONTEXT_PROMPT_VERSION,
          });

          return validationResult.data;
        }

        lastValidationError = validationResult.error;

        // Validation failed. Retry if we have attempts left.
        if (validationAttempt < MAX_VALIDATION_RETRIES) {
          const errorMessage = validationResult.error.message;
          messages.push({
            role: 'assistant',
            content: response.content,
          });
          messages.push({
            role: 'user',
            content: `Validation failed: ${errorMessage}. Please fix and resubmit.`,
          });
          continue; // retry validation
        }

        // Exhausted validation retries.
        throw new UpdateUserContextError(
          `Validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts: ${validationResult.error.message}`,
          validationResult.error,
        );
      }

      // This line should never be reached, but TypeScript needs it for control flow.
      throw new UpdateUserContextError('Unexpected control flow in validation loop');
    } catch (error) {
      if (error instanceof UpdateUserContextError) {
        throw error;
      }

      lastError = error;

      if (networkAttempt < 1 && isNetworkRetryable(error)) {
        await sleep(NETWORK_RETRY_BACKOFF_MS);
        continue; // retry network attempt
      }

      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[updateUserContext] error:', {
        error: msg,
        input,
      });

      throw new UpdateUserContextError(`API call failed: ${msg}`, error);
    }
  }

  // Exhausted all retries.
  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new UpdateUserContextError(`All retries exhausted: ${msg}`, lastError);
}

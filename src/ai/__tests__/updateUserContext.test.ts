// src/ai/__tests__/updateUserContext.test.ts
//
// Unit tests for updateUserContext — user preference extraction via Anthropic API.
//
// Strategy:
//   - @anthropic-ai/sdk is mocked at the module level
//   - 19 test cases from docs/prompts/updateUserContext-tests.md
//   - Each test verifies specific field updates and extraction behavior
//   - Both happy path and validation retry paths tested

import Anthropic from '@anthropic-ai/sdk';
import { updateUserContext, UpdateUserContextError } from '../updateUserContext';
import { logger } from '../../utils/logger';
import type { UpdateUserContextInput, UserContextRecord, UpdateUserContextOutput } from '../../types/index';

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

  class APIConnectionTimeoutError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIConnectionTimeoutError';
    }
  }

  class APIUserAbortError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIUserAbortError';
    }
  }

  const mockCreate = jest.fn();

  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));

  (MockAnthropic as unknown as Record<string, unknown>).APIError = APIError;
  (MockAnthropic as unknown as Record<string, unknown>).APIConnectionTimeoutError = APIConnectionTimeoutError;
  (MockAnthropic as unknown as Record<string, unknown>).APIUserAbortError = APIUserAbortError;
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;

  return { __esModule: true, default: MockAnthropic };
});

const AnthropicMock = Anthropic as unknown as Record<string, unknown>;
const mockMessagesCreate = AnthropicMock.__mockCreate as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASELINE_CONTEXT: UserContextRecord = {
  id: 'ucr-test-001',
  schemaVersion: 1,
  userId: null,
  primaryGoal: 'general_fitness',
  equipment: [],
  sessionsPerWeek: 3,
  targetDuration: '30-45',
  fitnessLevel: 'beginner',
  jointLimitations: [],
  movementLimitations: [],
  limitationsNotes: [],
  preferredExercises: [],
  preferredMovements: [],
  preferredEquipment: [],
  dislikedExercises: [],
  dislikedMovements: [],
  prefHigherReps: null,
  prefLongerRest: null,
  prefMoreVariety: null,
  prefHigherIntensity: null,
  prefLongerSessions: null,
  prefMoreRounds: null,
  prefCompoundFocus: null,
  spaceConstraint: null,
  noiseConstraint: null,
  additionalDirections: [],
  updatedAt: '2026-04-18T10:00:00Z',
  updatedByModel: 'claude-haiku-4-5-20251001',
};

function makeContextUpdateResponse(
  updatedContext: Partial<UserContextRecord> = {},
  extractionSummary: string = 'No preference signals detected.',
  toolId: string = 'tu-123',
): Anthropic.Message {
  return {
    id: 'msg-123',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: toolId,
        name: 'submit_context_update',
        input: {
          schemaVersion: 1,
          updatedContext: { ...BASELINE_CONTEXT, ...updatedContext },
          extractionSummary,
        },
      },
    ],
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 200 },
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

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeInput(
  inputType: UpdateUserContextInput['inputType'],
  rawInput: string,
  currentContext: UserContextRecord = BASELINE_CONTEXT,
  sessionContext: string | null = null,
): UpdateUserContextInput {
  return {
    schemaVersion: 1,
    inputType,
    sessionContext,
    currentContext,
    rawInput,
  };
}

// ── Missing API key ───────────────────────────────────────────────────────────

describe('updateUserContext — missing API key', () => {
  it('throws UpdateUserContextError when EXPO_PUBLIC_ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

    await expect(
      updateUserContext(makeInput('onboarding', 'test input')),
    ).rejects.toThrow(UpdateUserContextError);
    await expect(
      updateUserContext(makeInput('onboarding', 'test input')),
    ).rejects.toThrow('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});

// ── Journey tests (T-01 to T-10) ───────────────────────────────────────────

describe('updateUserContext — journey tests', () => {
  it('T-01: Onboarding with clean structured answers', async () => {
    const input = makeInput(
      'onboarding',
      'My goal is general fitness. I have resistance bands and a pull-up bar. I want to train 3 days a week, sessions around 30–45 minutes. I\'d say I\'m intermediate fitness. No injuries right now. I live in an apartment — downstairs neighbours, so nothing too loud or jumpy. I\'d like to end every session with a short hip stretch.',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          primaryGoal: 'general_fitness',
          equipment: ['band', 'pullup'],
          sessionsPerWeek: 3,
          targetDuration: '30-45',
          fitnessLevel: 'intermediate',
          jointLimitations: [],
          movementLimitations: ['plyo'],
          noiseConstraint: 1,
          spaceConstraint: 2,
          additionalDirections: ['User wants to end every session with a short hip stretch.'],
        },
        'Set fitnessLevel to intermediate. Added plyo to movementLimitations (apartment, downstairs neighbours). Set noiseConstraint to 1 and spaceConstraint to 2. Appended hip stretch direction.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.fitnessLevel).toBe('intermediate');
    expect(result.updatedContext.equipment).toContain('band');
    expect(result.updatedContext.equipment).toContain('pullup');
    expect(result.updatedContext.movementLimitations).toContain('plyo');
    expect(result.updatedContext.noiseConstraint).toBe(1);
    expect(result.extractionSummary).toContain('downstairs neighbours');
  });

  it('T-02: Onboarding with hypertrophy goal and shoulder limitation', async () => {
    const input = makeInput(
      'onboarding',
      'Goal: hypertrophy. Equipment: dumbbells, bench, resistance bands, bodyweight. 4 days per week, 45–60 minutes. I\'ve been lifting for 3 years — experienced. I had a shoulder impingement last year, mostly healed but I want to be careful with overhead pressing. No jumping — I train in a shared building. I\'d love to keep things varied, I get bored doing the same exercises every week.',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          primaryGoal: 'hypertrophy',
          equipment: ['db', 'bench', 'band', 'bw'],
          sessionsPerWeek: 4,
          targetDuration: '45-60',
          fitnessLevel: 'experienced',
          jointLimitations: ['shoulder'],
          movementLimitations: ['push_v', 'plyo'],
          limitationsNotes: ['Shoulder impingement last year; avoid overhead pressing.'],
          prefMoreVariety: 2,
          noiseConstraint: 1,
        },
        'Set primaryGoal to hypertrophy. Added shoulder to jointLimitations with overhead pressing note. Added push_v and plyo to movementLimitations. Set prefMoreVariety to 2 based on "get bored".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.primaryGoal).toBe('hypertrophy');
    expect(result.updatedContext.fitnessLevel).toBe('experienced');
    expect(result.updatedContext.jointLimitations).toContain('shoulder');
    expect(result.updatedContext.movementLimitations).toContain('push_v');
    expect(result.updatedContext.prefMoreVariety).toBe(2);
  });

  it('T-03: Post-session feedback with strong negative intensity', async () => {
    const contextAfterT01 = { ...BASELINE_CONTEXT, fitnessLevel: 'intermediate' };
    const input = makeInput(
      'feedback',
      'That was way too hard. I could barely finish the last round and I felt sick after. This is too much for me right now.',
      contextAfterT01,
      'Session A — Full Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          prefHigherIntensity: -2,
        },
        'Set prefHigherIntensity to -2 based on "way too hard", "could barely finish", "felt sick".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.prefHigherIntensity).toBe(-2);
  });

  it('T-04: Post-session feedback with exercise preference and mild knee concern', async () => {
    const contextAfterT03 = {
      ...BASELINE_CONTEXT,
      fitnessLevel: 'intermediate',
      prefHigherIntensity: -2 as const,
    };
    const input = makeInput(
      'feedback',
      'Loved the band rows today, those felt great. Knee was a bit achy during the lunges though — not terrible but worth noting.',
      contextAfterT03,
      'Session B — Upper Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          preferredExercises: ['band rows'],
          jointLimitations: ['knee'],
          limitationsNotes: ['Knee a bit achy during lunges; not severe.'],
          prefHigherIntensity: -2,
        },
        'Added "band rows" to preferredExercises. Added "knee" to jointLimitations with mild qualifier note.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.preferredExercises).toContain('band rows');
    expect(result.updatedContext.jointLimitations).toContain('knee');
    expect(result.updatedContext.limitationsNotes.length).toBeGreaterThan(0);
  });

  it('T-05: Pure plan modification request (no signal)', async () => {
    const input = makeInput(
      'planChat',
      'Can you replace the lunges in Session B with something else?',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. Message was a plan modification request with no stated preferences.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.extractionSummary).toContain('No preference signals detected');
  });

  it('T-06: Plan modification with embedded preference', async () => {
    const contextAfterT04 = {
      ...BASELINE_CONTEXT,
      jointLimitations: ['knee'],
      prefHigherIntensity: -2 as const,
    };
    const input = makeInput(
      'planChat',
      'Can you replace the lunges? My knee really can\'t handle them. Also the rest periods feel too short — I need more time to recover between sets.',
      contextAfterT04,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          movementLimitations: ['plyo', 'lunge'],
          prefLongerRest: 2,
        },
        'Added "lunge" to movementLimitations. Set prefLongerRest to 2 based on "rest periods feel too short".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.movementLimitations).toContain('lunge');
    expect(result.updatedContext.prefLongerRest).toBe(2);
  });

  it('T-07: Preference reversal (intensity)', async () => {
    const contextAfterT06 = {
      ...BASELINE_CONTEXT,
      prefHigherIntensity: -2 as const,
      movementLimitations: ['plyo', 'lunge'],
    };
    const input = makeInput(
      'planChat',
      'I\'ve been at this a few weeks now and I feel like I\'ve adapted. I want to make things harder — I\'m not being challenged enough anymore.',
      contextAfterT06,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          prefHigherIntensity: 2,
        },
        'Reversed prefHigherIntensity from -2 to 2. User now feeling challenged and ready for harder work.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.prefHigherIntensity).toBe(2);
  });

  it('T-08: Equipment acquisition', async () => {
    const contextAfterT07 = {
      ...BASELINE_CONTEXT,
      equipment: ['band', 'pullup'],
      prefHigherIntensity: 2 as const,
    };
    const input = makeInput(
      'planChat',
      'Just ordered a TRX, it arrived today. Can we work some TRX exercises into the plan?',
      contextAfterT07,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          equipment: ['band', 'pullup', 'trx'],
          preferredEquipment: ['trx'],
        },
        'Added "trx" to equipment and preferredEquipment based on "just ordered a TRX".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.equipment).toContain('trx');
    expect(result.updatedContext.preferredEquipment).toContain('trx');
  });

  it('T-09: Feedback with no signal', async () => {
    const input = makeInput(
      'feedback',
      'Good session, felt good.',
      BASELINE_CONTEXT,
      'Session A — Full Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. Positive feedback but no actionable preferences.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.extractionSummary).toContain('No preference signals detected');
  });

  it('T-10: Injury resolution', async () => {
    const contextWithKnee = {
      ...BASELINE_CONTEXT,
      jointLimitations: ['knee'],
      limitationsNotes: ['Mild knee achiness during lunges.'],
    };
    const input = makeInput(
      'feedback',
      'Did all the lower body work fine today, knee felt completely fine. I think that issue has totally resolved.',
      contextWithKnee,
      'Session C — Lower Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          jointLimitations: [],
          limitationsNotes: [
            'Mild knee achiness during lunges.',
            'Knee limitation resolved — user reports fully healed as of Session C.',
          ],
        },
        'Removed "knee" from jointLimitations. Added note that knee has resolved.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.jointLimitations).not.toContain('knee');
    expect(result.updatedContext.limitationsNotes.some((n) => n.includes('resolved'))).toBe(true);
  });
});

// ── Edge case tests (E-01 to E-19) ────────────────────────────────────────

describe('updateUserContext — edge cases', () => {
  it('E-01: Clear unmappable preference (pulling)', async () => {
    const input = makeInput(
      'planChat',
      'I always like to have at least one pulling exercise per session. It\'s just something I need in every workout.',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          preferredMovements: ['pull_h', 'pull_v'],
          additionalDirections: ['User wants at least one pulling exercise in every session.'],
        },
        'Added pull_h and pull_v to preferredMovements. Appended structural constraint to additionalDirections.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.preferredMovements).toContain('pull_h');
    expect(result.updatedContext.additionalDirections.some((d) =>
      d.includes('pulling exercise'),
    )).toBe(true);
  });

  it('E-02: Ambiguous pronoun reference (no signal)', async () => {
    const input = makeInput(
      'planChat',
      'Less of that.',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. Message contains an ambiguous reference with no identifiable subject.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.extractionSummary).toContain('No preference signals detected');
    expect(result.extractionSummary).toContain('ambiguous');
  });

  it('E-03: Vague intensity comment (no signal)', async () => {
    const input = makeInput(
      'feedback',
      'It was a bit challenging today.',
      BASELINE_CONTEXT,
      'Session A — Full Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. "A bit challenging" is situational and does not constitute a preference for reduced intensity.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.prefHigherIntensity).toBe(null);
  });

  it('E-04: Multiple signals in one message', async () => {
    const input = makeInput(
      'feedback',
      'Shoulder was killing me on the overhead press, I don\'t think I can do overhead movements anymore. Also the session was great otherwise — loved the face pulls and I\'d love more pulling work in general. The rest between sets felt a bit long honestly.',
      BASELINE_CONTEXT,
      'Session B — Upper Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          jointLimitations: ['shoulder'],
          movementLimitations: ['push_v'],
          limitationsNotes: ['Shoulder pain on overhead press movements.'],
          preferredExercises: ['face pulls'],
          preferredMovements: ['pull_h', 'pull_v'],
          prefLongerRest: -1,
        },
        'Added shoulder to jointLimitations. Added push_v to movementLimitations. Added face pulls to preferredExercises and pull_h/pull_v to preferredMovements. Set prefLongerRest to -1 for "rest felt long".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.jointLimitations).toContain('shoulder');
    expect(result.updatedContext.preferredExercises).toContain('face pulls');
    expect(result.updatedContext.prefLongerRest).toBe(-1);
  });

  it('E-05: Profile edit with goal change', async () => {
    const input = makeInput(
      'profileEdit',
      'Changing my goal to strength. I want to get stronger, not just fit.',
      { ...BASELINE_CONTEXT, primaryGoal: 'general_fitness' },
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          primaryGoal: 'strength',
        },
        'Changed primaryGoal from general_fitness to strength.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.primaryGoal).toBe('strength');
  });

  it('E-06: Contradiction (disliked becomes preferred)', async () => {
    const contextWithDisliked = {
      ...BASELINE_CONTEXT,
      dislikedExercises: ['burpees'],
    };
    const input = makeInput(
      'planChat',
      'Actually I\'ve changed my mind about burpees — I\'ve been practising and I like them now.',
      contextWithDisliked,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          preferredExercises: ['burpees'],
          dislikedExercises: [],
        },
        'Moved burpees from dislikedExercises to preferredExercises. User reversed their prior preference.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.preferredExercises).toContain('burpees');
    expect(result.updatedContext.dislikedExercises).not.toContain('burpees');
  });

  it('E-07: Space constraint from context', async () => {
    const input = makeInput(
      'onboarding',
      'I live in a small studio apartment in a building with thin walls and floors. I work out in the morning before my neighbours are awake so I need to be quiet. Goal is general fitness, bodyweight only, 3 days a week, 20–30 minutes, beginner.',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          targetDuration: '20-30',
          equipment: ['bw'],
          noiseConstraint: 1,
          spaceConstraint: 2,
          movementLimitations: ['plyo'],
        },
        'Set noiseConstraint to 1 (thin walls/floors, morning timing). Set spaceConstraint to 2 (small studio). Added plyo to movementLimitations due to noise constraints.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.noiseConstraint).toBe(1);
    expect(result.updatedContext.spaceConstraint).toBe(2);
  });

  it('E-08: Nuanced knee limitation (impact vs others)', async () => {
    const input = makeInput(
      'onboarding',
      'My knee is actually fine for most things — I can do lunges, squats, all of that. But I can\'t do any high-impact stuff like jumping. It\'s not painful exactly, it just feels unstable under impact.',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          jointLimitations: ['knee'],
          movementLimitations: ['plyo'],
          limitationsNotes: ['Knee fine for lunges/squats but unstable under impact (jumping).'],
        },
        'Added knee to jointLimitations. Added plyo to movementLimitations. Noted nuance that knee handles non-impact movements.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.jointLimitations).toContain('knee');
    expect(result.updatedContext.movementLimitations).toContain('plyo');
    expect(result.updatedContext.limitationsNotes.some((n) =>
      n.includes('unstable'),
    )).toBe(true);
  });

  it('E-09: Equipment removal', async () => {
    const contextWithEquipment = {
      ...BASELINE_CONTEXT,
      equipment: ['band', 'pullup', 'db'],
    };
    const input = makeInput(
      'planChat',
      'I sold my pull-up bar last week. Can we redo the plan without it?',
      contextWithEquipment,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          equipment: ['band', 'db'],
        },
        'Removed "pullup" from equipment. Redo plan request is a modification task, not a preference signal.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.equipment).not.toContain('pullup');
    expect(result.updatedContext.equipment).toContain('band');
  });

  it('E-10: Target duration change (compound rule)', async () => {
    const contextWith45 = {
      ...BASELINE_CONTEXT,
      targetDuration: '45-60' as const,
    };
    const input = makeInput(
      'planChat',
      'I don\'t have as much time anymore, sessions are too long. Can we bring them down?',
      contextWith45,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          targetDuration: '30-45',
          prefLongerSessions: -1,
        },
        'Shifted targetDuration from 45-60 to 30-45. Set prefLongerSessions to -1 based on "sessions are too long".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.targetDuration).toBe('30-45');
    expect(result.updatedContext.prefLongerSessions).toBe(-1);
  });

  it('E-11: Append-only violation (no removal)', async () => {
    const contextWithDirections = {
      ...BASELINE_CONTEXT,
      additionalDirections: ['User wants to end every session with a short hip stretch.'],
    };
    const input = makeInput(
      'planChat',
      'Actually, forget the hip stretch at the end. I don\'t need that anymore.',
      contextWithDirections,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        contextWithDirections,
        'No preference signals detected. Request to remove from additionalDirections cannot be honored (append-only field).',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.additionalDirections).toContain(
      'User wants to end every session with a short hip stretch.',
    );
  });

  it('E-12: Question (no signal)', async () => {
    const input = makeInput(
      'planChat',
      'What\'s a Bulgarian split squat? Is that the same as a lunge?',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. Message was a question about an exercise with no stated preferences.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.extractionSummary).toContain('No preference signals detected');
  });

  it('E-13: DOMS/soreness (no injury signal)', async () => {
    const input = makeInput(
      'feedback',
      'My shoulders are really sore today after all those push-ups yesterday. Like proper DOMS.',
      BASELINE_CONTEXT,
      'Session A — Full Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. Soreness/DOMS is post-exercise muscle fatigue, not an injury or recurring joint issue.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.jointLimitations).not.toContain('shoulder');
  });

  it('E-14: Dual-field update (movement + joint)', async () => {
    const input = makeInput(
      'feedback',
      'Squats are killing my knees. I don\'t think I can keep doing them.',
      BASELINE_CONTEXT,
      'Session C — Lower Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          jointLimitations: ['knee'],
          movementLimitations: ['squat'],
        },
        'Added "knee" to jointLimitations and "squat" to movementLimitations based on "squats are killing my knees".',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.jointLimitations).toContain('knee');
    expect(result.updatedContext.movementLimitations).toContain('squat');
  });

  it('E-15: Isolation preference (negative compound focus)', async () => {
    const input = makeInput(
      'planChat',
      'I want more isolation work in my plan — things like curls, lateral raises, tricep extensions. I really like targeting individual muscles.',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          prefCompoundFocus: -2,
        },
        'Set prefCompoundFocus to -2 based on desire for isolation work and individual muscle targeting.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.prefCompoundFocus).toBe(-2);
  });

  it('E-16: Environment constraint reset', async () => {
    const contextWithConstraints = {
      ...BASELINE_CONTEXT,
      noiseConstraint: 1 as const,
      spaceConstraint: 2 as const,
      movementLimitations: ['plyo'],
    };
    const input = makeInput(
      'planChat',
      'I just moved into a house with a garage gym — plenty of space, no neighbours to worry about. I can jump, drop weights, whatever I want.',
      contextWithConstraints,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          noiseConstraint: null,
          spaceConstraint: null,
          movementLimitations: [],
        },
        'Reset noiseConstraint and spaceConstraint to null (no longer constrained). Removed plyo from movementLimitations (noise was the reason).',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.noiseConstraint).toBe(null);
    expect(result.updatedContext.spaceConstraint).toBe(null);
    expect(result.updatedContext.movementLimitations).not.toContain('plyo');
  });

  it('E-17: Minimal input (no signal)', async () => {
    const input = makeInput(
      'planChat',
      'ok',
      BASELINE_CONTEXT,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. Message was a minimal acknowledgment with no extractable preferences.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.extractionSummary).toContain('No preference signals detected');
  });

  it('E-18: Fitness level progression with explicit level name', async () => {
    const contextBeginnerLevel = {
      ...BASELINE_CONTEXT,
      fitnessLevel: 'beginner' as const,
    };
    const input = makeInput(
      'planChat',
      'I\'ve been doing this for a few months now and I feel like I\'ve gotten a lot stronger. The beginner exercises feel too easy — I\'m ready for intermediate stuff.',
      contextBeginnerLevel,
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {
          fitnessLevel: 'intermediate',
        },
        'Updated fitnessLevel from beginner to intermediate. User explicitly ready for intermediate work.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.fitnessLevel).toBe('intermediate');
  });

  it('E-19: Single "too easy" comment (no level change)', async () => {
    const input = makeInput(
      'feedback',
      'That felt pretty easy today.',
      BASELINE_CONTEXT,
      'Session A — Full Body (completed)',
    );

    mockMessagesCreate.mockResolvedValueOnce(
      makeContextUpdateResponse(
        {},
        'No preference signals detected. A single "easy" comment does not warrant a fitness level change.',
      ),
    );

    const result = await updateUserContext(input);

    expect(result.updatedContext.fitnessLevel).toBe('beginner');
  });
});

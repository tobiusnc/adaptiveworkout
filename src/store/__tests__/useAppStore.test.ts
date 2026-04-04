// src/store/__tests__/useAppStore.test.ts
//
// Unit tests for Zustand store actions.
//
// Strategy:
//   - StorageService is injected via useAppStore.setState({ storageService: mock })
//     before each test that needs it (per the store's own testability contract).
//   - expo-crypto is mocked so UUID generation is deterministic.
//   - Store state is reset to the initial shape in beforeEach so tests are isolated.
//   - OpSqliteStorageService is never imported — all storage interaction is through
//     the StorageService interface.

import { useAppStore } from '../useAppStore';

import type { StorageService } from '../../storage/StorageService';
import type {
  UserProfile,
  Plan,
  Session,
  Exercise,
  GeneratePlanOutput,
} from '../../types/index';

// ── Mock expo-crypto ───────────────────────────────────────────────────────────
// randomUUID is a native API; mock it so tests control UUID values and run
// without a device runtime.

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

// Grab a typed reference after mocking so individual tests can configure
// return values with mockReturnValueOnce.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockRandomUUID = (require('expo-crypto') as { randomUUID: jest.Mock }).randomUUID;

// ── Store reset helpers ────────────────────────────────────────────────────────

const INITIAL_STORE_STATE = {
  storageService:  null,
  isInitializing:  true,
  initError:       null,
  profile:         null,
  activePlan:      null,
  planSessions:    [] as Session[],
  currentSession:  null,
  currentExercises: [] as Exercise[],
};

function resetStore(): void {
  useAppStore.setState(INITIAL_STORE_STATE);
}

// ── Mock StorageService factory ────────────────────────────────────────────────
// Creates a fresh jest.Mocked<StorageService> before each test.
// All methods resolve immediately by default; individual tests override the ones
// they care about.

function buildMockService(): jest.Mocked<StorageService> {
  return {
    initialize:           jest.fn().mockResolvedValue(undefined),
    saveProfile:          jest.fn().mockResolvedValue(undefined),
    getProfile:           jest.fn().mockResolvedValue(null),
    updateProfile:        jest.fn().mockResolvedValue(undefined),
    deleteProfile:        jest.fn().mockResolvedValue(undefined),
    savePlanComplete:     jest.fn().mockResolvedValue(undefined),
    savePlan:             jest.fn().mockResolvedValue(undefined),
    getPlan:              jest.fn().mockResolvedValue(null),
    getActivePlan:        jest.fn().mockResolvedValue(null),
    getAllPlans:           jest.fn().mockResolvedValue([]),
    updatePlan:           jest.fn().mockResolvedValue(undefined),
    deletePlan:           jest.fn().mockResolvedValue(undefined),
    saveSession:          jest.fn().mockResolvedValue(undefined),
    getSession:           jest.fn().mockResolvedValue(null),
    getSessionsByPlan:    jest.fn().mockResolvedValue([]),
    updateSession:        jest.fn().mockResolvedValue(undefined),
    deleteSession:        jest.fn().mockResolvedValue(undefined),
    saveExercise:         jest.fn().mockResolvedValue(undefined),
    getExercise:          jest.fn().mockResolvedValue(null),
    getExercisesBySession: jest.fn().mockResolvedValue([]),
    updateExercise:       jest.fn().mockResolvedValue(undefined),
    deleteExercise:       jest.fn().mockResolvedValue(undefined),
    saveFeedback:         jest.fn().mockResolvedValue(undefined),
    getFeedback:          jest.fn().mockResolvedValue(null),
    getFeedbackBySession: jest.fn().mockResolvedValue(null),
    getRecentFeedback:    jest.fn().mockResolvedValue([]),
    updateFeedback:       jest.fn().mockResolvedValue(undefined),
    deleteFeedback:       jest.fn().mockResolvedValue(undefined),
    saveContextRecord:    jest.fn().mockResolvedValue(undefined),
    getContextRecord:     jest.fn().mockResolvedValue(null),
    updateContextRecord:  jest.fn().mockResolvedValue(undefined),
    deleteContextRecord:  jest.fn().mockResolvedValue(undefined),
  };
}

// ── Shared test fixtures ───────────────────────────────────────────────────────

const FIXTURE_PROFILE: UserProfile = {
  id:               'profile-uuid',
  schemaVersion:    1,
  primaryGoal:      'strength',
  equipment:        ['Dumbbells', 'Resistance bands'],
  sessionsPerWeek:  3,
  targetDuration:   '45-60',
  fitnessLevel:     'intermediate',
  limitations:      'bad left knee',
  additionalContext: null,
  age:              null,
  biologicalSex:    null,
  weightKg:         null,
  heightCm:         null,
  targetWeightKg:   null,
  dietaryNotes:     null,
  userId:           null,
  createdAt:        '2026-01-01T00:00:00.000Z',
};

const FIXTURE_ACTIVE_PLAN: Plan = {
  id:            'plan-uuid',
  schemaVersion: 1,
  userId:        null,
  name:          'Existing Plan',
  description:   'Already in DB',
  isActive:      true,
  config: {
    defaultWorkSec:             40,
    restBetweenExSec:           15,
    stretchBetweenRoundsSec:    30,
    restBetweenRoundsSec:       60,
    warmupDelayBetweenItemsSec: 5,
    cooldownDelayBetweenItemsSec: 5,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// GeneratePlanOutput fixture used for savePlanFromDraft tests.
// Has one session with a betweenRoundExercise (phase: null) and two exercises.
const FIXTURE_GENERATE_OUTPUT: GeneratePlanOutput = {
  schemaVersion: 1,
  plan: {
    name:        'Strength Block',
    description: '4-week strength focus',
    config: {
      defaultWorkSec:             40,
      restBetweenExSec:           15,
      stretchBetweenRoundsSec:    30,
      restBetweenRoundsSec:       60,
      warmupDelayBetweenItemsSec: 5,
      cooldownDelayBetweenItemsSec: 5,
    },
  },
  sessions: [
    {
      name:                      'Session A',
      type:                      'resistance',
      orderInPlan:               1,
      rounds:                    3,
      estimatedDurationMinutes:  45,
      workSec:                   40,
      restBetweenExSec:          15,
      stretchBetweenRoundsSec:   30,
      restBetweenRoundsSec:      60,
      warmupDelayBetweenItemsSec: 5,
      cooldownDelayBetweenItemsSec: 5,
      betweenRoundExercise: {
        phase:              null,
        order:              0,
        name:               'Hip Flexor Stretch',
        type:               'timed',
        durationSec:        30,
        reps:               null,
        weight:             null,
        equipment:          'bodyweight',
        formCues:           ['Hold and breathe'],
        youtubeSearchQuery: null,
        isBilateral:        false,
      },
      exercises: [
        {
          phase:              'warmup',
          order:              1,
          name:               'Arm Circles',
          type:               'timed',
          durationSec:        30,
          reps:               null,
          weight:             null,
          equipment:          'bodyweight',
          formCues:           [],
          youtubeSearchQuery: null,
          isBilateral:        false,
        },
        {
          phase:              'main',
          order:              1,
          name:               'Push-ups',
          type:               'rep',
          durationSec:        null,
          reps:               10,
          weight:             null,
          equipment:          'bodyweight',
          formCues:           ['Keep core tight'],
          youtubeSearchQuery: 'push up form tutorial',
          isBilateral:        false,
        },
      ],
    },
  ],
};

// ── Test suites ────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

// ── initialize ────────────────────────────────────────────────────────────────

describe('initialize', () => {
  it('loads profile and activePlan into state on success', async () => {
    const mockService = buildMockService();
    mockService.getProfile.mockResolvedValue(FIXTURE_PROFILE);
    mockService.getActivePlan.mockResolvedValue(FIXTURE_ACTIVE_PLAN);

    await useAppStore.getState().initialize(mockService);

    const state = useAppStore.getState();
    expect(state.isInitializing).toBe(false);
    expect(state.initError).toBeNull();
    expect(state.profile).toEqual(FIXTURE_PROFILE);
    expect(state.activePlan).toEqual(FIXTURE_ACTIVE_PLAN);
    expect(state.storageService).toBe(mockService);
  });

  it('sets initError and clears isInitializing when storage throws', async () => {
    const mockService = buildMockService();
    mockService.initialize.mockRejectedValue(new Error('DB open failed'));

    await useAppStore.getState().initialize(mockService);

    const state = useAppStore.getState();
    expect(state.isInitializing).toBe(false);
    expect(state.initError).toBe('DB open failed');
    // Profile and plan must remain null — partial state must not be written.
    expect(state.profile).toBeNull();
    expect(state.activePlan).toBeNull();
  });
});

// ── saveProfile ───────────────────────────────────────────────────────────────

describe('saveProfile', () => {
  it('calls storageService.saveProfile and updates store state', async () => {
    const mockService = buildMockService();
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().saveProfile(FIXTURE_PROFILE);

    expect(mockService.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockService.saveProfile).toHaveBeenCalledWith(FIXTURE_PROFILE);
    expect(useAppStore.getState().profile).toEqual(FIXTURE_PROFILE);
  });

  it('throws when storageService is null', async () => {
    // storageService starts null after store reset — no injection needed.
    await expect(
      useAppStore.getState().saveProfile(FIXTURE_PROFILE),
    ).rejects.toThrow('StorageService not initialized');
  });
});

// ── savePlanFromDraft ─────────────────────────────────────────────────────────

describe('savePlanFromDraft', () => {
  // UUID call order inside savePlanFromDraft for FIXTURE_GENERATE_OUTPUT
  // (one session with betweenRoundExercise + two exercises):
  //   1st → planId
  //   2nd → sessionId
  //   3rd → betweenRoundExerciseId
  //   4th → Arm Circles exercise id
  //   5th → Push-ups exercise id

  const UUID_PLAN      = 'uuid-plan';
  const UUID_SESSION   = 'uuid-session';
  const UUID_BETWEEN   = 'uuid-between';
  const UUID_EX_WARMUP = 'uuid-ex-warmup';
  const UUID_EX_MAIN   = 'uuid-ex-main';

  function setUpUUIDs(): void {
    mockRandomUUID
      .mockReturnValueOnce(UUID_PLAN)
      .mockReturnValueOnce(UUID_SESSION)
      .mockReturnValueOnce(UUID_BETWEEN)
      .mockReturnValueOnce(UUID_EX_WARMUP)
      .mockReturnValueOnce(UUID_EX_MAIN);
  }

  it('calls savePlanComplete exactly once with correct Plan, Sessions, and Exercises', async () => {
    setUpUUIDs();
    const mockService = buildMockService();
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().savePlanFromDraft(FIXTURE_GENERATE_OUTPUT);

    expect(mockService.savePlanComplete).toHaveBeenCalledTimes(1);

    const [planArg, sessionsArg, exercisesArg] =
      mockService.savePlanComplete.mock.calls[0] as [Plan, Session[], Exercise[]];

    // ── Plan ──
    expect(planArg.id).toBe(UUID_PLAN);
    expect(planArg.schemaVersion).toBe(FIXTURE_GENERATE_OUTPUT.schemaVersion);
    expect(planArg.name).toBe(FIXTURE_GENERATE_OUTPUT.plan.name);
    expect(planArg.description).toBe(FIXTURE_GENERATE_OUTPUT.plan.description);
    expect(planArg.config).toEqual(FIXTURE_GENERATE_OUTPUT.plan.config);
    expect(planArg.isActive).toBe(true);
    expect(planArg.userId).toBeNull();
    expect(typeof planArg.createdAt).toBe('string');
    expect(typeof planArg.updatedAt).toBe('string');

    // ── Sessions ──
    expect(sessionsArg).toHaveLength(1);
    const session = sessionsArg[0];
    expect(session.id).toBe(UUID_SESSION);
    expect(session.planId).toBe(UUID_PLAN);
    expect(session.name).toBe('Session A');
    expect(session.type).toBe('resistance');
    expect(session.orderInPlan).toBe(1);
    expect(session.rounds).toBe(3);
    expect(session.estimatedDurationMinutes).toBe(45);
    expect(session.workSec).toBe(40);
    expect(session.restBetweenExSec).toBe(15);
    expect(session.stretchBetweenRoundsSec).toBe(30);
    expect(session.restBetweenRoundsSec).toBe(60);
    expect(session.warmupDelayBetweenItemsSec).toBe(5);
    expect(session.cooldownDelayBetweenItemsSec).toBe(5);
    // betweenRoundExerciseId must point at the extracted exercise row.
    expect(session.betweenRoundExerciseId).toBe(UUID_BETWEEN);

    // ── Exercises ──
    // Order: betweenRound exercise is pushed first (before the session row),
    // then the regular exercises in the order they appear in the draft.
    expect(exercisesArg).toHaveLength(3);

    const betweenEx = exercisesArg[0];
    expect(betweenEx.id).toBe(UUID_BETWEEN);
    expect(betweenEx.sessionId).toBe(UUID_SESSION);
    expect(betweenEx.phase).toBeNull();
    expect(betweenEx.name).toBe('Hip Flexor Stretch');
    expect(betweenEx.type).toBe('timed');
    expect(betweenEx.durationSec).toBe(30);
    expect(betweenEx.isBilateral).toBe(false);

    const warmupEx = exercisesArg[1];
    expect(warmupEx.id).toBe(UUID_EX_WARMUP);
    expect(warmupEx.sessionId).toBe(UUID_SESSION);
    expect(warmupEx.phase).toBe('warmup');
    expect(warmupEx.name).toBe('Arm Circles');

    const mainEx = exercisesArg[2];
    expect(mainEx.id).toBe(UUID_EX_MAIN);
    expect(mainEx.sessionId).toBe(UUID_SESSION);
    expect(mainEx.phase).toBe('main');
    expect(mainEx.name).toBe('Push-ups');
    expect(mainEx.reps).toBe(10);
    expect(mainEx.youtubeSearchQuery).toBe('push up form tutorial');
  });

  it('sets activePlan in store state after a successful save', async () => {
    setUpUUIDs();
    const mockService = buildMockService();
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().savePlanFromDraft(FIXTURE_GENERATE_OUTPUT);

    const activePlan = useAppStore.getState().activePlan;
    expect(activePlan).not.toBeNull();
    expect(activePlan!.id).toBe(UUID_PLAN);
    expect(activePlan!.name).toBe('Strength Block');
    expect(activePlan!.isActive).toBe(true);
  });

  it('throws when storageService is null', async () => {
    await expect(
      useAppStore.getState().savePlanFromDraft(FIXTURE_GENERATE_OUTPUT),
    ).rejects.toThrow('StorageService not initialized');
  });
});

// ── loadSessions ──────────────────────────────────────────────────────────────

describe('loadSessions', () => {
  const FIXTURE_SESSIONS: Session[] = [
    {
      id:                        'session-1',
      schemaVersion:             1,
      planId:                    'plan-uuid',
      name:                      'Push Day',
      type:                      'resistance',
      orderInPlan:               1,
      rounds:                    3,
      estimatedDurationMinutes:  40,
      workSec:                   40,
      restBetweenExSec:          15,
      stretchBetweenRoundsSec:   30,
      restBetweenRoundsSec:      60,
      warmupDelayBetweenItemsSec: 5,
      cooldownDelayBetweenItemsSec: 5,
      betweenRoundExerciseId:    null,
    },
  ];

  it('populates planSessions in store state', async () => {
    const mockService = buildMockService();
    mockService.getSessionsByPlan.mockResolvedValue(FIXTURE_SESSIONS);
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().loadSessions('plan-uuid');

    expect(mockService.getSessionsByPlan).toHaveBeenCalledTimes(1);
    expect(mockService.getSessionsByPlan).toHaveBeenCalledWith('plan-uuid');
    expect(useAppStore.getState().planSessions).toEqual(FIXTURE_SESSIONS);
  });

  it('throws when storageService is null', async () => {
    await expect(
      useAppStore.getState().loadSessions('plan-uuid'),
    ).rejects.toThrow('StorageService is not initialized');
  });
});

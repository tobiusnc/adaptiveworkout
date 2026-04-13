// src/store/__tests__/useAppStore.phase13.test.ts
//
// Unit tests for Phase 13 store actions: loadPlanChatData and applyModification.
//
// Strategy:
//   - StorageService is injected via useAppStore.setState({ storageService: mock }).
//   - summarizeContextRecord (AI module) is mocked at the module level so no API
//     calls are made. This is separate from useAppStore.test.ts which does not mock
//     AI modules.
//   - expo-crypto is mocked so UUID generation is deterministic.
//   - Store state is reset in beforeEach so tests are fully isolated.

import * as ExpoCrypto from 'expo-crypto';
import { useAppStore } from '../useAppStore';
import {
  summarizeContextRecord,
  SummarizeContextRecordError,
} from '../../ai/summarizeContextRecord';

import type { StorageService } from '../../storage/StorageService';
import type {
  Exercise,
  Session,
  SessionFeedback,
  PlanContextRecord,
  ModifyPlanOutput,
  ConversationMessage,
} from '../../types/index';

// ── Mock expo-crypto ───────────────────────────────────────────────────────────

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

const mockRandomUUID = jest.mocked(ExpoCrypto.randomUUID);

// ── Mock summarizeContextRecord ────────────────────────────────────────────────
// Mocked at the module level so applyModification's import receives the mock.
// jest.mock() is hoisted by Babel so the import above receives the mock module.

jest.mock('../../ai/summarizeContextRecord', () => ({
  summarizeContextRecord: jest.fn(),
  SummarizeContextRecordError: class SummarizeContextRecordError extends Error {
    constructor(message: string, causeArg?: unknown) {
      super(message);
      this.name = 'SummarizeContextRecordError';
      // Store causeArg on the instance so instanceof checks work correctly.
      Object.defineProperty(this, 'cause', { value: causeArg });
    }
  },
}));

const mockSummarize = jest.mocked(summarizeContextRecord);

// ── Store reset helpers ────────────────────────────────────────────────────────

const INITIAL_STORE_STATE = {
  storageService:   null,
  isInitializing:   true,
  initError:        null,
  profile:          null,
  activePlan:       null,
  planSessions:     [] as Session[],
  currentSession:   null,
  currentExercises: [] as Exercise[],
  pendingFeedback:  null,
};

function resetStore(): void {
  useAppStore.setState(INITIAL_STORE_STATE);
}

// ── Mock StorageService factory ────────────────────────────────────────────────

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
    getExercisesByPlan:   jest.fn().mockResolvedValue([]),
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
    deleteContextRecord:        jest.fn().mockResolvedValue(undefined),
    applyPlanModification:      jest.fn().mockResolvedValue(undefined),
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURE_CONTEXT_RECORD: PlanContextRecord = {
  id: 'ctx-uuid',
  schemaVersion: 1,
  planId: 'plan-1',
  content: 'User is making good progress.',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const FIXTURE_FEEDBACK: SessionFeedback = {
  id: 'fb-1',
  schemaVersion: 1,
  sessionId: 'sess-1',
  completedAt: '2026-01-01T00:00:00.000Z',
  isComplete: true,
  commentText: 'Felt great',
  effortRating: 4,
  hrLog: null,
};

const FIXTURE_EXERCISE: Exercise = {
  id: 'ex-1',
  schemaVersion: 1,
  sessionId: 'sess-1',
  phase: null,
  order: 1,
  name: 'Push-up',
  type: 'timed',
  durationSec: 40,
  reps: null,
  weight: null,
  equipment: 'none',
  formCues: ['Keep core tight'],
  youtubeSearchQuery: null,
  isBilateral: false,
};

function makeModifyOutput(overrides: Partial<ModifyPlanOutput> = {}): ModifyPlanOutput {
  return {
    schemaVersion: 1,
    summary: 'Adjusted plan',
    planChanges: null,
    sessionChanges: [],
    contextRecordUpdate: null,
    ...overrides,
  };
}

const FIXTURE_CONVERSATION: ConversationMessage[] = [
  { role: 'user', content: 'Make it harder' },
];

// ─────────────────────────────────────────────────────────────────────────────
// loadPlanChatData
// ─────────────────────────────────────────────────────────────────────────────

describe('loadPlanChatData', () => {
  let mockService: jest.Mocked<StorageService>;

  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
    mockService = buildMockService();
    mockRandomUUID.mockReturnValue('new-uuid' as ReturnType<typeof ExpoCrypto.randomUUID>);
  });

  // ── null guard ────────────────────────────────────────────────────────────
  it('throws when storageService is null', async () => {
    await expect(
      useAppStore.getState().loadPlanChatData('plan-1'),
    ).rejects.toThrow('StorageService not initialized');
  });

  // ── happy path ────────────────────────────────────────────────────────────
  it('fetches contextRecord, recentFeedback, and allExercises in parallel', async () => {
    mockService.getContextRecord.mockResolvedValue(FIXTURE_CONTEXT_RECORD);
    mockService.getRecentFeedback.mockResolvedValue([FIXTURE_FEEDBACK]);
    mockService.getExercisesByPlan.mockResolvedValue([FIXTURE_EXERCISE]);
    useAppStore.setState({ storageService: mockService });

    const result = await useAppStore.getState().loadPlanChatData('plan-1');

    expect(result.contextRecord).toEqual(FIXTURE_CONTEXT_RECORD);
    expect(result.recentFeedback).toEqual([FIXTURE_FEEDBACK]);
    expect(result.allExercises).toEqual([FIXTURE_EXERCISE]);
  });

  // ── calls correct planId ──────────────────────────────────────────────────
  it('passes planId to getContextRecord and getExercisesByPlan', async () => {
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().loadPlanChatData('target-plan');

    expect(mockService.getContextRecord).toHaveBeenCalledWith('target-plan');
    expect(mockService.getExercisesByPlan).toHaveBeenCalledWith('target-plan');
  });

  // ── getRecentFeedback limit ───────────────────────────────────────────────
  it('fetches the most recent 5 feedback records', async () => {
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().loadPlanChatData('plan-1');

    expect(mockService.getRecentFeedback).toHaveBeenCalledWith(5);
  });

  // ── null contextRecord ────────────────────────────────────────────────────
  it('returns null contextRecord when none exists in storage', async () => {
    mockService.getContextRecord.mockResolvedValue(null);
    useAppStore.setState({ storageService: mockService });

    const result = await useAppStore.getState().loadPlanChatData('plan-1');

    expect(result.contextRecord).toBeNull();
  });

  // ── storage failure propagates ────────────────────────────────────────────
  it('propagates rejection if one of the parallel calls fails', async () => {
    mockService.getExercisesByPlan.mockRejectedValue(new Error('DB error'));
    useAppStore.setState({ storageService: mockService });

    await expect(
      useAppStore.getState().loadPlanChatData('plan-1'),
    ).rejects.toThrow('DB error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyModification
// ─────────────────────────────────────────────────────────────────────────────

describe('applyModification', () => {
  let mockService: jest.Mocked<StorageService>;

  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
    mockService = buildMockService();
    mockRandomUUID.mockReturnValue('new-uuid' as ReturnType<typeof ExpoCrypto.randomUUID>);
    mockSummarize.mockResolvedValue({
      schemaVersion: 1,
      content: 'Condensed context record.',
    });
  });

  // ── null guard ────────────────────────────────────────────────────────────
  it('throws when storageService is null', async () => {
    await expect(
      useAppStore.getState().applyModification('plan-1', makeModifyOutput(), FIXTURE_CONVERSATION),
    ).rejects.toThrow('StorageService not initialized');
  });

  // ── always calls applyPlanModification ───────────────────────────────────
  it('always calls applyPlanModification with planId and output', async () => {
    const output = makeModifyOutput();
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockService.applyPlanModification).toHaveBeenCalledWith('plan-1', output);
  });

  // ── null contextRecordUpdate — skips summarize ────────────────────────────
  it('skips summarizeContextRecord when contextRecordUpdate is null', async () => {
    const output = makeModifyOutput({ contextRecordUpdate: null });
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockSummarize).not.toHaveBeenCalled();
  });

  // ── short contextRecordUpdate (≤3000) — skips summarize ──────────────────
  it('skips summarizeContextRecord when contextRecordUpdate is ≤3000 chars', async () => {
    const output = makeModifyOutput({ contextRecordUpdate: 'x'.repeat(3000) });
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockSummarize).not.toHaveBeenCalled();
  });

  // ── long contextRecordUpdate (>3000) — calls summarize ───────────────────
  it('calls summarizeContextRecord when contextRecordUpdate exceeds 3000 chars', async () => {
    const longText = 'x'.repeat(3001);
    const output = makeModifyOutput({ contextRecordUpdate: longText });
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockSummarize).toHaveBeenCalledTimes(1);
    expect(mockSummarize).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: 1,
        currentRecord: expect.objectContaining({
          planId: 'plan-1',
          content: longText,
        }),
        conversation: FIXTURE_CONVERSATION,
      }),
    );
  });

  // ── long update, existing record — calls updateContextRecord ─────────────
  it('updates existing context record when one is found', async () => {
    mockService.getContextRecord.mockResolvedValue(FIXTURE_CONTEXT_RECORD);
    const output = makeModifyOutput({ contextRecordUpdate: 'y'.repeat(3001) });
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockService.updateContextRecord).toHaveBeenCalledTimes(1);
    expect(mockService.updateContextRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: FIXTURE_CONTEXT_RECORD.id,
        content: 'Condensed context record.',
      }),
    );
    expect(mockService.saveContextRecord).not.toHaveBeenCalled();
  });

  // ── long update, no existing record — calls saveContextRecord ────────────
  it('saves a new context record when none exists', async () => {
    mockService.getContextRecord.mockResolvedValue(null);
    mockRandomUUID.mockReturnValue('ctx-new-uuid' as ReturnType<typeof ExpoCrypto.randomUUID>);
    const output = makeModifyOutput({ contextRecordUpdate: 'z'.repeat(3001) });
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockService.saveContextRecord).toHaveBeenCalledTimes(1);
    expect(mockService.saveContextRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ctx-new-uuid',
        planId: 'plan-1',
        content: 'Condensed context record.',
      }),
    );
    expect(mockService.updateContextRecord).not.toHaveBeenCalled();
  });

  // ── SummarizeContextRecordError — non-blocking ────────────────────────────
  it('swallows SummarizeContextRecordError and still calls loadSessions', async () => {
    mockSummarize.mockRejectedValue(
      new SummarizeContextRecordError('AI failure'),
    );
    const output = makeModifyOutput({ contextRecordUpdate: 'w'.repeat(3001) });
    useAppStore.setState({ storageService: mockService });

    // Should NOT throw
    await expect(
      useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION),
    ).resolves.toBeUndefined();

    // loadSessions calls getSessionsByPlan internally
    expect(mockService.getSessionsByPlan).toHaveBeenCalledWith('plan-1');
  });

  // ── other error from summarize — re-thrown ────────────────────────────────
  it('re-throws non-SummarizeContextRecordError errors from summarize', async () => {
    mockSummarize.mockRejectedValue(new Error('unexpected failure'));
    const output = makeModifyOutput({ contextRecordUpdate: 'v'.repeat(3001) });
    useAppStore.setState({ storageService: mockService });

    await expect(
      useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION),
    ).rejects.toThrow('unexpected failure');
  });

  // ── always calls loadSessions ─────────────────────────────────────────────
  it('calls loadSessions after the modification regardless of contextRecordUpdate', async () => {
    const output = makeModifyOutput({ contextRecordUpdate: null });
    useAppStore.setState({ storageService: mockService });

    await useAppStore.getState().applyModification('plan-1', output, FIXTURE_CONVERSATION);

    expect(mockService.getSessionsByPlan).toHaveBeenCalledWith('plan-1');
  });
});

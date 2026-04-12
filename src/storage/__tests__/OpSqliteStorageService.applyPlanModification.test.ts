// src/storage/__tests__/OpSqliteStorageService.applyPlanModification.test.ts
//
// Unit tests for OpSqliteStorageService.applyPlanModification.
//
// Strategy:
//   - @op-engineering/op-sqlite, expo-secure-store, and expo-crypto are mocked
//     at the module level so no native runtime is needed.
//   - The private `db` field is set directly via `(service as any).db = mockDb`
//     to bypass `initialize()` and focus tests on the method's own logic.
//   - mockDb.execute is a jest.fn() that defaults to resolving with { rows: [] }.
//     Individual tests override return values for SELECT queries (e.g., context
//     record existence check).
//   - Tests verify: BEGIN/COMMIT, ROLLBACK on failure, StorageError propagation,
//     session action branches (add/update/remove), and context record upsert logic.

import { OpSqliteStorageService } from '../OpSqliteStorageService';
import { StorageError } from '../StorageError';
import type { ModifyPlanOutput, PlanConfig } from '../../types/index';

// ── Mock native modules ───────────────────────────────────────────────────────

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() },
}));

// ── Mock DB factory ───────────────────────────────────────────────────────────

function buildMockDb() {
  return {
    execute: jest.fn().mockResolvedValue({ rows: [] }),
  };
}

// ── Minimal valid ModifyPlanOutput fixtures ───────────────────────────────────

function makeOutput(overrides: Partial<ModifyPlanOutput> = {}): ModifyPlanOutput {
  return {
    schemaVersion: 1,
    summary: 'Test modification',
    planChanges: null,
    sessionChanges: [],
    contextRecordUpdate: null,
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const PLAN_ID = 'plan-1';

let service: OpSqliteStorageService;
let mockDb: ReturnType<typeof buildMockDb>;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb = buildMockDb();
  service = new OpSqliteStorageService();
  // Bypass initialize() by injecting the mock DB directly into the private field.
  (service as unknown as Record<string, unknown>).db = mockDb;
});

// ── Transaction framing ───────────────────────────────────────────────────────

describe('applyPlanModification — transaction framing', () => {
  it('executes BEGIN and COMMIT on a successful no-op modification', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput());

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls[0]).toBe('BEGIN');
    expect(calls[calls.length - 1]).toBe('COMMIT');
  });

  it('executes ROLLBACK and throws StorageError when a DB execute rejects', async () => {
    const dbError = new Error('Disk full');
    // Fail on the second execute call (after BEGIN).
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // BEGIN succeeds
      .mockRejectedValueOnce(dbError);    // next execute fails

    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      planChanges: { name: 'New Name' }, // triggers a plan UPDATE call
    }))).rejects.toThrow(StorageError);

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('ROLLBACK');
  });

  it('StorageError has tag QUERY_FAILED on transaction failure', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('DB error'));

    let caught: unknown;
    try {
      await service.applyPlanModification(PLAN_ID, makeOutput({ planChanges: { name: 'X' } }));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(StorageError);
    expect((caught as StorageError).tag).toBe('QUERY_FAILED');
  });
});

// ── Plan changes ──────────────────────────────────────────────────────────────

describe('applyPlanModification — planChanges', () => {
  it('skips all plan UPDATE queries when planChanges is null', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({ planChanges: null }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    const planUpdates = calls.filter((q) => q.startsWith('UPDATE plan'));
    expect(planUpdates).toHaveLength(0);
  });

  it('executes UPDATE plan SET name when planChanges.name is provided', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({ planChanges: { name: 'New Name' } }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('UPDATE plan SET name'))).toBe(true);
  });

  it('executes UPDATE plan SET description when planChanges.description is provided', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({ planChanges: { description: 'New desc' } }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('UPDATE plan SET description'))).toBe(true);
  });

  it('executes UPDATE plan for each config field present in planChanges.config', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      planChanges: { config: { defaultWorkSec: 50, restBetweenExSec: 20 } as PlanConfig },
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('default_work_sec'))).toBe(true);
    expect(calls.some((q) => q.includes('rest_between_ex_sec'))).toBe(true);
  });

  it('skips config fields that are absent from planChanges.config', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      planChanges: { config: { defaultWorkSec: 50 } as PlanConfig }, // only one field
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    // rest_between_ex_sec should NOT be updated
    expect(calls.some((q) => q.includes('rest_between_ex_sec'))).toBe(false);
  });
});

// ── Session changes — remove ──────────────────────────────────────────────────

describe('applyPlanModification — session remove', () => {
  it('executes DELETE for exercises and session when action=remove', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'remove',
        sessionDraft: null,
        exerciseChanges: [],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('DELETE FROM exercise WHERE session_id=?'))).toBe(true);
    expect(calls.some((q) => q.includes('DELETE FROM session WHERE id=?'))).toBe(true);
  });

  it('throws StorageError (triggering ROLLBACK) when action=remove with null sessionId', async () => {
    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: null,
        action: 'remove',
        sessionDraft: null,
        exerciseChanges: [],
      }],
    }))).rejects.toThrow(StorageError);

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('ROLLBACK');
  });
});

// ── Session changes — add ─────────────────────────────────────────────────────

describe('applyPlanModification — session add', () => {
  it('executes INSERT session when action=add', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: null,
        action: 'add',
        sessionDraft: {
          name: 'New Session',
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
        },
        exerciseChanges: [],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('INSERT INTO session'))).toBe(true);
  });

  it('executes INSERT exercise for each add exerciseChange within a new session', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: null,
        action: 'add',
        sessionDraft: { name: 'Session A' },
        exerciseChanges: [{
          exerciseId: null,
          action: 'add',
          exerciseDraft: {
            name: 'Push-up',
            phase: 'main',
            order: 1,
            type: 'rep',
            durationSec: null,
            reps: 10,
            weight: null,
            equipment: 'bodyweight',
            formCues: ['keep core tight'],
            youtubeSearchQuery: null,
            isBilateral: false,
          },
        }],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('INSERT INTO exercise'))).toBe(true);
  });

  it('throws StorageError (triggering ROLLBACK) when action=add with null sessionDraft', async () => {
    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: null,
        action: 'add',
        sessionDraft: null,
        exerciseChanges: [],
      }],
    }))).rejects.toThrow(StorageError);

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('ROLLBACK');
  });
});

// ── Session changes — update ──────────────────────────────────────────────────

describe('applyPlanModification — session update', () => {
  it('executes UPDATE session fields when action=update with a sessionDraft', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: { name: 'Updated Name', rounds: 4 },
        exerciseChanges: [],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('UPDATE session SET name=?'))).toBe(true);
    expect(calls.some((q) => q.includes('UPDATE session SET rounds=?'))).toBe(true);
  });

  it('throws StorageError (triggering ROLLBACK) when action=update with null sessionId', async () => {
    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: null,
        action: 'update',
        sessionDraft: { name: 'X' },
        exerciseChanges: [],
      }],
    }))).rejects.toThrow(StorageError);

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('ROLLBACK');
  });
});

// ── Exercise changes ──────────────────────────────────────────────────────────

describe('applyPlanModification — exercise changes within session update', () => {
  it('executes DELETE exercise when exerciseChange action=remove', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: null,
        exerciseChanges: [{
          exerciseId: 'ex-1',
          action: 'remove',
          exerciseDraft: null,
        }],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('DELETE FROM exercise WHERE id=?'))).toBe(true);
  });

  it('throws StorageError when exercise action=remove with null exerciseId', async () => {
    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: null,
        exerciseChanges: [{
          exerciseId: null,
          action: 'remove',
          exerciseDraft: null,
        }],
      }],
    }))).rejects.toThrow(StorageError);
  });

  it('executes INSERT exercise when exerciseChange action=add', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: null,
        exerciseChanges: [{
          exerciseId: null,
          action: 'add',
          exerciseDraft: {
            name: 'Squat',
            phase: 'main',
            order: 2,
            type: 'rep',
            durationSec: null,
            reps: 12,
            weight: null,
            equipment: 'bodyweight',
            formCues: [],
            youtubeSearchQuery: null,
            isBilateral: false,
          },
        }],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('INSERT INTO exercise'))).toBe(true);
  });

  it('throws StorageError when exercise action=add with null exerciseDraft', async () => {
    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: null,
        exerciseChanges: [{
          exerciseId: null,
          action: 'add',
          exerciseDraft: null,
        }],
      }],
    }))).rejects.toThrow(StorageError);
  });

  it('executes UPDATE exercise fields when exerciseChange action=update', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: null,
        exerciseChanges: [{
          exerciseId: 'ex-2',
          action: 'update',
          exerciseDraft: { name: 'Lunge', reps: 15 },
        }],
      }],
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('UPDATE exercise SET name=?'))).toBe(true);
    expect(calls.some((q) => q.includes('UPDATE exercise SET reps=?'))).toBe(true);
  });

  it('throws StorageError when exercise action=update with null exerciseId', async () => {
    await expect(service.applyPlanModification(PLAN_ID, makeOutput({
      sessionChanges: [{
        sessionId: 'sess-1',
        action: 'update',
        sessionDraft: null,
        exerciseChanges: [{
          exerciseId: null,
          action: 'update',
          exerciseDraft: { name: 'X' },
        }],
      }],
    }))).rejects.toThrow(StorageError);
  });
});

// ── Context record upsert ─────────────────────────────────────────────────────

describe('applyPlanModification — context record upsert', () => {
  it('skips context record queries when contextRecordUpdate is null', async () => {
    await service.applyPlanModification(PLAN_ID, makeOutput({ contextRecordUpdate: null }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('plan_context_record'))).toBe(false);
  });

  it('executes UPDATE plan_context_record when a row already exists for the plan', async () => {
    // SELECT returns an existing row.
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })                          // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'cr-existing' }] })    // SELECT
      .mockResolvedValueOnce({ rows: [] });                         // UPDATE + COMMIT

    await service.applyPlanModification(PLAN_ID, makeOutput({
      contextRecordUpdate: 'Updated context content.',
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('UPDATE plan_context_record'))).toBe(true);
    expect(calls.some((q) => q.includes('INSERT INTO plan_context_record'))).toBe(false);
  });

  it('executes INSERT plan_context_record when no row exists for the plan', async () => {
    // Default mockDb.execute returns { rows: [] } — no existing row.
    await service.applyPlanModification(PLAN_ID, makeOutput({
      contextRecordUpdate: 'New context content.',
    }));

    const calls = mockDb.execute.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((q) => q.includes('INSERT INTO plan_context_record'))).toBe(true);
    expect(calls.some((q) => q.includes('UPDATE plan_context_record'))).toBe(false);
  });
});

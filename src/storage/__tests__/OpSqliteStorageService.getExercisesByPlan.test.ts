// src/storage/__tests__/OpSqliteStorageService.getExercisesByPlan.test.ts
//
// Unit tests for OpSqliteStorageService.getExercisesByPlan.
//
// Strategy:
//   - Native modules are mocked at the module level so no device runtime is needed.
//   - The private `db` field is injected via `(service as any).db = mockDb` to bypass
//     initialize() and focus on the method's own logic.
//   - mockDb.execute defaults to resolving with { rows: [] }; individual tests supply
//     real ExerciseRow-shaped objects to exercise the rowToExercise mapper.

import { OpSqliteStorageService } from '../OpSqliteStorageService';

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

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeExerciseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ex-1',
    schema_version: 1,
    session_id: 'sess-1',
    phase: null,
    order_num: 1,
    name: 'Push-up',
    type: 'work',
    duration_sec: 40,
    reps: null,
    weight: null,
    equipment: 'none',
    form_cues: JSON.stringify(['Keep core tight']),
    youtube_search_query: null,
    is_bilateral: 0,
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let service: OpSqliteStorageService;
let mockDb: ReturnType<typeof buildMockDb>;

beforeEach(() => {
  service = new OpSqliteStorageService();
  mockDb = buildMockDb();
  (service as unknown as Record<string, unknown>).db = mockDb;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getExercisesByPlan', () => {
  // ── happy path — returns mapped exercises ──────────────────────────────────
  it('returns mapped Exercise[] when rows are present', async () => {
    const row1 = makeExerciseRow({ id: 'ex-1', order_num: 1 });
    const row2 = makeExerciseRow({ id: 'ex-2', order_num: 2, name: 'Squat', is_bilateral: 1 });
    mockDb.execute.mockResolvedValueOnce({ rows: [row1, row2] });

    const result = await service.getExercisesByPlan('plan-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('ex-1');
    expect(result[0].isBilateral).toBe(false);
    expect(result[1].id).toBe('ex-2');
    expect(result[1].isBilateral).toBe(true);
    expect(result[1].name).toBe('Squat');
  });

  // ── happy path — parses formCues JSON ─────────────────────────────────────
  it('parses formCues JSON array correctly', async () => {
    const cues = ['Engage core', 'Keep back straight'];
    const row = makeExerciseRow({ form_cues: JSON.stringify(cues) });
    mockDb.execute.mockResolvedValueOnce({ rows: [row] });

    const result = await service.getExercisesByPlan('plan-1');

    expect(result[0].formCues).toEqual(cues);
  });

  // ── empty result — returns [] ──────────────────────────────────────────────
  it('returns empty array when no exercises exist for the plan', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await service.getExercisesByPlan('plan-no-exercises');

    expect(result).toEqual([]);
  });

  // ── empty result — handles null rows ──────────────────────────────────────
  it('returns empty array when result.rows is null/undefined', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: null });

    const result = await service.getExercisesByPlan('plan-null-rows');

    expect(result).toEqual([]);
  });

  // ── passes planId as query parameter ──────────────────────────────────────
  it('passes planId as the SQL parameter', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    await service.getExercisesByPlan('target-plan-id');

    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('plan_id = ?'),
      ['target-plan-id'],
    );
  });

  // ── db not initialized — assertDb throws StorageError ────────────────────
  it('throws StorageError when db is not initialized', async () => {
    (service as unknown as Record<string, unknown>).db = null;

    await expect(service.getExercisesByPlan('plan-1')).rejects.toMatchObject({
      name: 'StorageError',
      tag: 'DB_INIT_FAILED',
    });
  });

  // ── generic DB error — wrapped in StorageError QUERY_FAILED ───────────────
  it('wraps a generic DB error in StorageError with QUERY_FAILED code', async () => {
    const dbError = new Error('connection lost');
    mockDb.execute.mockRejectedValueOnce(dbError);

    await expect(service.getExercisesByPlan('plan-1')).rejects.toMatchObject({
      name: 'StorageError',
      tag: 'QUERY_FAILED',
      message: expect.stringContaining('plan-1'),
    });
  });

  // ── StorageError from rowToExercise — re-thrown as-is ────────────────────
  it('re-throws a StorageError from the row mapper without wrapping', async () => {
    // Corrupt form_cues so rowToExercise throws StorageError(PARSE_FAILED)
    const badRow = makeExerciseRow({ form_cues: 'not-json' });
    mockDb.execute.mockResolvedValueOnce({ rows: [badRow] });

    await expect(service.getExercisesByPlan('plan-1')).rejects.toMatchObject({
      name: 'StorageError',
      tag: 'PARSE_FAILED',
    });
  });
});

// src/session/__tests__/interruptedSessionStore.test.ts
//
// Unit tests for interruptedSessionStore.ts.
//
// Strategy:
//   - saveInterruptedSession, getInterruptedSession, and clearInterruptedSession
//     are thin wrappers around expo-secure-store, but getInterruptedSession has
//     meaningful branching: null key, valid JSON, malformed JSON, and missing
//     required fields.
//   - expo-secure-store is mocked at the module level — no real Keychain/Keystore
//     calls are made in the test environment.

import * as SecureStore from 'expo-secure-store';

import {
  saveInterruptedSession,
  getInterruptedSession,
  clearInterruptedSession,
  __testExports,
  type InterruptedSessionState,
} from '../interruptedSessionStore';

jest.mock('expo-secure-store', () => ({
  setItemAsync:    jest.fn(),
  getItemAsync:    jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSet    = SecureStore.setItemAsync    as jest.MockedFunction<typeof SecureStore.setItemAsync>;
const mockGet    = SecureStore.getItemAsync    as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockDelete = SecureStore.deleteItemAsync as jest.MockedFunction<typeof SecureStore.deleteItemAsync>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_STATE: InterruptedSessionState = {
  sessionId:      'sess-abc',
  stepIndex:      3,
  secondsLeft:    25,
  execState:      'RUNNING',
  backgroundedAt: 1712800000000,
};

const { STORE_KEY } = __testExports;

// ── __testExports ─────────────────────────────────────────────────────────────

describe('__testExports', () => {
  it('exposes the storage key string', () => {
    expect(typeof STORE_KEY).toBe('string');
    expect(STORE_KEY.length).toBeGreaterThan(0);
  });
});

// ── saveInterruptedSession ────────────────────────────────────────────────────

describe('saveInterruptedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
  });

  it('serializes state to JSON and calls setItemAsync with the correct key', async () => {
    await saveInterruptedSession(VALID_STATE);

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(STORE_KEY, JSON.stringify(VALID_STATE));
  });

  it('propagates rejection from setItemAsync', async () => {
    mockSet.mockRejectedValueOnce(new Error('Keychain unavailable'));

    await expect(saveInterruptedSession(VALID_STATE)).rejects.toThrow('Keychain unavailable');
  });
});

// ── getInterruptedSession ─────────────────────────────────────────────────────

describe('getInterruptedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when SecureStore returns null (no entry saved)', async () => {
    mockGet.mockResolvedValueOnce(null);

    const result = await getInterruptedSession();

    expect(result).toBeNull();
  });

  it('returns the parsed state when SecureStore contains valid JSON', async () => {
    mockGet.mockResolvedValueOnce(JSON.stringify(VALID_STATE));

    const result = await getInterruptedSession();

    expect(result).toEqual(VALID_STATE);
  });

  it('returns null when the stored string is malformed JSON', async () => {
    mockGet.mockResolvedValueOnce('not valid json {{{');

    const result = await getInterruptedSession();

    expect(result).toBeNull();
  });

  it('returns null when JSON is valid but missing required fields', async () => {
    // An older schema version that is missing backgroundedAt.
    const incomplete = { sessionId: 'x', stepIndex: 0, secondsLeft: 10, execState: 'RUNNING' };
    mockGet.mockResolvedValueOnce(JSON.stringify(incomplete));

    const result = await getInterruptedSession();

    expect(result).toBeNull();
  });

  it('returns null when JSON parses to a non-object (e.g. a number)', async () => {
    mockGet.mockResolvedValueOnce('42');

    const result = await getInterruptedSession();

    expect(result).toBeNull();
  });

  it('calls getItemAsync with the correct key', async () => {
    mockGet.mockResolvedValueOnce(null);

    await getInterruptedSession();

    expect(mockGet).toHaveBeenCalledWith(STORE_KEY);
  });
});

// ── clearInterruptedSession ───────────────────────────────────────────────────

describe('clearInterruptedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);
  });

  it('calls deleteItemAsync with the correct key', async () => {
    await clearInterruptedSession();

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(STORE_KEY);
  });

  it('propagates rejection from deleteItemAsync', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Delete failed'));

    await expect(clearInterruptedSession()).rejects.toThrow('Delete failed');
  });
});

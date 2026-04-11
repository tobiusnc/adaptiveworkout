// src/session/__tests__/ExerciseDetailSheet.test.ts
//
// Unit tests for ExerciseDetailSheet pure helper functions.
//
// Strategy:
//   - formatSeconds and openYouTubeSearch are exported minimal additions.
//   - @gorhom/bottom-sheet is mocked at the module level to avoid native
//     module resolution errors in the Jest/Node environment.
//   - react-native Linking is mocked to control canOpenURL / openURL behaviour.
//   - The React component itself is not rendered.

import { Linking } from 'react-native';
import { formatSeconds, openYouTubeSearch } from '../ExerciseDetailSheet';

// ── Mock @gorhom/bottom-sheet ─────────────────────────────────────────────────
// The module is imported by ExerciseDetailSheet.tsx at the top level.
// Provide a minimal stub so the import resolves without a native runtime.

jest.mock('@gorhom/bottom-sheet', () => ({
  __esModule: true,
  default: jest.fn(),
  BottomSheetView: jest.fn(),
}));

// ── Spy on react-native Linking ───────────────────────────────────────────────
// jest-expo already mocks react-native. We spy on Linking methods here so we
// can control return values per test without re-mocking the entire module
// (which would call requireActual and trigger native TurboModule resolution).

let mockCanOpenURL: jest.SpyInstance;
let mockOpenURL: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockCanOpenURL = jest.spyOn(Linking, 'canOpenURL');
  mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── formatSeconds ─────────────────────────────────────────────────────────────

describe('formatSeconds', () => {
  it('returns "0s" for zero seconds', () => {
    expect(formatSeconds(0)).toBe('0s');
  });

  it('returns "<N>s" for values under 60 seconds', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(59)).toBe('59s');
  });

  it('returns "1:00" for exactly 60 seconds', () => {
    expect(formatSeconds(60)).toBe('1:00');
  });

  it('returns "M:SS" with zero-padded seconds for values over 60', () => {
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(125)).toBe('2:05');
  });

  it('returns "M:00" when the seconds remainder is zero', () => {
    expect(formatSeconds(120)).toBe('2:00');
  });
});

// ── openYouTubeSearch ─────────────────────────────────────────────────────────

describe('openYouTubeSearch', () => {
  it('opens the youtube:// URL when the YouTube app is available', async () => {
    mockCanOpenURL.mockResolvedValueOnce(true);

    await openYouTubeSearch('push up form');

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    const calledUrl = mockOpenURL.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^youtube:\/\//);
    expect(calledUrl).toContain(encodeURIComponent('push up form'));
  });

  it('falls back to the https:// URL when the YouTube app is not installed', async () => {
    mockCanOpenURL.mockResolvedValueOnce(false);

    await openYouTubeSearch('squat technique');

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    const calledUrl = mockOpenURL.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^https:\/\//);
    expect(calledUrl).toContain(encodeURIComponent('squat technique'));
  });

  it('falls back to the https:// URL when canOpenURL throws', async () => {
    mockCanOpenURL.mockRejectedValueOnce(new Error('Permission denied'));

    await openYouTubeSearch('deadlift guide');

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    const calledUrl = mockOpenURL.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^https:\/\//);
  });

  it('encodes special characters in the search query', async () => {
    mockCanOpenURL.mockResolvedValueOnce(false);

    await openYouTubeSearch('bench press & form');

    const calledUrl = mockOpenURL.mock.calls[0][0] as string;
    // The '&' character must be percent-encoded so it is not interpreted as a
    // URL parameter separator.
    expect(calledUrl).not.toContain(' ');
    expect(calledUrl).toContain('%26');
  });
});

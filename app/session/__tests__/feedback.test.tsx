// app/session/__tests__/feedback.test.tsx
//
// Component tests for FeedbackScreen (app/session/feedback.tsx).
//
// Strategy:
//   - expo-router is mocked to capture router.replace calls.
//   - useAppStore is mocked with a selector-compatible implementation so each
//     test controls pendingFeedback, saveFeedback, and setPendingFeedback.
//   - Tests cover: null-guard redirect, Save & Done flow, Skip flow, and the
//     disabled-while-saving protection.
//   - No real storage or network calls are made.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FeedbackScreen from '../feedback';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../../src/store/useAppStore';

// ── Mocks ──────────────────────────────────────────────────────────────────────
// jest.mock is hoisted by babel to before the imports at runtime, so the named
// imports above receive the mocked modules even though the calls appear here.

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../src/store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

// ── Mock helpers ───────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockDismissAll = jest.fn();

type PendingFeedback = { sessionId: string; isComplete: boolean } | null;

interface MockConfig {
  pendingFeedback?: PendingFeedback;
  saveFeedback?: jest.Mock;
  setPendingFeedback?: jest.Mock;
}

function configureMocks(config: MockConfig = {}): {
  saveFeedback: jest.Mock;
  setPendingFeedback: jest.Mock;
} {
  const saveFeedback       = config.saveFeedback       ?? jest.fn().mockResolvedValue(undefined);
  const setPendingFeedback = config.setPendingFeedback ?? jest.fn();
  const pendingFeedback    = config.pendingFeedback !== undefined
    ? config.pendingFeedback
    : { sessionId: 'session-test-001', isComplete: true };

  (useRouter as unknown as jest.Mock).mockReturnValue({ replace: mockReplace, dismissAll: mockDismissAll });

  const storeState = { pendingFeedback, saveFeedback, setPendingFeedback };
  (useAppStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof storeState) => unknown) => selector(storeState),
  );

  return { saveFeedback, setPendingFeedback };
}

beforeEach(() => {
  jest.clearAllMocks();
  configureMocks();
});

// ── Test suites ────────────────────────────────────────────────────────────────

describe('FeedbackScreen — null-guard redirect', () => {
  it('calls router.replace("/") when pendingFeedback is null', async () => {
    configureMocks({ pendingFeedback: null });

    render(<FeedbackScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('does not redirect when pendingFeedback is set', () => {
    configureMocks({ pendingFeedback: { sessionId: 'session-abc', isComplete: true } });

    render(<FeedbackScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('FeedbackScreen — Save & Done', () => {
  it('calls saveFeedback with trimmed comment text and navigates home on success', async () => {
    const { saveFeedback } = configureMocks();

    const { getByPlaceholderText, getByText } = render(<FeedbackScreen />);

    fireEvent.changeText(
      getByPlaceholderText('How did it feel? Anything to change?'),
      '  Great session!  ',
    );
    fireEvent.press(getByText('Save & Done'));

    await waitFor(() => {
      expect(saveFeedback).toHaveBeenCalledTimes(1);
      expect(saveFeedback).toHaveBeenCalledWith('Great session!');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('calls saveFeedback with null when comment is blank', async () => {
    const { saveFeedback } = configureMocks();

    const { getByText } = render(<FeedbackScreen />);

    // Leave input empty — default commentText is ''.
    fireEvent.press(getByText('Save & Done'));

    await waitFor(() => {
      expect(saveFeedback).toHaveBeenCalledWith(null);
    });
  });

  it('shows an inline error and does not navigate when saveFeedback throws', async () => {
    const failingSave = jest.fn().mockRejectedValue(new Error('DB write failed'));
    configureMocks({ saveFeedback: failingSave });

    const { getByText } = render(<FeedbackScreen />);

    fireEvent.press(getByText('Save & Done'));

    await waitFor(() => {
      expect(getByText('DB write failed')).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('FeedbackScreen — Skip', () => {
  it('calls setPendingFeedback(null) and navigates home', () => {
    const { setPendingFeedback } = configureMocks();

    const { getByText } = render(<FeedbackScreen />);

    fireEvent.press(getByText('Skip'));

    expect(setPendingFeedback).toHaveBeenCalledWith(null);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('FeedbackScreen — disabled while saving', () => {
  it('hides Save & Done text and shows spinner while save is in progress', async () => {
    let resolvePromise!: () => void;
    const slowSave = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePromise = resolve;
      }),
    );
    configureMocks({ saveFeedback: slowSave });

    const { getByText, queryByText } = render(<FeedbackScreen />);

    fireEvent.press(getByText('Save & Done'));

    // After press, isSaving becomes true — the button text is replaced by a spinner.
    await waitFor(() => {
      expect(queryByText('Save & Done')).toBeNull();
    });

    // Clean up: resolve the promise to avoid open handles.
    resolvePromise();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});

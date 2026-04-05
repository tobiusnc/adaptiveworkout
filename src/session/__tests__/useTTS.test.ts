// src/session/__tests__/useTTS.test.ts
//
// Behavioral unit tests for the useTTS hook.
//
// Strategy:
//   - expo-speech and expo-audio are mocked at the jest.mock level so no
//     native runtime is required. Tests pass fully offline.
//   - renderHook (from @testing-library/react-native) is used because useTTS
//     contains useEffect and useCallback — plain function calls would not
//     trigger React lifecycle events.
//   - Every test is fully isolated: mocks are cleared in beforeEach and no
//     shared mutable state exists between tests.
//   - AI / network calls: not applicable — this hook has no AI or network calls.

import { renderHook, act } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

import { useTTS } from '../useTTS';
import type { ExecutionStep } from '../buildStepSequence';

// ── Mock expo-speech ───────────────────────────────────────────────────────────
// Speech.speak is fire-and-forget (void return).
// Speech.stop returns a Promise per the expo-speech API contract.

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop:  jest.fn().mockResolvedValue(undefined),
}));

// ── Mock expo-audio ────────────────────────────────────────────────────────────
// setAudioModeAsync is a named export; mock it as a resolved Promise so the
// useEffect setup/teardown does not throw in test environment.

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── Typed mock references ─────────────────────────────────────────────────────

const mockSpeak          = jest.mocked(Speech.speak);
const mockStop           = jest.mocked(Speech.stop);
const mockSetAudioMode   = jest.mocked(setAudioModeAsync);

// ── Step builder helpers ───────────────────────────────────────────────────────
// Builds minimal ExecutionStep objects. Only the fields that useTTS reads are
// populated; remaining fields carry safe defaults.

function makeStep(
  overrides: Partial<ExecutionStep> & Pick<ExecutionStep, 'stepKind' | 'label'>,
): ExecutionStep {
  return {
    key:        'test-key',
    phaseLabel: 'Test Phase',
    side:       null,
    durationSec: null,
    reps:       null,
    exercise:   null,
    ...overrides,
  };
}

// ── Shared test reset ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Audio session setup ────────────────────────────────────────────────────────

describe('audio session setup', () => {
  it('calls setAudioModeAsync with duckOthers on mount', () => {
    renderHook(() => useTTS());

    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'duckOthers' }),
    );
  });

  it('calls setAudioModeAsync with playsInSilentMode: true on mount', () => {
    renderHook(() => useTTS());

    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: true }),
    );
  });
});

// ── Audio session teardown ─────────────────────────────────────────────────────

describe('audio session teardown', () => {
  it('calls setAudioModeAsync with mixWithOthers on unmount', () => {
    const { unmount } = renderHook(() => useTTS());

    // Clear the mount call so we only observe the unmount call.
    mockSetAudioMode.mockClear();

    unmount();

    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'mixWithOthers' }),
    );
  });

  it('calls setAudioModeAsync with playsInSilentMode: false on unmount', () => {
    const { unmount } = renderHook(() => useTTS());
    mockSetAudioMode.mockClear();
    unmount();

    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false }),
    );
  });
});

// ── stopSpeech ─────────────────────────────────────────────────────────────────

describe('stopSpeech', () => {
  it('calls Speech.stop()', () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.stopSpeech();
    });

    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});

// ── announceDone ───────────────────────────────────────────────────────────────

describe('announceDone', () => {
  it('speaks "Session complete"', () => {
    const { result } = renderHook(() => useTTS());

    act(() => {
      result.current.announceDone();
    });

    expect(mockSpeak).toHaveBeenCalledWith('Session complete');
  });
});

// ── announceCountdown ──────────────────────────────────────────────────────────

describe('announceCountdown', () => {
  it('speaks "3" when secondsLeft is 3', () => {
    const { result } = renderHook(() => useTTS());

    act(() => { result.current.announceCountdown(3); });

    expect(mockSpeak).toHaveBeenCalledWith('3');
  });

  it('speaks "2" when secondsLeft is 2', () => {
    const { result } = renderHook(() => useTTS());

    act(() => { result.current.announceCountdown(2); });

    expect(mockSpeak).toHaveBeenCalledWith('2');
  });

  it('speaks "1" when secondsLeft is 1', () => {
    const { result } = renderHook(() => useTTS());

    act(() => { result.current.announceCountdown(1); });

    expect(mockSpeak).toHaveBeenCalledWith('1');
  });

  it('does NOT speak when secondsLeft is 0', () => {
    const { result } = renderHook(() => useTTS());

    act(() => { result.current.announceCountdown(0); });

    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does NOT speak when secondsLeft is 4', () => {
    const { result } = renderHook(() => useTTS());

    act(() => { result.current.announceCountdown(4); });

    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does NOT speak when secondsLeft is 10', () => {
    const { result } = renderHook(() => useTTS());

    act(() => { result.current.announceCountdown(10); });

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

// ── announceStep — undefined index ─────────────────────────────────────────────

describe('announceStep — undefined step', () => {
  it('does not speak when the index is out of bounds', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [];

    act(() => {
      result.current.announceStep(0, steps);
    });

    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does not speak when the index is negative (out of bounds)', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'work', label: 'Push-up', durationSec: 40 }),
    ];

    act(() => {
      // JavaScript array access with a negative index returns undefined.
      result.current.announceStep(-1, steps);
    });

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

// ── announceStep — work ────────────────────────────────────────────────────────

describe('announceStep — work', () => {
  it('speaks exercise name and duration for a timed work step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'work', label: 'Push-up', durationSec: 40 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Push-up, 40 seconds');
  });

  it('speaks exercise name and reps for a rep-based work step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'work', label: 'Squat', reps: 12 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Squat, 12 reps');
  });

  it('speaks only the exercise name when both durationSec and reps are null', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'work', label: 'Hold', durationSec: null, reps: null }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Hold');
  });

  it('appends bilateral side to the exercise name', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'work', label: 'Single-leg Press', durationSec: 30, side: 'Left' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Single-leg Press Left, 30 seconds');
  });
});

// ── announceStep — warmup-work ─────────────────────────────────────────────────

describe('announceStep — warmup-work', () => {
  it('speaks exercise name and duration for a timed warmup-work step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'warmup-work', label: 'Arm Circles', durationSec: 30 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Arm Circles, 30 seconds');
  });

  it('speaks exercise name and reps for a rep-based warmup-work step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'warmup-work', label: 'Leg Swings', reps: 10 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Leg Swings, 10 reps');
  });

  it('appends bilateral side to the warmup-work name', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'warmup-work', label: 'Hip Circle', durationSec: 20, side: 'Right' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Hip Circle Right, 20 seconds');
  });
});

// ── announceStep — cooldown-work ───────────────────────────────────────────────

describe('announceStep — cooldown-work', () => {
  it('speaks exercise name and duration for a timed cooldown-work step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'cooldown-work', label: 'Hamstring Stretch', durationSec: 45 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Hamstring Stretch, 45 seconds');
  });

  it('appends bilateral side to the cooldown-work name', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'cooldown-work', label: 'IT Band Stretch', durationSec: 30, side: 'Left' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('IT Band Stretch Left, 30 seconds');
  });
});

// ── announceStep — stretch ─────────────────────────────────────────────────────

describe('announceStep — stretch', () => {
  it('speaks exercise name and duration for a timed stretch step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'stretch', label: 'Hip Flexor Stretch', durationSec: 30 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Hip Flexor Stretch, 30 seconds');
  });

  it('appends bilateral side to the stretch name', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'stretch', label: 'Pigeon Pose', durationSec: 40, side: 'Right' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Pigeon Pose Right, 40 seconds');
  });
});

// ── announceStep — rest ────────────────────────────────────────────────────────

describe('announceStep — rest', () => {
  it('announces rest duration and next exercise name when a next step exists', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'rest', label: 'Rest', durationSec: 20 }),
      makeStep({ stepKind: 'work', label: 'Lunge', durationSec: 40 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Rest 20 sec, prepare for Lunge');
  });

  it('announces rest duration with next exercise bilateral side', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'rest', label: 'Rest', durationSec: 15 }),
      makeStep({ stepKind: 'work', label: 'Step-up', durationSec: 30, side: 'Right' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Rest 15 sec, prepare for Step-up Right');
  });

  it('speaks "Session complete" when rest is the last step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'rest', label: 'Rest', durationSec: 20 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Session complete');
  });

  it('uses 0 as rest duration when durationSec is null', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'rest', label: 'Rest', durationSec: null }),
      makeStep({ stepKind: 'work', label: 'Plank', durationSec: 30 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Rest 0 sec, prepare for Plank');
  });
});

// ── announceStep — between ─────────────────────────────────────────────────────

describe('announceStep — between', () => {
  it('announces rest duration and next exercise name when a next step exists', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'between', label: 'Between Rounds', durationSec: 90 }),
      makeStep({ stepKind: 'work', label: 'Deadlift', durationSec: 40 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Rest 90 sec, prepare for Deadlift');
  });

  it('speaks "Session complete" when between is the last step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'between', label: 'Between Rounds', durationSec: 90 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Session complete');
  });
});

// ── announceStep — warmup-delay ────────────────────────────────────────────────

describe('announceStep — warmup-delay', () => {
  it('announces next warmup exercise name', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'warmup-delay', label: 'Delay', durationSec: 5 }),
      makeStep({ stepKind: 'warmup-work', label: 'High Knees', durationSec: 30 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Prepare for High Knees');
  });

  it('announces next exercise with bilateral side appended', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'warmup-delay', label: 'Delay', durationSec: 5 }),
      makeStep({ stepKind: 'warmup-work', label: 'Hip Circle', durationSec: 20, side: 'Left' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Prepare for Hip Circle Left');
  });

  it('does NOT speak when warmup-delay is the last step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'warmup-delay', label: 'Delay', durationSec: 5 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

// ── announceStep — cooldown-delay ──────────────────────────────────────────────

describe('announceStep — cooldown-delay', () => {
  it('announces next cooldown exercise name', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'cooldown-delay', label: 'Delay', durationSec: 5 }),
      makeStep({ stepKind: 'cooldown-work', label: 'Child\'s Pose', durationSec: 45 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith("Prepare for Child's Pose");
  });

  it('announces next cooldown exercise with bilateral side appended', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'cooldown-delay', label: 'Delay', durationSec: 5 }),
      makeStep({ stepKind: 'cooldown-work', label: 'Quad Stretch', durationSec: 30, side: 'Right' }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).toHaveBeenCalledWith('Prepare for Quad Stretch Right');
  });

  it('does NOT speak when cooldown-delay is the last step', () => {
    const { result } = renderHook(() => useTTS());
    const steps: ExecutionStep[] = [
      makeStep({ stepKind: 'cooldown-delay', label: 'Delay', durationSec: 5 }),
    ];

    act(() => { result.current.announceStep(0, steps); });

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

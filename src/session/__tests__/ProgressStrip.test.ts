// src/session/__tests__/ProgressStrip.test.ts
//
// Unit tests for ProgressStrip pure helper functions.
//
// Strategy:
//   - Only the two exported pure helpers are tested here: deriveGroupTag and
//     findNextExerciseDotIndex. The React component itself is not rendered —
//     its behaviour is fully determined by these helpers plus the useMemo
//     composition, which is covered by buildStepSequence integration tests.
//   - No mocking required: the helpers depend only on TypeScript types and the
//     module-level EXERCISE_STEP_KINDS set, with no RN runtime calls.

import { deriveGroupTag, findNextExerciseDotIndex } from '../ProgressStrip';
import type { ExecutionStep } from '../buildStepSequence';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStep(
  stepKind: ExecutionStep['stepKind'],
  phaseLabel: string = '',
): ExecutionStep {
  return {
    key: `step-${stepKind}`,
    stepKind,
    phaseLabel,
    label: stepKind,
    side: null,
    durationSec: 30,
    reps: null,
    exercise: null,
  };
}

// A minimal DotEntry shape that findNextExerciseDotIndex expects.
interface DotEntry {
  readonly stepArrayIndex: number;
  readonly groupTag: string;
  readonly hasDividerBefore: boolean;
}

function makeDot(stepArrayIndex: number): DotEntry {
  return { stepArrayIndex, groupTag: 'test', hasDividerBefore: false };
}

// ── deriveGroupTag ────────────────────────────────────────────────────────────

describe('deriveGroupTag', () => {
  it('returns "warmup" for warmup-work steps', () => {
    const step = makeStep('warmup-work', 'Warm-up');
    expect(deriveGroupTag(step)).toBe('warmup');
  });

  it('returns "cooldown" for cooldown-work steps', () => {
    const step = makeStep('cooldown-work', 'Cool-down');
    expect(deriveGroupTag(step)).toBe('cooldown');
  });

  it('returns "work-<phaseLabel>" for work steps', () => {
    const step = makeStep('work', 'Round 2 / 3');
    expect(deriveGroupTag(step)).toBe('work-Round 2 / 3');
  });

  it('returns "stretch-<phaseLabel>" for stretch steps', () => {
    const step = makeStep('stretch', 'Between Rounds');
    expect(deriveGroupTag(step)).toBe('stretch-Between Rounds');
  });

  it('returns "unknown" for gap/rest step kinds (defensive fallback)', () => {
    const step = makeStep('rest', 'Rest');
    expect(deriveGroupTag(step)).toBe('unknown');
  });
});

// ── findNextExerciseDotIndex ──────────────────────────────────────────────────

describe('findNextExerciseDotIndex', () => {
  it('returns the dot index when the immediately next step is an exercise step', () => {
    // steps: [rest at 0, work at 1]
    // dots:  [dot pointing at stepArrayIndex 1]
    // current stepIndex: 0 (rest)
    const steps: ExecutionStep[] = [
      makeStep('rest'),
      makeStep('work', 'Round 1 / 1'),
    ];
    const dots: DotEntry[] = [makeDot(1)];

    expect(findNextExerciseDotIndex(steps, 0, dots)).toBe(0);
  });

  it('skips gap steps to find the next exercise step', () => {
    // steps: [work at 0, rest at 1, between at 2, work at 3]
    // dots:  [dot at 0, dot at 3]
    // current stepIndex: 1 (rest)
    const steps: ExecutionStep[] = [
      makeStep('work', 'Round 1 / 2'),
      makeStep('rest'),
      makeStep('between'),
      makeStep('work', 'Round 2 / 2'),
    ];
    const dots: DotEntry[] = [makeDot(0), makeDot(3)];

    // Gap step at index 1 → next exercise is at stepArrayIndex 3 → dot index 1
    expect(findNextExerciseDotIndex(steps, 1, dots)).toBe(1);
  });

  it('returns -1 when there is no exercise step after stepIndex', () => {
    // steps: [work at 0, rest at 1]
    // dots:  [dot at 0]
    // current stepIndex: 1 (rest) — no exercise follows
    const steps: ExecutionStep[] = [
      makeStep('work', 'Round 1 / 1'),
      makeStep('rest'),
    ];
    const dots: DotEntry[] = [makeDot(0)];

    expect(findNextExerciseDotIndex(steps, 1, dots)).toBe(-1);
  });

  it('returns -1 when stepIndex points to the last step', () => {
    // steps: [work at 0]
    // dots:  [dot at 0]
    // current stepIndex: 0 (last) — scan starts at 1, which is out of bounds
    const steps: ExecutionStep[] = [makeStep('work', 'Round 1 / 1')];
    const dots: DotEntry[] = [makeDot(0)];

    expect(findNextExerciseDotIndex(steps, 0, dots)).toBe(-1);
  });
});

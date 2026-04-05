// src/session/__tests__/buildStepSequence.test.ts
//
// Unit tests for the buildStepSequence pure function (src/session/buildStepSequence.ts).
//
// Strategy:
//   - buildStepSequence is a pure function with no external dependencies.
//   - No mocks needed — all inputs are constructed inline via factory helpers.
//   - Each test covers one specific behavioral path, identified in the test name.

import { buildStepSequence } from '../../../src/session/buildStepSequence';
import type { ExecutionStep } from '../../../src/session/buildStepSequence';
import type { Session, Exercise } from '../../../src/types/index';

// ── Factories ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    schemaVersion: 1,
    planId: 'plan-1',
    name: 'Test Session',
    type: 'resistance',
    orderInPlan: 1,
    rounds: 1,
    estimatedDurationMinutes: 30,
    workSec: 40,
    restBetweenExSec: 20,
    stretchBetweenRoundsSec: 30,
    restBetweenRoundsSec: 30,
    warmupDelayBetweenItemsSec: 5,
    cooldownDelayBetweenItemsSec: 5,
    betweenRoundExerciseId: null,
    ...overrides,
  };
}

function makeExercise(
  phase: Exercise['phase'],
  order: number,
  name: string,
  overrides: Partial<Exercise> = {},
): Exercise {
  return {
    id: `ex-${name.replace(/\s/g, '-')}-${order}`,
    schemaVersion: 1,
    sessionId: 'sess-1',
    phase,
    order,
    name,
    type: 'timed',
    durationSec: 30,
    reps: null,
    weight: null,
    equipment: 'bodyweight',
    formCues: [],
    youtubeSearchQuery: null,
    isBilateral: false,
    ...overrides,
  };
}

// Convenience: extracts step kinds from a sequence for snapshot-style assertions.
function stepKinds(steps: ExecutionStep[]): string[] {
  return steps.map((s) => s.stepKind);
}

// ── Empty session ──────────────────────────────────────────────────────────────

describe('buildStepSequence — empty inputs', () => {
  test('no exercises → empty array', () => {
    const steps = buildStepSequence(makeSession(), []);
    expect(steps).toHaveLength(0);
  });

  test('exercises present for other sessions are ignored (sessionId mismatch is not filtered by function — exercises are passed pre-filtered)', () => {
    // buildStepSequence receives exercises that the caller has already filtered by sessionId.
    // This test simply confirms an exercise with phase: null and no betweenRoundExerciseId
    // does not appear in the sequence.
    const orphan = makeExercise(null, 1, 'Orphan', { id: 'ex-orphan' });
    const steps = buildStepSequence(makeSession({ betweenRoundExerciseId: null }), [orphan]);
    expect(steps).toHaveLength(0);
  });
});

// ── Warmup ─────────────────────────────────────────────────────────────────────

describe('buildStepSequence — warmup', () => {
  test('single non-bilateral timed warmup → 1 warmup-work step, no delay', () => {
    const ex = makeExercise('warmup', 1, 'Hip Circle');
    const steps = buildStepSequence(makeSession(), [ex]);

    expect(steps).toHaveLength(1);
    expect(steps[0].stepKind).toBe('warmup-work');
    expect(steps[0].label).toBe('Hip Circle');
    expect(steps[0].side).toBeNull();
    expect(steps[0].durationSec).toBe(30);
    expect(steps[0].reps).toBeNull();
    expect(steps[0].exercise).toBe(ex);
  });

  test('two warmup exercises → warmup-delay between them, NOT after the second', () => {
    const ex1 = makeExercise('warmup', 1, 'Hip Circle');
    const ex2 = makeExercise('warmup', 2, 'Arm Swing');
    const steps = buildStepSequence(makeSession({ warmupDelayBetweenItemsSec: 5 }), [ex1, ex2]);

    expect(stepKinds(steps)).toEqual(['warmup-work', 'warmup-delay', 'warmup-work']);
    expect(steps[1].durationSec).toBe(5);
    expect(steps[1].label).toBe('Next: Arm Swing');
    expect(steps[1].exercise).toBeNull();
  });

  test('three warmup exercises → two warmup-delays (between each pair)', () => {
    const ex1 = makeExercise('warmup', 1, 'A');
    const ex2 = makeExercise('warmup', 2, 'B');
    const ex3 = makeExercise('warmup', 3, 'C');
    const steps = buildStepSequence(makeSession(), [ex1, ex2, ex3]);

    expect(stepKinds(steps)).toEqual([
      'warmup-work', 'warmup-delay',
      'warmup-work', 'warmup-delay',
      'warmup-work',
    ]);
  });

  test('warmup exercises are sorted by order (ascending), regardless of input order', () => {
    const ex1 = makeExercise('warmup', 2, 'Second');
    const ex2 = makeExercise('warmup', 1, 'First');
    const steps = buildStepSequence(makeSession(), [ex1, ex2]);

    expect(steps[0].label).toBe('First');
    expect(steps[2].label).toBe('Second');
  });

  test('bilateral timed warmup → 2 warmup-work steps (Left then Right), then delay toward next', () => {
    const bilateral = makeExercise('warmup', 1, 'Lateral Lunge', { isBilateral: true, durationSec: 20 });
    const next = makeExercise('warmup', 2, 'Hip Circle');
    const steps = buildStepSequence(makeSession(), [bilateral, next]);

    expect(stepKinds(steps)).toEqual(['warmup-work', 'warmup-work', 'warmup-delay', 'warmup-work']);
    expect(steps[0].side).toBe('Left');
    expect(steps[0].durationSec).toBe(20);
    expect(steps[1].side).toBe('Right');
    expect(steps[1].durationSec).toBe(20);
  });

  test('bilateral timed warmup, last item → 2 warmup-work steps, no delay after', () => {
    const bilateral = makeExercise('warmup', 1, 'Lateral Lunge', { isBilateral: true, durationSec: 20 });
    const steps = buildStepSequence(makeSession(), [bilateral]);

    expect(stepKinds(steps)).toEqual(['warmup-work', 'warmup-work']);
    expect(steps[0].side).toBe('Left');
    expect(steps[1].side).toBe('Right');
  });

  test('bilateral rep-based warmup → single warmup-work step with side: null', () => {
    const bilateral = makeExercise('warmup', 1, 'Walking Lunge', {
      isBilateral: true,
      type: 'rep',
      durationSec: null,
      reps: 10,
    });
    const steps = buildStepSequence(makeSession(), [bilateral]);

    expect(steps).toHaveLength(1);
    expect(steps[0].side).toBeNull();
    expect(steps[0].reps).toBe(10);
    expect(steps[0].durationSec).toBeNull();
  });
});

// ── Main circuit ───────────────────────────────────────────────────────────────

describe('buildStepSequence — main circuit (single round)', () => {
  test('single exercise → 1 work step, no rest after (only work step is the last)', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(makeSession({ rounds: 1 }), [ex]);

    expect(steps).toHaveLength(1);
    expect(steps[0].stepKind).toBe('work');
  });

  test('two exercises → rest after first, no rest after last', () => {
    const ex1 = makeExercise('main', 1, 'Squat');
    const ex2 = makeExercise('main', 2, 'Push-up');
    const steps = buildStepSequence(makeSession({ rounds: 1 }), [ex1, ex2]);

    expect(stepKinds(steps)).toEqual(['work', 'rest', 'work']);
    expect(steps[1].label).toBe('Next: Push-up');
  });

  test('round label is "Circuit" when rounds === 1', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(makeSession({ rounds: 1 }), [ex]);

    expect(steps[0].phaseLabel).toBe('Circuit');
  });
});

describe('buildStepSequence — main circuit (multiple rounds)', () => {
  test('round label is "Round N / M" when rounds > 1', () => {
    const ex = makeExercise('main', 1, 'Squat');
    // 1 exercise, 2 rounds, no between-round rest → work, rest, work
    const steps = buildStepSequence(makeSession({ rounds: 2, restBetweenRoundsSec: 0 }), [ex]);

    // steps[0] = Round 1 work, steps[1] = Round 1 rest (after last ex in non-final round),
    // steps[2] = Round 2 work
    expect(steps[0].phaseLabel).toBe('Round 1 / 2');
    expect(steps[1].phaseLabel).toBe('Round 1 / 2');
    expect(steps[2].phaseLabel).toBe('Round 2 / 2');
  });

  test('rest follows last exercise in non-final round; no rest after last exercise in final round', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 0, betweenRoundExerciseId: null }),
      [ex],
    );

    // Round 1: work → rest; Round 2: work (no rest — final work step)
    expect(stepKinds(steps)).toEqual(['work', 'rest', 'work']);
  });

  test('rest label at end-of-round with no betweenRound exercise: "Coming up: <first main ex>"', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 0, betweenRoundExerciseId: null }),
      [ex],
    );

    expect(steps[1].label).toBe('Coming up: Squat');
  });

  test('rest label at end-of-round with betweenRound exercise: "Coming up: <betweenEx name>"', () => {
    const betweenEx = makeExercise(null, 1, 'Hip Flexor Stretch', { id: 'ex-between' });
    const mainEx = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 0, betweenRoundExerciseId: 'ex-between' }),
      [mainEx, betweenEx],
    );

    expect(steps[1].label).toBe('Coming up: Hip Flexor Stretch');
  });

  test('bilateral timed main exercise → 2 work steps then rest', () => {
    const bilateral = makeExercise('main', 1, 'Side Plank', { isBilateral: true, durationSec: 30 });
    const next = makeExercise('main', 2, 'Push-up');
    const steps = buildStepSequence(makeSession({ rounds: 1 }), [bilateral, next]);

    expect(stepKinds(steps)).toEqual(['work', 'work', 'rest', 'work']);
    expect(steps[0].side).toBe('Left');
    expect(steps[1].side).toBe('Right');
  });

  test('bilateral rep-based main exercise → 1 work step (side: null), then rest', () => {
    const bilateral = makeExercise('main', 1, 'Single-leg RDL', {
      isBilateral: true,
      type: 'rep',
      durationSec: null,
      reps: 8,
    });
    const next = makeExercise('main', 2, 'Push-up');
    const steps = buildStepSequence(makeSession({ rounds: 1 }), [bilateral, next]);

    expect(stepKinds(steps)).toEqual(['work', 'rest', 'work']);
    expect(steps[0].side).toBeNull();
    expect(steps[0].reps).toBe(8);
  });
});

// ── Between-round sequence ─────────────────────────────────────────────────────

describe('buildStepSequence — between-round sequence', () => {
  test('no between-round sequence emitted after the final round', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 1, restBetweenRoundsSec: 30 }),
      [ex],
    );

    const kinds = stepKinds(steps);
    expect(kinds).not.toContain('stretch');
    expect(kinds).not.toContain('between');
  });

  test('between-round rest skipped when restBetweenRoundsSec < 5', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 4, betweenRoundExerciseId: null }),
      [ex],
    );

    expect(stepKinds(steps)).not.toContain('between');
  });

  test('between-round rest included when restBetweenRoundsSec >= 5', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 30, betweenRoundExerciseId: null }),
      [ex],
    );

    const betweenSteps = steps.filter((s) => s.stepKind === 'between');
    expect(betweenSteps).toHaveLength(1);
    expect(betweenSteps[0].durationSec).toBe(30);
  });

  test('between-round rest boundary: exactly 5s is included', () => {
    const ex = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 5, betweenRoundExerciseId: null }),
      [ex],
    );

    expect(stepKinds(steps)).toContain('between');
  });

  test('between-round non-bilateral exercise → 1 stretch step before rest', () => {
    const betweenEx = makeExercise(null, 1, 'Hip Flexor Stretch', { id: 'ex-between', durationSec: 20 });
    const mainEx = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 30, betweenRoundExerciseId: 'ex-between' }),
      [mainEx, betweenEx],
    );

    const stretchSteps = steps.filter((s) => s.stepKind === 'stretch');
    expect(stretchSteps).toHaveLength(1);
    expect(stretchSteps[0].label).toBe('Hip Flexor Stretch');
    expect(stretchSteps[0].side).toBeNull();
    expect(stretchSteps[0].durationSec).toBe(20);
    expect(stretchSteps[0].phaseLabel).toBe('Between Rounds');

    // stretch appears before the between rest
    const stretchIdx = steps.indexOf(stretchSteps[0]);
    const betweenIdx = steps.findIndex((s) => s.stepKind === 'between');
    expect(stretchIdx).toBeLessThan(betweenIdx);
  });

  test('between-round timed bilateral exercise → 2 stretch steps (Left then Right)', () => {
    const betweenEx = makeExercise(null, 1, 'Pigeon Pose', {
      id: 'ex-between',
      isBilateral: true,
      durationSec: 30,
    });
    const mainEx = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 0, betweenRoundExerciseId: 'ex-between' }),
      [mainEx, betweenEx],
    );

    const stretchSteps = steps.filter((s) => s.stepKind === 'stretch');
    expect(stretchSteps).toHaveLength(2);
    expect(stretchSteps[0].side).toBe('Left');
    expect(stretchSteps[1].side).toBe('Right');
    expect(stretchSteps[0].durationSec).toBe(30);
    expect(stretchSteps[1].durationSec).toBe(30);
  });

  test('between-round rest label contains next round first exercise name', () => {
    const mainEx = makeExercise('main', 1, 'Squat');
    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 30, betweenRoundExerciseId: null }),
      [mainEx],
    );

    const betweenStep = steps.find((s) => s.stepKind === 'between');
    expect(betweenStep).toBeDefined();
    expect(betweenStep!.label).toContain('Round 2 / 2');
    expect(betweenStep!.label).toContain('Squat');
  });
});

// ── Cooldown ───────────────────────────────────────────────────────────────────

describe('buildStepSequence — cooldown', () => {
  test('single cooldown exercise → 1 cooldown-work step, no delay', () => {
    const ex = makeExercise('cooldown', 1, 'Child Pose');
    const steps = buildStepSequence(makeSession(), [ex]);

    expect(steps).toHaveLength(1);
    expect(steps[0].stepKind).toBe('cooldown-work');
    expect(steps[0].label).toBe('Child Pose');
    expect(steps[0].side).toBeNull();
  });

  test('two cooldown exercises → cooldown-delay between them, NOT after last', () => {
    const ex1 = makeExercise('cooldown', 1, 'Child Pose');
    const ex2 = makeExercise('cooldown', 2, 'Cat-Cow');
    const steps = buildStepSequence(makeSession({ cooldownDelayBetweenItemsSec: 5 }), [ex1, ex2]);

    expect(stepKinds(steps)).toEqual(['cooldown-work', 'cooldown-delay', 'cooldown-work']);
    expect(steps[1].durationSec).toBe(5);
    expect(steps[1].label).toBe('Next: Cat-Cow');
    expect(steps[1].exercise).toBeNull();
  });

  test('bilateral timed cooldown → 2 cooldown-work steps (Left then Right)', () => {
    const bilateral = makeExercise('cooldown', 1, 'Pigeon Pose', { isBilateral: true, durationSec: 40 });
    const steps = buildStepSequence(makeSession(), [bilateral]);

    expect(stepKinds(steps)).toEqual(['cooldown-work', 'cooldown-work']);
    expect(steps[0].side).toBe('Left');
    expect(steps[1].side).toBe('Right');
    expect(steps[0].durationSec).toBe(40);
  });
});

// ── Full sequence integration ──────────────────────────────────────────────────

describe('buildStepSequence — full sequence', () => {
  test('warmup + main (2 rounds) + cooldown produces correct shape', () => {
    const warmup = makeExercise('warmup', 1, 'Hip Circle');
    const main1 = makeExercise('main', 1, 'Squat');
    const main2 = makeExercise('main', 2, 'Push-up');
    const cooldown = makeExercise('cooldown', 1, 'Child Pose');

    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 30, betweenRoundExerciseId: null }),
      [warmup, main1, main2, cooldown],
    );

    expect(stepKinds(steps)).toEqual([
      // Warmup
      'warmup-work',
      // Round 1
      'work', 'rest',   // main1
      'work', 'rest',   // main2 (rest because not the final round's last exercise)
      // Between rounds
      'between',
      // Round 2
      'work', 'rest',   // main1
      'work',           // main2 — last exercise in last round, no rest
      // Cooldown
      'cooldown-work',
    ]);
  });

  test('all step keys are unique across the full sequence', () => {
    const warmup = makeExercise('warmup', 1, 'Hip Circle');
    const main1 = makeExercise('main', 1, 'Squat');
    const between = makeExercise(null, 1, 'Hip Stretch', { id: 'ex-between' });
    const cooldown = makeExercise('cooldown', 1, 'Child Pose');

    const steps = buildStepSequence(
      makeSession({ rounds: 2, restBetweenRoundsSec: 30, betweenRoundExerciseId: 'ex-between' }),
      [warmup, main1, between, cooldown],
    );

    const keys = steps.map((s) => s.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

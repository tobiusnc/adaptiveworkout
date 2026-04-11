// src/session/__tests__/fastForward.test.ts
//
// Unit tests for src/session/fastForward.ts.
//
// Strategy:
//   - fastForward is a pure function: no mocks required.
//   - Tests cover zero elapsed, partial step consumption, exact step boundary,
//     multi-step skip, and the two early-exit barriers (HOLD kind, REP/null).
//   - HOLD_BEFORE_STEP_KINDS from buildStepSequence is the real constant
//     (not mocked) so these tests remain aligned with the live definition.

import { fastForward } from '../fastForward';
import type { ExecutionStep } from '../buildStepSequence';

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// makeStep builds a minimal ExecutionStep for testing.
// The fields that matter to fastForward are stepKind and durationSec.
// Other required fields are filled with sentinel values.

function makeStep(
  stepKind: ExecutionStep['stepKind'],
  durationSec: number | null,
): ExecutionStep {
  return {
    key:        `k-${stepKind}`,
    stepKind,
    phaseLabel: stepKind,
    label:      stepKind,
    side:       null,
    durationSec,
    reps:       null,
    exercise:   null,
  };
}

// Convenience: a timed REST step (delay, not in HOLD_BEFORE_STEP_KINDS)
function restStep(durationSec: number): ExecutionStep {
  return makeStep('rest', durationSec);
}

// Convenience: a timed WORK step (is in HOLD_BEFORE_STEP_KINDS → HOLD barrier)
function workStep(durationSec: number): ExecutionStep {
  return makeStep('work', durationSec);
}

// Convenience: a REP step (durationSec === null → REP barrier)
function repStep(): ExecutionStep {
  return makeStep('work', null);
}

// ── Zero elapsed ──────────────────────────────────────────────────────────────

describe('fastForward — zero elapsed', () => {
  it('returns the same index and secondsLeft when elapsedSec is 0', () => {
    const steps = [restStep(30), restStep(20)];
    const result = fastForward(0, 0, 30, steps);

    expect(result.targetIndex).toBe(0);
    expect(result.targetSecondsLeft).toBe(30);
  });
});

// ── Partial step consumption ──────────────────────────────────────────────────

describe('fastForward — partial consumption', () => {
  it('reduces secondsLeft and stays at the same step when elapsed < current step duration', () => {
    const steps = [restStep(60)];
    const result = fastForward(10, 0, 60, steps);

    expect(result.targetIndex).toBe(0);
    expect(result.targetSecondsLeft).toBe(50);
  });

  it('stays at the current step when elapsed equals secondsLeft minus one', () => {
    const steps = [restStep(30)];
    const result = fastForward(29, 0, 30, steps);

    expect(result.targetIndex).toBe(0);
    expect(result.targetSecondsLeft).toBe(1);
  });
});

// ── Exact step boundary ───────────────────────────────────────────────────────

describe('fastForward — exact boundary', () => {
  it('advances to the next step when elapsed exactly equals current step secondsLeft', () => {
    // steps: [rest(30), rest(20)]
    // elapsed = 30 → consume step 0 entirely, secsLeft becomes 20 for step 1,
    // then remaining = 0 so the while loop exits.
    const steps = [restStep(30), restStep(20)];
    const result = fastForward(30, 0, 30, steps);

    expect(result.targetIndex).toBe(1);
    expect(result.targetSecondsLeft).toBe(20);
  });
});

// ── Multi-step skip ───────────────────────────────────────────────────────────

describe('fastForward — multi-step skip', () => {
  it('skips through multiple AUTO-advance steps and lands at the right index and seconds', () => {
    // steps: [rest(10), rest(20), rest(30)]
    // Start at step 0 with 10s left, elapsed = 25.
    //   consume step 0 (10s), remaining = 15
    //   step 1 is rest(20): secsLeft = 20, remaining = 15 < 20 → partial: secsLeft = 5
    const steps = [restStep(10), restStep(20), restStep(30)];
    const result = fastForward(25, 0, 10, steps);

    expect(result.targetIndex).toBe(1);
    expect(result.targetSecondsLeft).toBe(5);
  });

  it('skips all three steps when elapsed exceeds total duration of auto-advance steps', () => {
    // steps: [rest(10), rest(10), rest(10)]
    // Start at step 0 with 10s left, elapsed = 30 → consumes all three steps.
    const steps = [restStep(10), restStep(10), restStep(10)];
    const result = fastForward(30, 0, 10, steps);

    // idx walks off the end (3 >= 3)
    expect(result.targetIndex).toBe(3);
  });

  it('starts mid-sequence: consumes remaining of current step then advances', () => {
    // steps: [rest(30), rest(15), rest(40)]
    // Start at step 1 (already advanced), 5s left, elapsed = 20.
    //   consume step 1 (5s), remaining = 15
    //   step 2 is rest(40): secsLeft = 40, remaining = 15 < 40 → secsLeft = 25
    const steps = [restStep(30), restStep(15), restStep(40)];
    const result = fastForward(20, 1, 5, steps);

    expect(result.targetIndex).toBe(2);
    expect(result.targetSecondsLeft).toBe(25);
  });
});

// ── HOLD barrier ─────────────────────────────────────────────────────────────

describe('fastForward — HOLD barrier', () => {
  it('stops at a HOLD step (work kind) without consuming its time', () => {
    // steps: [rest(10), work(30)]
    // Start at step 0 with 10s left, elapsed = 15.
    //   consume step 0 (10s), remaining = 5
    //   step 1 is work (HOLD barrier) → break immediately
    const steps = [restStep(10), workStep(30)];
    const result = fastForward(15, 0, 10, steps);

    expect(result.targetIndex).toBe(1);
  });

  it('stops at a HOLD step when elapsed is very large', () => {
    const steps = [restStep(5), workStep(60)];
    const result = fastForward(10000, 0, 5, steps);

    expect(result.targetIndex).toBe(1);
  });

  it('stops at warmup-work (also a HOLD kind)', () => {
    const steps = [restStep(10), makeStep('warmup-work', 30)];
    const result = fastForward(15, 0, 10, steps);

    expect(result.targetIndex).toBe(1);
  });

  it('stops at stretch (also a HOLD kind)', () => {
    const steps = [restStep(10), makeStep('stretch', 30)];
    const result = fastForward(15, 0, 10, steps);

    expect(result.targetIndex).toBe(1);
  });

  it('stops at cooldown-work (also a HOLD kind)', () => {
    const steps = [restStep(10), makeStep('cooldown-work', 30)];
    const result = fastForward(15, 0, 10, steps);

    expect(result.targetIndex).toBe(1);
  });
});

// ── REP barrier ──────────────────────────────────────────────────────────────

describe('fastForward — REP barrier', () => {
  it('stops at a REP step (durationSec === null) without advancing further', () => {
    // steps: [rest(10), repStep]
    // Start at step 0 with 10s left, elapsed = 15.
    //   consume step 0 (10s), remaining = 5
    //   step 1 has durationSec === null → break immediately
    const steps = [restStep(10), repStep()];
    const result = fastForward(15, 0, 10, steps);

    expect(result.targetIndex).toBe(1);
  });

  it('stops at a REP step even when elapsed is very large', () => {
    const steps = [restStep(5), repStep()];
    const result = fastForward(99999, 0, 5, steps);

    expect(result.targetIndex).toBe(1);
  });
});

// ── Walk off end (session completed while backgrounded) ───────────────────────

describe('fastForward — session completed while backgrounded', () => {
  it('returns targetIndex >= steps.length when all steps are consumed', () => {
    const steps = [restStep(10), restStep(10)];
    const result = fastForward(100, 0, 10, steps);

    expect(result.targetIndex).toBeGreaterThanOrEqual(steps.length);
  });

  it('returns steps.length exactly when elapsed is just enough to consume all steps', () => {
    // steps: [rest(10), rest(5)]
    // Start at step 0 with 10s, elapsed = 15 → consume 10 + 5 = 15 exactly.
    const steps = [restStep(10), restStep(5)];
    const result = fastForward(15, 0, 10, steps);

    expect(result.targetIndex).toBe(2); // steps.length = 2
  });

  it('handles a single-step sequence that is fully consumed', () => {
    const steps = [restStep(30)];
    const result = fastForward(30, 0, 30, steps);

    expect(result.targetIndex).toBeGreaterThanOrEqual(1); // walked off end
  });
});

// src/session/fastForward.ts
//
// Pure helper: compute where in the step sequence execution should be after
// `elapsedSec` seconds have passed while the app was backgrounded.
//
// Extracted from app/session/[id].tsx so it can be unit-tested independently
// of React Native and expo-router.
//
// Algorithm:
//   Walk the step array forward, consuming time from each step.
//   - If the current step's remaining time <= elapsed, consume it and advance.
//   - Stop advancing at a HOLD step (requires "Go" tap) or REP step (requires
//     "Done" tap) — these are interaction barriers.
//   - If we walk off the end, the session completed while backgrounded.
//
// In C++ terms: a deterministic time-advance simulation on a queue of time
// intervals, with early-exit conditions at user-interaction barriers.

import {
  HOLD_BEFORE_STEP_KINDS,
} from './buildStepSequence';
import type { ExecutionStep } from './buildStepSequence';

export interface FastForwardResult {
  targetIndex: number;
  targetSecondsLeft: number;
}

/**
 * Compute the step index and remaining seconds after `elapsedSec` have passed.
 *
 * @param elapsedSec        Seconds elapsed while backgrounded.
 * @param currentStepIndex  Step index at the moment of backgrounding.
 * @param currentSecondsLeft Remaining seconds on the current step at backgrounding.
 * @param allSteps          Full step sequence (read-only).
 */
export function fastForward(
  elapsedSec: number,
  currentStepIndex: number,
  currentSecondsLeft: number,
  allSteps: readonly ExecutionStep[],
): FastForwardResult {
  let remaining = elapsedSec;
  let idx = currentStepIndex;
  let secsLeft = currentSecondsLeft;

  while (remaining > 0 && idx < allSteps.length) {
    if (secsLeft <= remaining) {
      // The elapsed time consumes this entire step — advance to the next one.
      remaining -= secsLeft;
      idx += 1;

      if (idx >= allSteps.length) {
        // Walked off the end — session completed while backgrounded.
        break;
      }

      const nextStep = allSteps[idx];
      if (nextStep === undefined) {
        break;
      }
      if (nextStep.durationSec === null) {
        // REP step — user must tap "Done". Stop here.
        break;
      }
      if (HOLD_BEFORE_STEP_KINDS.has(nextStep.stepKind)) {
        // HOLD step — user must tap "Go". Stop here.
        break;
      }
      // AUTO-advance step: initialize its time and continue consuming.
      secsLeft = nextStep.durationSec;
    } else {
      // The elapsed time is absorbed within this step — we stay here.
      secsLeft -= remaining;
      remaining = 0;
    }
  }

  return { targetIndex: idx, targetSecondsLeft: secsLeft };
}

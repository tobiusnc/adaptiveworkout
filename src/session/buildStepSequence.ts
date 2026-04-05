// src/session/buildStepSequence.ts
// Pure function: Session + Exercise[] → ExecutionStep[].
//
// Extracted from the session execution screen so it can be unit-tested
// independently of React Native and expo-router.
//
// Algorithm mirrors the PRD §6.1 session structure:
//   1. Warmup exercises (phase: 'warmup', ascending order)
//      - warmup-delay between each item (NOT after the last one)
//   2. Main circuit × session.rounds rounds
//      a. Each exercise → 'work' step
//      b. Rest after each exercise (restBetweenExSec)
//      c. After final exercise in a round, if NOT the last round:
//         - 'stretch' step for betweenRoundExercise (if present; bilateral → 2 steps)
//         - 'between' rest step (skipped if restBetweenRoundsSec < 5)
//   3. Cooldown exercises (phase: 'cooldown', ascending order)
//      - cooldown-delay between each item (NOT after the last one)

import type { Exercise, Session } from '../types/index';

// ─── Step model ───────────────────────────────────────────────────────────────
//
// Each ExecutionStep is one atomic unit the runtime executes.
// Think of this as std::variant — the `stepKind` field is the discriminant.
// All steps are materialized into a flat array before execution begins.

export type ExecutionStepKind =
  | 'warmup-work'
  | 'warmup-delay'
  | 'work'
  | 'rest'
  | 'stretch'
  | 'between'
  | 'cooldown-work'
  | 'cooldown-delay';

// Steps that require a "Go" tap before the timer starts (PRD §6.3).
// Auto-advance steps do NOT appear in this set.
export const HOLD_BEFORE_STEP_KINDS: ReadonlySet<ExecutionStepKind> = new Set([
  'warmup-work',
  'work',
  'stretch',
  'cooldown-work',
]);

export interface ExecutionStep {
  // Unique key for React list rendering (not a DB id — this step array is ephemeral)
  readonly key: string;
  readonly stepKind: ExecutionStepKind;
  // Human-readable label shown as the phase badge (e.g. "Warm-up", "Round 2 / 3")
  readonly phaseLabel: string;
  // Display name for the exercise or interval
  readonly label: string;
  // For 'work' steps that are bilateral, this identifies the side ("Left" | "Right" | null)
  readonly side: 'Left' | 'Right' | null;
  // durationSec > 0 → timed step; durationSec = null → rep-based step
  readonly durationSec: number | null;
  // For rep-based steps only
  readonly reps: number | null;
  // Originating exercise (null for pure delay/rest steps that have no linked exercise)
  readonly exercise: Exercise | null;
}

// ─── Step sequence builder ────────────────────────────────────────────────────

export function buildStepSequence(
  session: Session,
  allExercises: Exercise[],
): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let keyCounter = 0;

  // Stable key generator — no UUIDs needed; these keys are only used for React rendering.
  function nextKey(): string {
    keyCounter += 1;
    return `step-${keyCounter}`;
  }

  // Partition exercises by phase and sort by order (ascending).
  // Exercises with phase: null are the between-round exercise — accessed separately.
  const warmupExercises: Exercise[] = allExercises
    .filter((ex) => ex.phase === 'warmup')
    .sort((a, b) => a.order - b.order);

  const mainExercises: Exercise[] = allExercises
    .filter((ex) => ex.phase === 'main')
    .sort((a, b) => a.order - b.order);

  const cooldownExercises: Exercise[] = allExercises
    .filter((ex) => ex.phase === 'cooldown')
    .sort((a, b) => a.order - b.order);

  // The between-round exercise (phase: null) is looked up by ID.
  const betweenRoundExercise: Exercise | null =
    session.betweenRoundExerciseId !== null
      ? (allExercises.find((ex) => ex.id === session.betweenRoundExerciseId) ?? null)
      : null;

  // ── 1. Warm-up ──────────────────────────────────────────────────────────────

  for (let i = 0; i < warmupExercises.length; i++) {
    const ex = warmupExercises[i];

    if (ex.isBilateral && ex.durationSec !== null) {
      // Timed bilateral: Left hold → Right hold, no delay between sides.
      steps.push({
        key: nextKey(),
        stepKind: 'warmup-work',
        phaseLabel: 'Warm-up',
        label: ex.name,
        side: 'Left',
        durationSec: ex.durationSec,
        reps: null,
        exercise: ex,
      });
      steps.push({
        key: nextKey(),
        stepKind: 'warmup-work',
        phaseLabel: 'Warm-up',
        label: ex.name,
        side: 'Right',
        durationSec: ex.durationSec,
        reps: null,
        exercise: ex,
      });
    } else {
      // Non-bilateral, or rep-based bilateral (single step; reps is per-side).
      steps.push({
        key: nextKey(),
        stepKind: 'warmup-work',
        phaseLabel: 'Warm-up',
        label: ex.name,
        side: null,
        durationSec: ex.durationSec,
        reps: ex.reps,
        exercise: ex,
      });
    }

    // warmup-delay between items, but NOT after the last item in the warmup.
    const isLastWarmupItem = i === warmupExercises.length - 1;
    if (!isLastWarmupItem) {
      const nextEx = warmupExercises[i + 1];
      steps.push({
        key: nextKey(),
        stepKind: 'warmup-delay',
        phaseLabel: 'Warm-up',
        label: 'Next: ' + nextEx.name,
        side: null,
        durationSec: session.warmupDelayBetweenItemsSec,
        reps: null,
        exercise: null,
      });
    }
  }

  // ── 2. Main circuit × rounds ───────────────────────────────────────────────

  for (let round = 1; round <= session.rounds; round++) {
    const roundLabel = session.rounds > 1
      ? `Round ${round} / ${session.rounds}`
      : 'Circuit';

    for (let exIdx = 0; exIdx < mainExercises.length; exIdx++) {
      const ex = mainExercises[exIdx];
      const isLastExerciseInRound = exIdx === mainExercises.length - 1;

      if (ex.isBilateral && ex.durationSec !== null) {
        // Timed bilateral: Left hold → Right hold, no rest between sides.
        // A normal rest follows after Right (handled below, same as any exercise).
        steps.push({
          key: nextKey(),
          stepKind: 'work',
          phaseLabel: roundLabel,
          label: ex.name,
          side: 'Left',
          durationSec: ex.durationSec,
          reps: null,
          exercise: ex,
        });
        steps.push({
          key: nextKey(),
          stepKind: 'work',
          phaseLabel: roundLabel,
          label: ex.name,
          side: 'Right',
          durationSec: ex.durationSec,
          reps: null,
          exercise: ex,
        });
      } else {
        // Non-bilateral, or rep-based bilateral (single step; reps is per-side).
        steps.push({
          key: nextKey(),
          stepKind: 'work',
          phaseLabel: roundLabel,
          label: ex.name,
          side: null,
          durationSec: ex.durationSec,
          reps: ex.reps,
          exercise: ex,
        });
      }

      // Rest after each exercise (including after the Right side of bilateral).
      // After the last exercise in the last round we do NOT add a rest — the session ends.
      const isLastRound = round === session.rounds;
      const isVeryLastWorkStep = isLastExerciseInRound && isLastRound;

      if (!isVeryLastWorkStep) {
        // Determine what comes next for the rest step label.
        let restLabel: string;
        if (isLastExerciseInRound) {
          // Next thing after the rest is either the between-round sequence or Round N+1 ex 1.
          restLabel =
            betweenRoundExercise !== null
              ? 'Coming up: ' + betweenRoundExercise.name
              : mainExercises.length > 0
              ? 'Coming up: ' + mainExercises[0].name
              : 'Rest';
        } else {
          restLabel = 'Next: ' + mainExercises[exIdx + 1].name;
        }

        steps.push({
          key: nextKey(),
          stepKind: 'rest',
          phaseLabel: roundLabel,
          label: restLabel,
          side: null,
          durationSec: session.restBetweenExSec,
          reps: null,
          exercise: null,
        });
      }
    }

    // Between-round sequence — only after rounds that are NOT the final round.
    const isLastRound = round === session.rounds;
    if (!isLastRound) {
      const nextRoundLabel = `Round ${round + 1} / ${session.rounds}`;

      // Stretch step (bilateral stretch → Left + Right with a delay between sides).
      if (betweenRoundExercise !== null) {
        if (betweenRoundExercise.isBilateral && betweenRoundExercise.durationSec !== null) {
          // Timed bilateral stretch: Left hold → Right hold, no delay between sides.
          steps.push({
            key: nextKey(),
            stepKind: 'stretch',
            phaseLabel: 'Between Rounds',
            label: betweenRoundExercise.name,
            side: 'Left',
            durationSec: betweenRoundExercise.durationSec,
            reps: null,
            exercise: betweenRoundExercise,
          });
          steps.push({
            key: nextKey(),
            stepKind: 'stretch',
            phaseLabel: 'Between Rounds',
            label: betweenRoundExercise.name,
            side: 'Right',
            durationSec: betweenRoundExercise.durationSec,
            reps: null,
            exercise: betweenRoundExercise,
          });
        } else {
          // Non-bilateral, or rep-based bilateral (single step; reps is per-side).
          steps.push({
            key: nextKey(),
            stepKind: 'stretch',
            phaseLabel: 'Between Rounds',
            label: betweenRoundExercise.name,
            side: null,
            durationSec: betweenRoundExercise.durationSec,
            reps: betweenRoundExercise.reps,
            exercise: betweenRoundExercise,
          });
        }
      }

      // Between-round rest — skipped if restBetweenRoundsSec < 5 (PRD §6.1).
      if (session.restBetweenRoundsSec >= 5) {
        const nextFirstEx = mainExercises.length > 0 ? mainExercises[0] : null;
        steps.push({
          key: nextKey(),
          stepKind: 'between',
          phaseLabel: 'Between Rounds',
          label:
            nextFirstEx !== null
              ? `${nextRoundLabel} — Next: ${nextFirstEx.name}`
              : nextRoundLabel,
          side: null,
          durationSec: session.restBetweenRoundsSec,
          reps: null,
          exercise: null,
        });
      }
    }
  }

  // ── 3. Cooldown ─────────────────────────────────────────────────────────────

  for (let i = 0; i < cooldownExercises.length; i++) {
    const ex = cooldownExercises[i];

    if (ex.isBilateral && ex.durationSec !== null) {
      // Timed bilateral: Left hold → Right hold, no delay between sides.
      steps.push({
        key: nextKey(),
        stepKind: 'cooldown-work',
        phaseLabel: 'Cool-down',
        label: ex.name,
        side: 'Left',
        durationSec: ex.durationSec,
        reps: null,
        exercise: ex,
      });
      steps.push({
        key: nextKey(),
        stepKind: 'cooldown-work',
        phaseLabel: 'Cool-down',
        label: ex.name,
        side: 'Right',
        durationSec: ex.durationSec,
        reps: null,
        exercise: ex,
      });
    } else {
      // Non-bilateral, or rep-based bilateral (single step; reps is per-side).
      steps.push({
        key: nextKey(),
        stepKind: 'cooldown-work',
        phaseLabel: 'Cool-down',
        label: ex.name,
        side: null,
        durationSec: ex.durationSec,
        reps: ex.reps,
        exercise: ex,
      });
    }

    // cooldown-delay between items, NOT after the last item.
    const isLastCooldownItem = i === cooldownExercises.length - 1;
    if (!isLastCooldownItem) {
      const nextEx = cooldownExercises[i + 1];
      steps.push({
        key: nextKey(),
        stepKind: 'cooldown-delay',
        phaseLabel: 'Cool-down',
        label: 'Next: ' + nextEx.name,
        side: null,
        durationSec: session.cooldownDelayBetweenItemsSec,
        reps: null,
        exercise: null,
      });
    }
  }

  return steps;
}

// src/session/ProgressStrip.tsx
// Phase 11: horizontal dot strip showing all exercise steps in the session.
//
// Design constraints:
//   - Dots represent only exercise steps: warmup-work, work, cooldown-work, stretch.
//   - Rest/between/delay steps are excluded from the dot strip entirely.
//   - Thin vertical dividers separate: warmup group | round groups | cooldown group.
//   - The "active" dot during a non-exercise step (rest, between, delay) is the dot
//     for the NEXT exercise step — scan forward in the steps array.
//   - All dots fit on one screen width; no ScrollView. Use flexbox compression.
//   - DO NOT modify buildStepSequence.ts or ExecutionStep — derive everything here.

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../styles/tokens';
import type { ExecutionStep, ExecutionStepKind } from './buildStepSequence';

// ─── Types ────────────────────────────────────────────────────────────────────

// The step kinds that earn a visible dot in the progress strip.
// This set is local to this component — not shared with buildStepSequence.
const EXERCISE_STEP_KINDS: ReadonlySet<ExecutionStepKind> = new Set([
  'warmup-work',
  'work',
  'cooldown-work',
  'stretch',
]);

// The step kinds that are "gap" steps — during these, the active dot advances
// to the NEXT exercise step (look-forward behavior).
// Exported so that session/[id].tsx can import the canonical set rather than
// defining its own duplicate.
export const GAP_STEP_KINDS: ReadonlySet<ExecutionStepKind> = new Set([
  'rest',
  'between',
  'warmup-delay',
  'cooldown-delay',
]);

// A dot entry: its index in the full steps[] array, its group tag for dividers,
// and whether it carries a divider visually before it.
interface DotEntry {
  // Index into the full ExecutionStep[] array.
  readonly stepArrayIndex: number;
  // Tag identifying which group this dot belongs to, used to detect group
  // boundaries and insert dividers. Values:
  //   'warmup'       → warmup-work steps
  //   'round-N'      → work/stretch steps belonging to round N (1-indexed)
  //   'cooldown'     → cooldown-work steps
  //   'stretch'      → between-round stretch steps (tagged with the round they follow)
  readonly groupTag: string;
  // Whether a thin divider should be rendered to the LEFT of this dot.
  readonly hasDividerBefore: boolean;
}

// Result of the useMemo that builds the dot list.
interface DotList {
  readonly dots: ReadonlyArray<DotEntry>;
  // The index into dots[] that should be rendered as "active".
  // -1 means no active dot (e.g., before session starts or after session ends).
  readonly activeDotIndex: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProgressStripProps {
  readonly steps: ReadonlyArray<ExecutionStep>;
  readonly stepIndex: number;
}

// ─── Helper: derive group tag ─────────────────────────────────────────────────
//
// Each exercise step needs a group tag so we know where to draw dividers.
// We reconstruct the group from the phaseLabel on the step, which was set by
// buildStepSequence — "Warm-up", "Cool-down", "Round N / M", "Between Rounds",
// or "Circuit". This avoids adding fields to ExecutionStep.
//
// The phaseLabel format from buildStepSequence:
//   warmup-work    → "Warm-up"
//   cooldown-work  → "Cool-down"
//   work           → "Round N / M" (multi-round) or "Circuit" (single-round)
//   stretch        → "Between Rounds"
//
// We tag stretch steps as 'stretch-N' where N is the round label of the
// preceding work group — this means they logically belong to the between-round
// boundary and always get a divider before the NEXT round group.

function deriveGroupTag(step: ExecutionStep): string {
  switch (step.stepKind) {
    case 'warmup-work':
      return 'warmup';
    case 'cooldown-work':
      return 'cooldown';
    case 'work':
      // phaseLabel is "Round N / M" or "Circuit"
      return `work-${step.phaseLabel}`;
    case 'stretch':
      // phaseLabel is "Between Rounds" — use it directly so all
      // between-round stretches share one group tag.
      return `stretch-${step.phaseLabel}`;
    default:
      // GAP steps should never reach here because we only call this
      // for EXERCISE_STEP_KINDS. Defensive fallback.
      return 'unknown';
  }
}

// ─── Helper: find next exercise dot index ─────────────────────────────────────
//
// During a gap step (rest, between, delay), the active dot should point to the
// NEXT exercise step after stepIndex. This scans forward in steps[] to find it,
// then returns the dot index in the dots[] array.
//
// Returns -1 if no subsequent exercise step exists.

function findNextExerciseDotIndex(
  steps: ReadonlyArray<ExecutionStep>,
  stepIndex: number,
  dots: ReadonlyArray<DotEntry>,
): number {
  // Find the stepArrayIndex of the first exercise step after stepIndex.
  for (let i = stepIndex + 1; i < steps.length; i++) {
    const step = steps[i];
    if (step !== undefined && EXERCISE_STEP_KINDS.has(step.stepKind)) {
      // Find the dot in dots[] with this stepArrayIndex.
      const dotIdx = dots.findIndex((d) => d.stepArrayIndex === i);
      return dotIdx;
    }
  }
  return -1;
}

// ─── ProgressStrip component ──────────────────────────────────────────────────

export function ProgressStrip(props: ProgressStripProps): React.JSX.Element {
  const { steps, stepIndex } = props;

  // Build the dot list from the step array.
  // This is analogous to a pre-processing pass in C++: we iterate once over
  // the steps array and produce a compact representation (dots[]) that the
  // render pass uses directly.
  const dotList = useMemo<DotList>(() => {
    const dots: DotEntry[] = [];
    let prevGroupTag: string | null = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step === undefined) {
        continue;
      }
      if (!EXERCISE_STEP_KINDS.has(step.stepKind)) {
        // GAP step — no dot.
        continue;
      }

      const groupTag = deriveGroupTag(step);

      // A divider goes before this dot if the group tag changed AND
      // the previous group was not null (i.e., it's not the very first dot).
      // Special case: 'stretch' steps share a group with "Between Rounds" — we
      // still want a divider between the last work dot and the first stretch dot
      // of a between-round group, and between the stretch and the next round.
      // Because stretch uses its own tag ('stretch-Between Rounds') this is
      // handled naturally by the tag change detection.
      const hasDividerBefore = prevGroupTag !== null && prevGroupTag !== groupTag;

      dots.push({
        stepArrayIndex: i,
        groupTag,
        hasDividerBefore,
      });

      prevGroupTag = groupTag;
    }

    // Now determine the active dot index.
    let activeDotIndex = -1;

    if (stepIndex >= 0 && stepIndex < steps.length) {
      const currentStep = steps[stepIndex];

      if (currentStep !== undefined && EXERCISE_STEP_KINDS.has(currentStep.stepKind)) {
        // Current step is an exercise step — find its dot directly.
        activeDotIndex = dots.findIndex((d) => d.stepArrayIndex === stepIndex);
      } else if (currentStep !== undefined && GAP_STEP_KINDS.has(currentStep.stepKind)) {
        // Gap step — active dot is the NEXT exercise step.
        activeDotIndex = findNextExerciseDotIndex(steps, stepIndex, dots);
      }
      // If activeDotIndex is still -1, we're past all exercise steps (e.g., in
      // the cooldown gap after the last cooldown exercise). Leave as -1.
    }

    return { dots, activeDotIndex };
  }, [steps, stepIndex]);

  const { dots, activeDotIndex } = dotList;

  if (dots.length === 0) {
    return <View style={styles.strip} />;
  }

  return (
    <View style={styles.strip} accessibilityLabel="Session progress strip">
      {dots.map((dot, dotIdx) => {
        const isActive = dotIdx === activeDotIndex;
        const isCompleted = dotIdx < activeDotIndex;

        return (
          <React.Fragment key={`dot-${dot.stepArrayIndex}`}>
            {dot.hasDividerBefore && (
              <View style={styles.groupDivider} />
            )}
            <View
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isCompleted && styles.dotCompleted,
                !isActive && !isCompleted && styles.dotUpcoming,
              ]}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Test exports ─────────────────────────────────────────────────────────────
//
// Internal helpers exported for unit testing only. Not part of the public API.
// Import via: import { __testExports } from './ProgressStrip'

export const __testExports = { deriveGroupTag, findNextExerciseDotIndex };

// ─── Styles ───────────────────────────────────────────────────────────────────

const DOT_SIZE = 8;
const DOT_ACTIVE_SIZE = 12;
const DOT_GAP = 4;
const DIVIDER_WIDTH = 2;
const DIVIDER_HEIGHT = 14;
const DIVIDER_MARGIN = 6;

const styles = StyleSheet.create({
  strip: {
    // Horizontal flex row — dots shrink to fit the available width.
    // flex: 1 allows the strip to use the full container width.
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    // The strip container is given a fixed height to accommodate the larger
    // active dot without layout thrash.
    height: DOT_ACTIVE_SIZE + spacing.xs * 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    // flex: 1 means each dot gets equal width. The actual rendered shape is
    // controlled by width/height/borderRadius. Setting both flex and a width is
    // intentional: flex provides the minimum-guaranteed allocation; width+height
    // give it a circular shape (minimum 8px circle). On very small screens,
    // dots compress to their minimum 2px size but stay visible.
    flex: 1,
    maxWidth: DOT_SIZE,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_GAP / 2,
  },
  dotActive: {
    // Active dot is larger and uses the primary color.
    // The extra size is absorbed by the strip's fixed height.
    maxWidth: DOT_ACTIVE_SIZE,
    width: DOT_ACTIVE_SIZE,
    height: DOT_ACTIVE_SIZE,
    borderRadius: DOT_ACTIVE_SIZE / 2,
    backgroundColor: colors.primary,
  },
  dotCompleted: {
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  dotUpcoming: {
    backgroundColor: colors.border,
  },
  groupDivider: {
    width: DIVIDER_WIDTH,
    height: DIVIDER_HEIGHT,
    borderRadius: DIVIDER_WIDTH / 2,
    backgroundColor: colors.textSecondary,
    marginHorizontal: DIVIDER_MARGIN,
    opacity: 0.5,
  },
});

// app/session/[id].tsx
// Session execution screen — Phase 8.
//
// Lifecycle (analogous to a C++ state machine):
//   LOADING   → loadSession() in flight; spinner shown
//   READY     → step sequence built; waiting for first "Go" tap (or auto-advance)
//   HOLD      → timed step loaded, waiting for user to tap "Go"
//   RUNNING   → countdown ticking
//   AUTO      → non-timed/auto-advance step running (rest, between, delays)
//   COMPLETE  → final step done; navigates back
//   ERROR     → loadSession() failed
//
// Step sequence is constructed ONCE before execution begins (PRD §6.2).
// No steps are generated dynamically during execution.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, typography } from '../../src/styles/tokens';
import { buildStepSequence } from '../../src/session/buildStepSequence';
import type { ExecutionStep, ExecutionStepKind } from '../../src/session/buildStepSequence';

// ─── Execution state machine ──────────────────────────────────────────────────
//
// Analogous to a C++ enum class for the current runtime state.
// HOLD:    timed step is loaded; user must tap "Go" to start the timer.
// RUNNING: countdown timer is ticking.
// PAUSED:  user tapped Pause; timer is frozen.
// REP:     rep-based step loaded; user taps "Done" when finished.
// AUTO:    auto-advance step (rest, between, delays); timer runs without "Go".
// DONE:    final step completed; session over.

type ExecutionState = 'HOLD' | 'RUNNING' | 'PAUSED' | 'REP' | 'AUTO' | 'DONE';

// ─── Screen states ─────────────────────────────────────────────────────────────
//
// Separate from ExecutionState — these govern what the screen renders overall.

type ScreenState = 'LOADING' | 'EXECUTING' | 'ERROR';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

function phaseLabelToDisplayName(phaseLabel: string): string {
  return phaseLabel;
}

// Returns true for step kinds that auto-advance without a "Go" tap.
function isAutoAdvanceStep(kind: ExecutionStepKind): boolean {
  return kind === 'rest' || kind === 'between' || kind === 'warmup-delay' || kind === 'cooldown-delay';
}

// Computes the initial ExecutionState for a given step upon entering it.
function initialStateForStep(step: ExecutionStep): ExecutionState {
  if (step.durationSec === null) {
    // Rep-based step — user taps "Done" when finished.
    return 'REP';
  }
  if (isAutoAdvanceStep(step.stepKind)) {
    // Auto-advance: timer runs immediately without "Go" tap.
    return 'AUTO';
  }
  // Timed step requiring hold-before-step.
  return 'HOLD';
}

// ─── SessionScreen ─────────────────────────────────────────────────────────────

export default function SessionScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const loadSession      = useAppStore((s) => s.loadSession);
  const clearCurrentSession = useAppStore((s) => s.clearCurrentSession);
  const currentSession   = useAppStore((s) => s.currentSession);
  const currentExercises = useAppStore((s) => s.currentExercises);

  // ── Screen-level state ─────────────────────────────────────────────────────
  const [screenState,     setScreenState]     = useState<ScreenState>('LOADING');
  const [loadError,       setLoadError]       = useState<string | null>(null);

  // ── Step execution state ───────────────────────────────────────────────────
  // stepIndex is the cursor into the steps array (like an array iterator).
  const [stepIndex,       setStepIndex]       = useState<number>(0);
  const [execState,       setExecState]       = useState<ExecutionState>('HOLD');
  const [secondsLeft,     setSecondsLeft]     = useState<number>(0);

  // Timer handle — analogous to a std::optional<timer_handle_t> in C++.
  // useRef gives us a stable container that survives re-renders without
  // triggering them (heap-allocated, not stack-local).
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Step sequence — built once from loaded data ────────────────────────────
  // useMemo is analogous to computing a value once and caching it.
  // The dependency array [currentSession, currentExercises] means this only
  // recomputes when the store delivers new data (i.e., after loadSession resolves).
  const steps = useMemo<ExecutionStep[]>(() => {
    if (currentSession === null) {
      return [];
    }
    return buildStepSequence(currentSession, currentExercises);
  }, [currentSession, currentExercises]);

  // ── Timer management ───────────────────────────────────────────────────────
  // stopTimer clears any running interval. Safe to call when no timer is active.
  const stopTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── advanceToStep ──────────────────────────────────────────────────────────
  // Transitions the execution engine to the step at the given index.
  // Handles: timer cleanup, seconds initialization, state machine transition.
  const advanceToStep = useCallback(
    (index: number, allSteps: ExecutionStep[]): void => {
      stopTimer();

      if (index >= allSteps.length) {
        // Past the end — session complete.
        setExecState('DONE');
        setStepIndex(allSteps.length); // sentinel: one past end
        return;
      }

      const step = allSteps[index];
      setStepIndex(index);

      const initialExecState = initialStateForStep(step);
      setExecState(initialExecState);

      if (step.durationSec !== null) {
        setSecondsLeft(step.durationSec);
      } else {
        setSecondsLeft(0);
      }
    },
    [stopTimer],
  );

  // ── Load session on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (id === undefined) {
      setLoadError('No session ID provided.');
      setScreenState('ERROR');
      return;
    }

    setScreenState('LOADING');
    setLoadError(null);

    loadSession(id)
      .then(() => {
        setScreenState('EXECUTING');
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err));
        setScreenState('ERROR');
      });
  }, [id, loadSession]);

  // ── Kick off the first step once steps are built ───────────────────────────
  // This effect fires when `steps` is populated (after loadSession resolves and
  // useMemo recomputes). We only want to initialize once — hence the guard on
  // screenState and stepIndex.
  useEffect(() => {
    if (screenState === 'EXECUTING' && steps.length > 0 && stepIndex === 0 && execState === 'HOLD') {
      advanceToStep(0, steps);
    }
  }, [screenState, steps, stepIndex, execState, advanceToStep]);

  // ── AUTO-state timer: starts immediately without "Go" ─────────────────────
  useEffect(() => {
    if (execState !== 'AUTO') {
      return;
    }

    const currentStep = steps[stepIndex];
    if (currentStep === undefined || currentStep.durationSec === null) {
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          // Schedule the advance outside the state updater to keep it pure.
          // setTimeout(0) defers until the current render cycle completes —
          // analogous to posting a message to a queue rather than calling directly.
          setTimeout(() => { advanceToStep(stepIndex + 1, steps); }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopTimer;
  }, [execState, stepIndex, steps, stopTimer, advanceToStep]);

  // ── RUNNING-state timer: started by "Go" tap ───────────────────────────────
  useEffect(() => {
    if (execState !== 'RUNNING') {
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          setTimeout(() => { advanceToStep(stepIndex + 1, steps); }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopTimer;
  }, [execState, stepIndex, steps, stopTimer, advanceToStep]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return (): void => {
      stopTimer();
      clearCurrentSession();
    };
  }, [stopTimer, clearCurrentSession]);

  // ── Session complete: navigate back ───────────────────────────────────────
  useEffect(() => {
    if (execState === 'DONE') {
      // Post-session feedback is deferred (Phase 9).
      // Navigate back to home screen on completion.
      router.replace('/');
    }
  }, [execState, router]);

  // ─── Event handlers ────────────────────────────────────────────────────────

  // User taps "Go" — transitions HOLD → RUNNING.
  const handleGo = useCallback((): void => {
    if (execState !== 'HOLD') {
      return;
    }
    setExecState('RUNNING');
  }, [execState]);

  // User taps "Done" — rep-based step completed; advance to next.
  const handleRepDone = useCallback((): void => {
    if (execState !== 'REP') {
      return;
    }
    advanceToStep(stepIndex + 1, steps);
  }, [execState, stepIndex, steps, advanceToStep]);

  // User taps "Pause" — freezes a running timer.
  const handlePause = useCallback((): void => {
    if (execState !== 'RUNNING' && execState !== 'AUTO') {
      return;
    }
    stopTimer();
    setExecState('PAUSED');
  }, [execState, stopTimer]);

  // User taps "Resume" — restarts from the frozen secondsLeft.
  const handleResume = useCallback((): void => {
    if (execState !== 'PAUSED') {
      return;
    }
    // Determine which running state to restore based on the current step.
    const currentStep = steps[stepIndex];
    if (currentStep === undefined) {
      return;
    }
    const resumeState: ExecutionState = isAutoAdvanceStep(currentStep.stepKind)
      ? 'AUTO'
      : 'RUNNING';
    setExecState(resumeState);
  }, [execState, steps, stepIndex]);

  // User taps "Skip" — ends current step, begins next.
  const handleSkip = useCallback((): void => {
    advanceToStep(stepIndex + 1, steps);
  }, [stepIndex, steps, advanceToStep]);

  // User taps "Prev" — restarts the previous step from the beginning.
  const handlePrev = useCallback((): void => {
    if (stepIndex === 0) {
      return;
    }
    advanceToStep(stepIndex - 1, steps);
  }, [stepIndex, steps, advanceToStep]);

  // User taps "End Session" — shows confirmation dialog before leaving.
  const handleEndSession = useCallback((): void => {
    stopTimer();
    Alert.alert(
      'End Session?',
      'Your progress will not be saved. Are you sure you want to end this session?',
      [
        {
          text: 'Continue Session',
          style: 'cancel',
          onPress: (): void => {
            // Restore the timer if we were running or auto-advancing.
            const currentStep = steps[stepIndex];
            if (currentStep !== undefined && currentStep.durationSec !== null) {
              const resumeState: ExecutionState = isAutoAdvanceStep(currentStep.stepKind)
                ? 'AUTO'
                : execState === 'HOLD' ? 'HOLD' : 'RUNNING';
              setExecState(resumeState);
            }
          },
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: (): void => {
            router.replace('/');
          },
        },
      ],
    );
  }, [stopTimer, steps, stepIndex, execState, router]);

  // ─── Render helpers ────────────────────────────────────────────────────────

  function renderLoading(): React.JSX.Element {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  function renderError(): React.JSX.Element {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{loadError ?? 'Unknown error'}</Text>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => { router.replace('/'); }}
        >
          <Text style={styles.buttonSecondaryText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderExecution(): React.JSX.Element {
    // Only resistance sessions are supported in this phase.
    if (currentSession !== null && currentSession.type !== 'resistance') {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            {currentSession.type.charAt(0).toUpperCase() + currentSession.type.slice(1)} sessions are not yet supported.
          </Text>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => { router.replace('/'); }}
          >
            <Text style={styles.buttonSecondaryText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (steps.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>
            This session has no exercises. Please contact support.
          </Text>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => { router.replace('/'); }}
          >
            <Text style={styles.buttonSecondaryText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentStep = steps[stepIndex];
    if (currentStep === undefined) {
      // stepIndex is past the end — session is completing, DONE effect will fire.
      return <View style={styles.centeredContainer} />;
    }

    const nextStep = steps[stepIndex + 1] ?? null;
    const progressText = `${stepIndex + 1} / ${steps.length}`;

    return (
      <View style={styles.executionContainer}>
        {/* ── Progress bar ─────────────────────────────────────── */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((stepIndex + 1) / steps.length) * 100}%` as `${number}%` },
            ]}
          />
        </View>

        {/* ── Header: phase label + progress count ─────────────── */}
        <View style={styles.header}>
          <Text style={styles.phaseLabel}>
            {phaseLabelToDisplayName(currentStep.phaseLabel)}
          </Text>
          <Text style={styles.progressCount}>{progressText}</Text>
        </View>

        {/* ── Main content area ─────────────────────────────────── */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise name + side badge */}
          <Text style={styles.exerciseName}>{currentStep.label}</Text>
          {currentStep.side !== null && (
            <View style={styles.sideBadge}>
              <Text style={styles.sideBadgeText}>{currentStep.side} Side</Text>
            </View>
          )}

          {/* Step kind badge (e.g. "REST", "STRETCH") */}
          <View style={[styles.kindBadge, kindBadgeColor(currentStep.stepKind)]}>
            <Text style={styles.kindBadgeText}>
              {stepKindDisplayName(currentStep.stepKind)}
            </Text>
          </View>

          {/* Timer display for timed steps */}
          {currentStep.durationSec !== null && (
            <View style={styles.timerDisplay}>
              <Text style={styles.timerText}>
                {execState === 'HOLD'
                  ? formatSeconds(currentStep.durationSec)
                  : formatSeconds(secondsLeft)}
              </Text>
              {execState === 'PAUSED' && (
                <Text style={styles.pausedLabel}>PAUSED</Text>
              )}
            </View>
          )}

          {/* Rep display for rep-based steps */}
          {currentStep.durationSec === null && currentStep.reps !== null && (
            <View style={styles.repDisplay}>
              <Text style={styles.repText}>{currentStep.reps}</Text>
              <Text style={styles.repLabel}>
                {currentStep.exercise?.isBilateral === true ? 'reps each side' : 'reps'}
              </Text>
            </View>
          )}

          {/* Form cues (only for exercise steps that have an exercise) */}
          {currentStep.exercise !== null && currentStep.exercise.formCues.length > 0 && (
            <View style={styles.formCuesContainer}>
              <Text style={styles.formCuesHeading}>Form cues</Text>
              {currentStep.exercise.formCues.map((cue, index) => (
                <Text
                  key={`cue-${index}`}
                  style={styles.formCueItem}
                >
                  {'\u2022'} {cue}
                </Text>
              ))}
            </View>
          )}

          {/* Next up preview */}
          {nextStep !== null && (
            <View style={styles.nextUpContainer}>
              <Text style={styles.nextUpLabel}>Next up</Text>
              <Text style={styles.nextUpText}>
                {nextStep.label}
                {nextStep.side !== null ? ` (${nextStep.side})` : ''}
                {nextStep.durationSec !== null
                  ? ` — ${formatSeconds(nextStep.durationSec)}`
                  : nextStep.reps !== null
                  ? ` — ${nextStep.reps} ${nextStep.exercise?.isBilateral === true ? 'reps each side' : 'reps'}`
                  : ''}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Primary action buttons ─────────────────────────────── */}
        <View style={styles.actionRow}>
          {execState === 'HOLD' && (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleGo}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>Go</Text>
            </TouchableOpacity>
          )}

          {execState === 'REP' && (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleRepDone}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>Done</Text>
            </TouchableOpacity>
          )}

          {(execState === 'RUNNING' || execState === 'AUTO') && (
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handlePause}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonSecondaryText}>Pause</Text>
            </TouchableOpacity>
          )}

          {execState === 'PAUSED' && (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleResume}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>Resume</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Navigation row ─────────────────────────────────────── */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navButton, stepIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrev}
            disabled={stepIndex === 0}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navButtonText,
                stepIndex === 0 && styles.navButtonTextDisabled,
              ]}
            >
              Prev
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endSessionButton}
            onPress={handleEndSession}
            activeOpacity={0.7}
          >
            <Text style={styles.endSessionText}>End Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Root render ──────────────────────────────────────────────────────────

  if (screenState === 'LOADING') {
    return renderLoading();
  }
  if (screenState === 'ERROR') {
    return renderError();
  }
  return renderExecution();
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function stepKindDisplayName(kind: ExecutionStepKind): string {
  switch (kind) {
    case 'warmup-work':    return 'WARM-UP';
    case 'warmup-delay':   return 'TRANSITION';
    case 'work':           return 'WORK';
    case 'rest':           return 'REST';
    case 'stretch':        return 'STRETCH';
    case 'between':        return 'BETWEEN ROUNDS';
    case 'cooldown-work':  return 'COOL-DOWN';
    case 'cooldown-delay': return 'TRANSITION';
  }
}

interface KindBadgeStyle {
  backgroundColor: string;
}

function kindBadgeColor(kind: ExecutionStepKind): KindBadgeStyle {
  switch (kind) {
    case 'warmup-work':
    case 'warmup-delay':
      return { backgroundColor: '#FF8C00' }; // amber for warmup
    case 'work':
      return { backgroundColor: colors.primary }; // blue for work
    case 'rest':
    case 'between':
      return { backgroundColor: '#4CAF50' }; // green for rest
    case 'stretch':
      return { backgroundColor: '#9C27B0' }; // purple for stretch
    case 'cooldown-work':
    case 'cooldown-delay':
      return { backgroundColor: '#00897B' }; // teal for cooldown
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // ── Execution layout ──────────────────────────────────────────────────────
  executionContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  phaseLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  progressCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // ── Content scroll area ───────────────────────────────────────────────────
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },

  // ── Exercise name ─────────────────────────────────────────────────────────
  exerciseName: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // ── Side badge (Left / Right) ─────────────────────────────────────────────
  sideBadge: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sideBadgeText: {
    ...typography.label,
    color: colors.text,
  },

  // ── Step kind badge ───────────────────────────────────────────────────────
  kindBadge: {
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  kindBadgeText: {
    ...typography.label,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ── Timer ─────────────────────────────────────────────────────────────────
  timerDisplay: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '200' as const,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  pausedLabel: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },

  // ── Rep display ───────────────────────────────────────────────────────────
  repDisplay: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  repText: {
    fontSize: 72,
    fontWeight: '200' as const,
    color: colors.text,
  },
  repLabel: {
    ...typography.subheading,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ── Form cues ─────────────────────────────────────────────────────────────
  formCuesContainer: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formCuesHeading: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase' as const,
  },
  formCueItem: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  // ── Next up preview ───────────────────────────────────────────────────────
  nextUpContainer: {
    alignSelf: 'stretch',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextUpLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    marginBottom: spacing.xs,
  },
  nextUpText: {
    ...typography.body,
    color: colors.text,
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    ...typography.subheading,
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    ...typography.subheading,
    color: colors.text,
  },

  // ── Navigation row ────────────────────────────────────────────────────────
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    ...typography.label,
    color: colors.text,
  },
  navButtonTextDisabled: {
    color: colors.textSecondary,
  },
  endSessionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  endSessionText: {
    ...typography.label,
    color: colors.error,
  },
});

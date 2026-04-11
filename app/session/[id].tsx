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
  AppState,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AppStateStatus,
} from 'react-native';
import {
  saveInterruptedSession,
  getInterruptedSession,
  clearInterruptedSession,
} from '../../src/session/interruptedSessionStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';

import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, typography } from '../../src/styles/tokens';
import {
  buildStepSequence,
  HOLD_BEFORE_STEP_KINDS,
} from '../../src/session/buildStepSequence';
import type { ExecutionStep, ExecutionStepKind } from '../../src/session/buildStepSequence';
import { useTTS } from '../../src/session/useTTS';
import { GAP_STEP_KINDS, ProgressStrip } from '../../src/session/ProgressStrip';
import { ExerciseDetailSheet } from '../../src/session/ExerciseDetailSheet';
import type { Exercise } from '../../src/types/index';


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

// Computes the initial ExecutionState for a given step upon entering it.
// HOLD_BEFORE_STEP_KINDS is the single source of truth for which step kinds
// require a "Go" tap (defined in buildStepSequence.ts alongside the type).
function initialStateForStep(step: ExecutionStep): ExecutionState {
  if (step.durationSec === null) {
    // Rep-based step — user taps "Done" when finished.
    return 'REP';
  }
  if (!HOLD_BEFORE_STEP_KINDS.has(step.stepKind)) {
    // Auto-advance: timer runs immediately without "Go" tap.
    return 'AUTO';
  }
  // Timed step requiring hold-before-step.
  return 'HOLD';
}

// ─── Fast-forward helper ───────────────────────────────────────────────────────
//
// When the app returns to the foreground after being backgrounded during a
// RUNNING or AUTO state, real-world time has passed but the timer did not tick.
// This function computes where we should be in the step sequence after
// `elapsedSec` seconds have elapsed.
//
// The algorithm walks the step array forward, consuming time from each step:
//   - If the current step's remaining time is <= elapsed, we consume it and
//     advance to the next step (and consume from that step, and so on).
//   - We STOP advancing at a HOLD step (requires user "Go" tap) or a REP step
//     (requires user "Done" tap) — these are interaction barriers.
//   - If we walk off the end of the array, the session completed while backgrounded.
//
// In C++ terms: this is a deterministic time-advance simulation on a queue of
// time intervals, with early-exit conditions at user-interaction barriers.
//
// Returns the target step index and the remaining secondsLeft for that step.
// The caller is responsible for calling advanceToStep(targetIndex, steps) and
// then setSecondsLeft(targetSecondsLeft) to override the duration that
// advanceToStep would have set.

interface FastForwardResult {
  targetIndex: number;
  targetSecondsLeft: number;
}

function fastForward(
  elapsedSec: number,
  currentStepIndex: number,
  currentSecondsLeft: number,
  allSteps: ExecutionStep[],
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

// Exposed for unit testing via the __testExports pattern.
// Not part of the public module API — only test files read this.
export const __testExports = { fastForward };

// ─── SessionScreen ─────────────────────────────────────────────────────────────

export default function SessionScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const loadSession         = useAppStore((s) => s.loadSession);
  const clearCurrentSession = useAppStore((s) => s.clearCurrentSession);
  const currentSession      = useAppStore((s) => s.currentSession);
  const currentExercises    = useAppStore((s) => s.currentExercises);
  const setPendingFeedback  = useAppStore((s) => s.setPendingFeedback);

  // ── TTS hook ───────────────────────────────────────────────────────────────
  const { announceStep, announceDone, stopSpeech, announceCountdown } = useTTS();

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

  // ── Bottom sheet ref ───────────────────────────────────────────────────────
  // Imperative handle to the @gorhom/bottom-sheet instance. We call
  // .snapToIndex(0) to open and .close() to dismiss programmatically.
  const bottomSheetRef = useRef<BottomSheet | null>(null);

  // The exercise and step displayed in the bottom sheet. Populated when the
  // user taps the exercise name; cleared after the sheet closes.
  // We keep these as state (not derived from stepIndex) so the sheet content
  // does not disappear mid-close-animation when stepIndex advances.
  const [sheetExercise, setSheetExercise] = useState<Exercise | null>(null);
  const [sheetOpenedDuringGap, setSheetOpenedDuringGap] = useState<boolean>(false);
  const [sheetTargetStep, setSheetTargetStep] = useState<ExecutionStep | null>(null);

  // Mirror of stepIndex in a ref so that the setTimeout callback inside the
  // timer interval always reads the current step index, not the stale closure
  // value captured at effect setup time. Without this, a Skip/Prev tap on the
  // exact tick where secondsLeft hits 1 could fire advanceToStep with the wrong
  // index (M2 from code review).
  const stepIndexRef = useRef<number>(stepIndex);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  // Mirror of execState in a ref so that the AppState event handler (which runs
  // inside a closure captured at subscription time) always reads the current
  // execution state. In C++ terms: the AppState callback is like a lambda that
  // captures execState by value at the time addEventListener is called. The ref
  // gives us a stable pointer to the current value regardless of when the
  // callback fires.
  const execStateRef = useRef<ExecutionState>(execState);
  useEffect(() => {
    execStateRef.current = execState;
  }, [execState]);

  // Mirror of secondsLeft in a ref for the same reason — the AppState handler
  // needs the live value to persist the correct timer position to secure-store.
  const secondsLeftRef = useRef<number>(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // Timestamp (Date.now() ms) recorded when the app transitions to background.
  // Set to null when the app returns to the foreground so we know whether
  // there's a pending elapsed-time calculation.
  const backgroundedAtRef = useRef<number | null>(null);

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
      // Cancel any in-flight speech before transitioning to the next step.
      // Known race: Speech.stop() is fire-and-forget (not awaited). On native
      // iOS/Android the stop is processed synchronously on the native thread
      // before the subsequent Speech.speak() call is enqueued, so the race is
      // benign in practice. Making advanceToStep async to await the stop would
      // require all callers to be async as well — not worth the complexity for
      // a non-observable edge case on native platforms.
      stopSpeech();
      stopTimer();

      if (index >= allSteps.length) {
        // Past the end — session complete.
        setExecState('DONE');
        setStepIndex(allSteps.length); // sentinel: one past end
        announceDone();
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

      // Announce the step that was just entered.
      announceStep(index, allSteps);
    },
    [stopTimer, stopSpeech, announceDone, announceStep],
  );

  // ── handlePrev — declared early so the BackHandler effect can reference it ──
  //
  // In React hooks, every `useCallback` declaration is hoisted to where it
  // appears in the function body, NOT like C++ function definitions which are
  // fully available throughout the translation unit. A `useEffect` that runs
  // below a `useCallback` can reference it, but a `useEffect` above cannot.
  //
  // The BackHandler effect must run in the same hooks list position as the other
  // effects (after the timer effects), but it needs `handlePrev`. To avoid a
  // "used before declaration" TypeScript error, we declare `handlePrev` here,
  // before the effects block.
  //
  // There is no runtime difference — both `useCallback` calls execute in order
  // on every render. This is purely a declaration-ordering requirement.
  const handlePrev = useCallback((): void => {
    if (stepIndex === 0) {
      return;
    }
    advanceToStep(stepIndex - 1, steps);
  }, [stepIndex, steps, advanceToStep]);

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

  // ── Kick off first step (or restore from interrupted state) ───────────────
  //
  // This effect fires once when `steps` is populated (after loadSession resolves
  // and useMemo recomputes). The guard conditions ensure it only runs at the
  // very start: screenState is EXECUTING, steps exist, and we haven't advanced
  // beyond step 0 yet.
  //
  // On mount we check secure-store for an interrupted session record:
  //   - If a matching record exists: restore the saved position (OS-kill recovery).
  //   - If no record: start normally from step 0.
  //
  // The async IIFE (Immediately Invoked Function Expression) pattern is the
  // React idiomatic way to run async code inside useEffect. useEffect callbacks
  // cannot themselves be async (they must be synchronous or return a cleanup
  // function). The IIFE is a workaround — analogous to spawning a coroutine
  // inside a synchronous constructor in C++.
  useEffect(() => {
    if (!(screenState === 'EXECUTING' && steps.length > 0 && stepIndex === 0 && execState === 'HOLD')) {
      return;
    }

    void (async (): Promise<void> => {
      const saved = await getInterruptedSession();

      if (saved !== null && saved.sessionId === id) {
        // ── Restore from interrupted state (OS-kill recovery) ────────────────
        //
        // The app was killed while a session was in progress. The home screen
        // detected the saved state and navigated here. We now restore to the
        // correct position, accounting for time elapsed since backgrounding.
        const elapsedSec = Math.floor((Date.now() - saved.backgroundedAt) / 1000);

        if (saved.execState === 'RUNNING' || saved.execState === 'AUTO') {
          // Timer was running when the app was killed. Fast-forward by the
          // elapsed time to land at the correct step and remaining seconds.
          const { targetIndex, targetSecondsLeft } = fastForward(
            elapsedSec,
            saved.stepIndex,
            saved.secondsLeft,
            steps,
          );
          advanceToStep(targetIndex, steps);
          // advanceToStep sets secondsLeft from step.durationSec; override with
          // the computed remainder so the timer starts from the right value.
          setSecondsLeft(targetSecondsLeft);
        } else {
          // HOLD, PAUSED, REP — timer was not running. Restore exactly.
          // No elapsed-time correction needed.
          setStepIndex(saved.stepIndex);
          setSecondsLeft(saved.secondsLeft);
          setExecState(saved.execState);
        }

        // Record has been applied; delete it so it doesn't interfere with
        // future home-screen mounts.
        await clearInterruptedSession();
      } else {
        // ── No saved state: start session normally from step 0 ───────────────
        advanceToStep(0, steps);
      }
    })();
  }, [screenState, steps, stepIndex, execState, advanceToStep, id]);

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
          // Read stepIndexRef.current (not the closure-captured stepIndex) so
          // that a Skip/Prev tap on the exact tick where prev hits 1 does not
          // cause a double-advance from the old index.
          setTimeout(() => { advanceToStep(stepIndexRef.current + 1, steps); }, 0);
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
          setTimeout(() => { advanceToStep(stepIndexRef.current + 1, steps); }, 0);
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
      stopSpeech();
      stopTimer();
      clearCurrentSession();
      // Belt-and-suspenders: clear any stale interrupted session record on unmount.
      // This handles edge cases where the component unmounts without going through
      // handleEndSession (e.g., a JS error during execution). Fire-and-forget is
      // intentional here — we can't await inside a cleanup function.
      void clearInterruptedSession();
    };
  }, [stopSpeech, stopTimer, clearCurrentSession]);

  // ── AppState subscription: background/foreground detection ────────────────
  //
  // React Native's AppState is like a signal/notification in C++: it fires
  // whenever the app transitions between 'active' (foreground), 'background'
  // (fully backgrounded), and 'inactive' (briefly transitioning on iOS, e.g.
  // during a phone call or when pulling down the notification shade).
  //
  // We only subscribe while the screen is in EXECUTING state. During LOADING
  // and ERROR there is no session timer to correct or state to persist.
  //
  // The subscription is torn down (removed) when the component unmounts or
  // when screenState leaves EXECUTING — analogous to an RAII guard that calls
  // subscription.remove() in its destructor.
  useEffect(() => {
    if (screenState !== 'EXECUTING') {
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        // ── Returning to foreground ──────────────────────────────────────────
        //
        // If we have a recorded background timestamp, calculate elapsed time
        // and apply fast-forward if the timer was running.
        if (backgroundedAtRef.current !== null) {
          const elapsedMs = Date.now() - backgroundedAtRef.current;
          backgroundedAtRef.current = null;

          const currentExecState = execStateRef.current;
          if (currentExecState === 'RUNNING' || currentExecState === 'AUTO') {
            // Timer was ticking when we backgrounded. Compute where we should be
            // now and jump to that position.
            const elapsedSec = Math.floor(elapsedMs / 1000);
            const { targetIndex, targetSecondsLeft } = fastForward(
              elapsedSec,
              stepIndexRef.current,
              secondsLeftRef.current,
              steps,
            );

            if (targetIndex >= steps.length) {
              // Session completed while backgrounded. Transition to DONE.
              // advanceToStep with index >= length handles this case.
              advanceToStep(targetIndex, steps);
            } else {
              // Jump to the computed position. advanceToStep sets secondsLeft
              // from the step's durationSec, so we override it immediately after.
              advanceToStep(targetIndex, steps);
              setSecondsLeft(targetSecondsLeft);
            }
          }
          // PAUSED, HOLD, REP: no real-world time has been consumed against the
          // timer. The existing state is already correct — no changes needed.

          // Re-announce the current step so the user knows where they are after
          // returning from background. Uses the ref value so we always announce
          // the step we actually landed on (post fast-forward).
          announceStep(stepIndexRef.current, steps);

          // The record has been applied; delete it so home screen doesn't
          // navigate back to this session if the user exits normally later.
          void clearInterruptedSession();
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        // ── Transitioning to background / inactive ───────────────────────────
        //
        // Record the timestamp immediately. If the app is killed before it
        // returns to the foreground, this record in secure-store allows the
        // home screen to navigate back here on next launch.
        backgroundedAtRef.current = Date.now();

        const currentExecState = execStateRef.current;
        // Only persist live execution states. DONE is excluded — a completed
        // session exits cleanly and does not need recovery.
        if (
          currentExecState === 'RUNNING' ||
          currentExecState === 'AUTO' ||
          currentExecState === 'HOLD' ||
          currentExecState === 'PAUSED' ||
          currentExecState === 'REP'
        ) {
          void saveInterruptedSession({
            sessionId: id ?? '',
            stepIndex: stepIndexRef.current,
            secondsLeft: secondsLeftRef.current,
            execState: currentExecState,
            backgroundedAt: backgroundedAtRef.current,
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    // Return the cleanup function — React calls this when the effect is torn
    // down (component unmount or screenState change). Analogous to a destructor.
    return (): void => { subscription.remove(); };
  }, [screenState, steps, advanceToStep, announceStep, id]);

  // ── Hardware back button: navigate to previous step ────────────────────────
  //
  // On Android, the hardware back button normally triggers stack navigation
  // (going back to the previous screen). During a session that would be
  // disruptive — the user might accidentally exit mid-exercise.
  //
  // Instead we intercept the back button and call handlePrev() (which moves
  // to the previous step). Returning `true` from the handler tells React Native
  // that the event has been consumed and default navigation should be suppressed.
  //
  // This effect runs only when screenState === 'EXECUTING'. During LOADING and
  // ERROR, default back behavior (navigating home) is appropriate.
  useEffect(() => {
    if (screenState !== 'EXECUTING') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePrev();
      // Return true to consume the event and prevent default back navigation.
      return true;
    });

    return (): void => { subscription.remove(); };
  }, [screenState, handlePrev]);

  // No auto-navigate on DONE — the completion screen is shown instead.
  // The user taps "Finish" to return home. Post-session feedback (Phase 9)
  // will replace this screen.

  // ── 3-2-1 countdown TTS ───────────────────────────────────────────────────
  // Fires for both RUNNING (hold-before-step timed intervals after "Go") and
  // AUTO (rest/delay auto-advance timers). announceCountdown guards internally
  // so only secondsLeft === 3, 2, 1 trigger speech.
  useEffect(() => {
    if ((execState === 'RUNNING' || execState === 'AUTO') && secondsLeft >= 1 && secondsLeft <= 3) {
      announceCountdown(secondsLeft);
    }
  }, [secondsLeft, execState, announceCountdown]);

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
    stopSpeech();
  }, [execState, stopTimer, stopSpeech]);

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
    const resumeState: ExecutionState = !HOLD_BEFORE_STEP_KINDS.has(currentStep.stepKind)
      ? 'AUTO'
      : 'RUNNING';
    setExecState(resumeState);
    // Re-announce the current step so the user knows what they're resuming.
    announceStep(stepIndex, steps);
  }, [execState, steps, stepIndex, announceStep]);

  // User taps "Skip" — ends current step, begins next.
  const handleSkip = useCallback((): void => {
    advanceToStep(stepIndex + 1, steps);
  }, [stepIndex, steps, advanceToStep]);

  // Note: handlePrev is declared earlier in the file (before the effects block)
  // so that the BackHandler useEffect can reference it without a "used before
  // declaration" error. See the comment near its declaration for details.

  // Step 2 of the End Session flow: offer to log the partial session or go
  // straight home. Extracted from handleEndSession to reduce nesting depth.
  //
  // clearInterruptedSession() is called before navigating away because the user
  // has intentionally ended the session — we do not want home screen to redirect
  // back here on the next mount.
  const showLogSessionAlert = useCallback((): void => {
    Alert.alert(
      'Log this session?',
      undefined,
      [
        {
          text: 'Yes, add notes',
          onPress: (): void => {
            // Clear the interrupted record before navigating — intentional exit.
            void clearInterruptedSession();
            if (currentSession !== null) {
              setPendingFeedback({ sessionId: currentSession.id, isComplete: false });
              router.replace('/session/feedback');
            } else {
              router.replace('/');
            }
          },
        },
        {
          text: 'No, go home',
          style: 'cancel',
          onPress: (): void => {
            // Clear the interrupted record before navigating — intentional exit.
            void clearInterruptedSession();
            router.dismissAll();
            router.replace('/');
          },
        },
      ],
    );
  }, [currentSession, setPendingFeedback, router]);

  // ── Exercise name tap → open bottom sheet ─────────────────────────────────
  //
  // Works for any step kind:
  //   - Exercise steps: open sheet for the current step's exercise.
  //   - Gap steps (rest/between/delay): scan forward for the next exercise step.
  //   - If no exercise is found (e.g., at end of session): do nothing.
  //
  // Opening the sheet also pauses the timer by calling handlePause().
  // handlePause() guards internally — it only acts if execState is RUNNING or AUTO.
  // For HOLD/REP/PAUSED states the timer is already stopped; opening the sheet
  // is still valid, we just don't call pause again.
  const handleExerciseNameTap = useCallback((): void => {
    const currentStep = steps[stepIndex];
    if (currentStep === undefined) {
      return;
    }

    let exerciseStep: ExecutionStep | null = null;

    if (currentStep.exercise !== null) {
      // Current step has an exercise directly.
      exerciseStep = currentStep;
    } else if (GAP_STEP_KINDS.has(currentStep.stepKind)) {
      // Gap step — scan forward for the next step that has an exercise.
      for (let i = stepIndex + 1; i < steps.length; i++) {
        const candidate = steps[i];
        if (candidate !== undefined && candidate.exercise !== null) {
          exerciseStep = candidate;
          break;
        }
      }
    }

    if (exerciseStep === null || exerciseStep.exercise === null) {
      // No exercise found — nothing to show.
      return;
    }

    // Only pause during active exercise steps. During gap steps (rest, between,
    // delay) the timer should keep running — the user is just previewing the next
    // exercise while the rest countdown continues.
    const isGapStep = GAP_STEP_KINDS.has(currentStep.stepKind);
    if (!isGapStep) {
      handlePause();
    }

    setSheetExercise(exerciseStep.exercise);
    setSheetTargetStep(exerciseStep);
    // Track whether the sheet was opened during a gap so handleSheetClose
    // knows not to call handleResume (timer was never paused).
    setSheetOpenedDuringGap(isGapStep);
    bottomSheetRef.current?.snapToIndex(0);
  }, [steps, stepIndex, handlePause, bottomSheetRef]);

  // Called by ExerciseDetailSheet when the sheet is dismissed (swipe or Close button).
  // Only resumes if the sheet was opened during a non-gap step (i.e. timer was paused).
  const handleSheetClose = useCallback((): void => {
    if (!sheetOpenedDuringGap) {
      handleResume();
    }
  }, [handleResume, sheetOpenedDuringGap]);

  // User taps "End Session" — two-step Alert pattern:
  //   Step 1: confirm intent to exit.
  //   Step 2 (destructive path only): offer to log the partial session or go
  //           straight home without logging.
  //
  // Capturing stateBeforeAlert before stopTimer() ensures faithful restore if
  // the user cancels. stopTimer() does not mutate execState, but the explicit
  // capture documents the intent and guards against future refactors.
  const handleEndSession = useCallback((): void => {
    const stateBeforeAlert = execState;
    stopTimer();

    Alert.alert(
      'End Session?',
      'End this session early?',
      [
        {
          text: 'Continue Session',
          style: 'cancel',
          onPress: (): void => {
            // Restore exactly the state the user was in before the dialog opened.
            // HOLD/REP/PAUSED have no timer — just set state directly.
            // RUNNING/AUTO had a timer — setting state triggers the useEffect
            // that restarts it.
            setExecState(stateBeforeAlert);
          },
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: showLogSessionAlert,
        },
      ],
    );
  }, [stopTimer, execState, showLogSessionAlert]);

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
      <SafeAreaView style={styles.executionContainer} edges={['bottom']}>
        {/* ── Progress strip (dot strip for all exercise steps) ─── */}
        <ProgressStrip steps={steps} stepIndex={stepIndex} />

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
          {/* Exercise name — tappable to open detail sheet.
              During gap steps (rest/between/delay) the tap looks forward to the
              next exercise step. If no next exercise exists the tap is a no-op
              (handleExerciseNameTap guards internally). */}
          <TouchableOpacity
            onPress={handleExerciseNameTap}
            activeOpacity={0.7}
            accessibilityLabel={`Exercise: ${currentStep.label}. Tap for details.`}
            accessibilityRole="button"
          >
            <Text style={styles.exerciseName}>{currentStep.label}</Text>
          </TouchableOpacity>
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
      </SafeAreaView>
    );
  }

  function renderComplete(): React.JSX.Element {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.completeHeading}>Session Complete</Text>
        <Text style={styles.completeSubtext}>Great work!</Text>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => {
            // Clear the interrupted record — session completed normally (not a
            // crash or OS kill). This prevents home screen from navigating back
            // here on the next launch.
            void clearInterruptedSession();
            if (currentSession !== null) {
              setPendingFeedback({ sessionId: currentSession.id, isComplete: true });
              router.replace('/session/feedback');
            } else {
              router.dismissAll();
              router.replace('/');
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonPrimaryText}>Finish</Text>
        </TouchableOpacity>
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
  if (execState === 'DONE') {
    return renderComplete();
  }

  // The ExerciseDetailSheet must be rendered as a sibling of the execution
  // content, not inside the ScrollView. @gorhom/bottom-sheet uses absolute
  // positioning internally and must be at or near the root of the render tree.
  // Using a React.Fragment here avoids introducing an extra layout View —
  // the sheet renders on top of everything via its own Portal/absolute layer.
  return (
    <>
      {renderExecution()}
      <ExerciseDetailSheet
        bottomSheetRef={bottomSheetRef}
        exercise={sheetExercise}
        targetStep={sheetTargetStep}
        onClose={handleSheetClose}
      />
    </>
  );
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
  completeHeading: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  completeSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});

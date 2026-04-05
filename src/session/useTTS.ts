// src/session/useTTS.ts
// Custom hook encapsulating all TTS (text-to-speech) and audio session logic
// for the session execution screen.
//
// Audio session: uses expo-audio's setAudioModeAsync to configure duckOthers
// so that workout music/podcasts lower their volume while voice guidance plays.
//
// Speech: uses expo-speech (fire-and-forget, never awaited).
//
// Analogy for C++ readers: think of this hook as a RAII wrapper around two
// native resources — the audio session (acquired on mount, released on unmount)
// and the speech engine (stateless, like calling a C API).

import { useCallback, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

import type { ExecutionStep } from './buildStepSequence';

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseTTSResult {
  /** Announce the exercise/interval at the given step index. */
  announceStep: (index: number, allSteps: ExecutionStep[]) => void;
  /** Announce that the session is complete. */
  announceDone: () => void;
  /** Cancel any in-flight or queued speech utterance. */
  stopSpeech: () => void;
  /** Speak a countdown number — only fires for secondsLeft === 3, 2, or 1. */
  announceCountdown: (secondsLeft: number) => void;
}

// ─── Audio mode constants ─────────────────────────────────────────────────────
//
// We configure the audio session once on mount and restore it on unmount.
// 'duckOthers' means: request audio focus with ducking. Other apps (music,
// podcasts) will lower their volume while our TTS utterance is playing, then
// automatically restore their volume afterward.

// ─── useTTS ───────────────────────────────────────────────────────────────────

export function useTTS(): UseTTSResult {

  // ── Audio session setup (RAII pattern) ─────────────────────────────────────
  //
  // On mount: configure audio session to duck other audio sources.
  // On unmount: restore the default audio mode.
  // The empty dependency array [] means this runs exactly once — analogous to
  // a constructor/destructor pair in C++.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch((err: unknown) => {
      // Non-fatal: TTS will still work, just without ducking.
      console.warn('[useTTS] setAudioModeAsync (setup) failed:', err);
    });

    return (): void => {
      // Cancel any in-flight speech before restoring the audio session mode.
      // Without this, an utterance that started while duckOthers was active
      // would continue playing after the mode is reset to mixWithOthers —
      // meaning background audio would no longer duck for it.
      Speech.stop().catch((err: unknown) => {
        console.warn('[useTTS] Speech.stop() (teardown) failed:', err);
      });
      // Restore default audio mode on unmount.
      setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      }).catch((err: unknown) => {
        console.warn('[useTTS] setAudioModeAsync (teardown) failed:', err);
      });
    };
  }, []);

  // ── stopSpeech ──────────────────────────────────────────────────────────────
  //
  // Cancels the current utterance and clears the speech queue.
  // Speech.stop() returns a Promise but we discard it — fire-and-forget.
  const stopSpeech = useCallback((): void => {
    Speech.stop().catch((err: unknown) => {
      console.warn('[useTTS] Speech.stop() failed:', err);
    });
  }, []);

  // ── announceDone ────────────────────────────────────────────────────────────

  const announceDone = useCallback((): void => {
    Speech.speak('Session complete');
  }, []);

  // ── announceCountdown ───────────────────────────────────────────────────────
  //
  // Only fires for the last 3 seconds of a timed step.
  // Speaking the raw number string ("3", "2", "1") produces the cleanest audio.

  const announceCountdown = useCallback((secondsLeft: number): void => {
    if (secondsLeft === 3 || secondsLeft === 2 || secondsLeft === 1) {
      Speech.speak(String(secondsLeft));
    }
  }, []);

  // ── announceStep ────────────────────────────────────────────────────────────
  //
  // Builds the announcement text based on stepKind, then fires Speech.speak().
  // Never awaited — the TTS engine queues and plays asynchronously.
  //
  // Branch map (analogous to a C++ switch on an enum class discriminant):
  //   work | warmup-work | cooldown-work | stretch  → announceCurrentEx
  //   rest | between                                 → announceNextEx (rest variant)
  //   warmup-delay | cooldown-delay                  → announceNextEx (delay variant)

  const announceStep = useCallback((index: number, allSteps: ExecutionStep[]): void => {
    const step = allSteps[index];
    if (step === undefined) {
      return;
    }

    const { stepKind } = step;

    // ── announceCurrentEx branch ──────────────────────────────────────────────
    if (
      stepKind === 'work' ||
      stepKind === 'warmup-work' ||
      stepKind === 'cooldown-work' ||
      stepKind === 'stretch'
    ) {
      // Construct the full name, appending side for bilateral steps.
      const name: string = step.side !== null
        ? `${step.label} ${step.side}`
        : step.label;

      let text: string;
      if (step.durationSec !== null) {
        text = `${name}, ${step.durationSec} seconds`;
      } else if (step.reps !== null) {
        text = `${name}, ${step.reps} reps`;
      } else {
        text = name;
      }

      Speech.speak(text);
      return;
    }

    // ── announceNextEx branch — rest / between ────────────────────────────────
    if (stepKind === 'rest' || stepKind === 'between') {
      const nextStep: ExecutionStep | undefined = allSteps[index + 1];

      if (nextStep === undefined) {
        Speech.speak('Session complete');
        return;
      }

      const nextName: string = nextStep.side !== null
        ? `${nextStep.label} ${nextStep.side}`
        : nextStep.label;

      // durationSec on a rest/between step is the rest duration.
      const restSec: number = step.durationSec ?? 0;
      Speech.speak(`Rest ${restSec} sec, prepare for ${nextName}`);
      return;
    }

    // ── announceNextEx branch — warmup-delay / cooldown-delay ─────────────────
    if (stepKind === 'warmup-delay' || stepKind === 'cooldown-delay') {
      const nextStep: ExecutionStep | undefined = allSteps[index + 1];

      if (nextStep === undefined) {
        // Edge case: delay is the last step (should not happen per buildStepSequence
        // logic, but guard anyway to avoid an incorrect announcement).
        return;
      }

      const nextName: string = nextStep.side !== null
        ? `${nextStep.label} ${nextStep.side}`
        : nextStep.label;

      Speech.speak(`Prepare for ${nextName}`);
      return;
    }

    // Exhaustive guard: if a new stepKind is ever added to ExecutionStepKind
    // without updating this function, the TypeScript compiler will NOT catch it
    // here because the switch is over a string union. The runtime will simply
    // fall through silently — which is acceptable (no TTS = no crash).
  }, []);

  return {
    announceStep,
    announceDone,
    stopSpeech,
    announceCountdown,
  };
}

// src/session/interruptedSessionStore.ts
//
// Persists interrupted session state to expo-secure-store.
// Used for two recovery scenarios:
//   1. Foreground/background detection: app resumes after backgrounding.
//   2. OS-kill recovery: app is killed mid-session; on next launch, home screen
//      detects the saved state and navigates directly to the session screen,
//      which then restores from this record.
//
// This is ephemeral crash-recovery data, not permanent app data.
// It is cleared on intentional exit (End Session, session complete, foreground return).
//
// Think of this like a volatile checkpoint in a C++ game save system —
// it's overwritten on every state change and deleted when the user exits cleanly.

import * as SecureStore from 'expo-secure-store';

// Key used in expo-secure-store. The "_v1" suffix allows future schema migrations:
// if the schema changes, bump the version so old data is treated as "no session".
const STORE_KEY = 'interrupted_session_v1';

// ─── Public interface ─────────────────────────────────────────────────────────

// The subset of session execution state that is sufficient to reconstruct the
// timer position on resume. DONE is deliberately excluded — a session that
// reached DONE exits cleanly and clears the store entry.
export interface InterruptedSessionState {
  sessionId: string;
  stepIndex: number;
  secondsLeft: number;
  // Only live execution states — not DONE.
  execState: 'RUNNING' | 'AUTO' | 'HOLD' | 'PAUSED' | 'REP';
  // Milliseconds from Date.now() at the moment of backgrounding.
  // Used to calculate elapsed time for timer correction on resume.
  backgroundedAt: number;
}

// ─── Storage functions ────────────────────────────────────────────────────────

/**
 * Persists the current session state to secure storage.
 * Called when the app transitions to background or inactive state.
 *
 * SecureStore.setItemAsync is async because the native Keychain/Keystore API
 * is asynchronous on both iOS and Android. The value must be a string, so we
 * JSON.stringify the state object.
 */
export async function saveInterruptedSession(
  state: InterruptedSessionState,
): Promise<void> {
  const serialized = JSON.stringify(state);
  await SecureStore.setItemAsync(STORE_KEY, serialized);
}

/**
 * Retrieves the saved interrupted session state.
 * Returns null if no session is saved or if the data is corrupt/unparseable.
 *
 * Returning null on parse error is intentional — corrupt data should be
 * treated as "no session" rather than crashing. Analogous to a C++ try/catch
 * around deserialization that returns std::nullopt on failure.
 */
export async function getInterruptedSession(): Promise<InterruptedSessionState | null> {
  const serialized = await SecureStore.getItemAsync(STORE_KEY);
  if (serialized === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    // Type guard: ensure the parsed object has the required fields.
    // This protects against schema version mismatches on app update.
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'sessionId' in parsed &&
      'stepIndex' in parsed &&
      'secondsLeft' in parsed &&
      'execState' in parsed &&
      'backgroundedAt' in parsed
    ) {
      return parsed as InterruptedSessionState;
    }
    // Missing required fields — treat as no session.
    return null;
  } catch {
    // JSON.parse threw — the stored string is malformed. Treat as no session.
    return null;
  }
}

/**
 * Deletes the saved interrupted session state.
 * Called on:
 *   - Intentional End Session (user confirmed exit)
 *   - Session completes normally (reaches DONE state)
 *   - Foreground return (timer correction is applied; stale record no longer needed)
 *   - Mount restore (state has been applied; stale record no longer needed)
 *   - Unmount cleanup (belt-and-suspenders)
 */
export async function clearInterruptedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}

// ─── Test exports (accessible only in test environments) ─────────────────────
//
// The __testExports pattern gives Jest access to internal constants without
// polluting the public API. In C++ terms this is like a friend class for tests.
export const __testExports = {
  STORE_KEY,
};

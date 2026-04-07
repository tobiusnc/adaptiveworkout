// app/session/feedback.tsx
// Post-session feedback screen — Phase 10.
//
// Navigation contract:
//   • The session execution screen writes pendingFeedback to the store and then
//     calls router.replace('/session/feedback'). This screen reads that value on
//     mount. If pendingFeedback is null (direct navigation or dev hot-reload),
//     the screen immediately redirects to '/' — it cannot function without a
//     sessionId to attach the feedback record to.
//
//   • "Save & Done": persists a SessionFeedback record via store.saveFeedback(),
//     then navigates to '/'.
//   • "Skip": clears pendingFeedback without persisting, then navigates to '/'.
//
// Error handling:
//   saveFeedback() is async and can throw (storage failure). While saving, the
//   primary button is disabled and a spinner label is shown. If the call throws,
//   an inline error message is displayed so the user can retry or skip.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAppStore } from '../../src/store/useAppStore';
import { colors, spacing, typography } from '../../src/styles/tokens';

export default function FeedbackScreen(): React.JSX.Element {
  const router = useRouter();

  const pendingFeedback    = useAppStore((s) => s.pendingFeedback);
  const saveFeedback       = useAppStore((s) => s.saveFeedback);
  const setPendingFeedback = useAppStore((s) => s.setPendingFeedback);

  // Controlled text input state.
  const [commentText, setCommentText] = useState<string>('');

  // Async save state — mirrors a C++ "operation in flight" flag.
  const [isSaving, setIsSaving]   = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track whether the null-guard redirect has already fired. Without this ref
  // the useEffect could fire a second time on a re-render that happens between
  // the redirect call and the component unmounting.
  const hasRedirected = useRef<boolean>(false);

  // Null guard: if there is no pending feedback (e.g. the user navigated here
  // directly via URL or the state was cleared), send them home immediately.
  useEffect(() => {
    if (pendingFeedback === null && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [pendingFeedback, router]);

  // "Save & Done" handler.
  // Persists feedback then navigates home. Disables button and shows error
  // inline if the storage call throws.
  const handleSave = useCallback(async (): Promise<void> => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveFeedback(commentText.trim().length > 0 ? commentText.trim() : null);
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSaveError(message);
      setIsSaving(false);
    }
  }, [isSaving, commentText, saveFeedback, router]);

  // "Skip" handler.
  // Clears pendingFeedback without persisting anything and navigates home.
  const handleSkip = useCallback((): void => {
    setPendingFeedback(null);
    router.replace('/');
  }, [setPendingFeedback, router]);

  // While the null-guard redirect is pending, render nothing. The redirect
  // will fire in the next effect flush. Rendering an empty View avoids a flash
  // of the form UI on a screen the user should never reach directly.
  if (pendingFeedback === null) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.heading}>How was your session?</Text>

        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={5}
          placeholder="How did it feel? Anything to change?"
          placeholderTextColor={colors.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          editable={!isSaving}
          textAlignVertical="top"
        />

        {saveError !== null && (
          <Text style={styles.errorText}>{saveError}</Text>
        )}

        <TouchableOpacity
          style={[styles.buttonPrimary, isSaving && styles.buttonDisabled]}
          onPress={() => { void handleSave(); }}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonPrimaryText}>Save &amp; Done</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleSkip}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Text style={styles.buttonSecondaryText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  textInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.md,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    ...typography.subheading,
    color: colors.background,
  },
  buttonSecondary: {
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    ...typography.subheading,
    color: colors.textSecondary,
  },
});

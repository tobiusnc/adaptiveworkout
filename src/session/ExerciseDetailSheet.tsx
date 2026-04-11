// src/session/ExerciseDetailSheet.tsx
// Phase 11: bottom sheet showing exercise detail — name, equipment, target,
// form cues, and optional YouTube link.
//
// Lifecycle:
//   - Parent controls visibility via isOpen prop + bottomSheetRef.
//   - On open: parent has already called handlePause().
//   - On close (swipe-down or Close button): calls onClose(), which calls handleResume().
//
// The BottomSheet is always mounted in the tree but starts at index -1 (closed).
// The parent calls bottomSheetRef.current.snapToIndex(0) to open it and
// bottomSheetRef.current.close() to close it programmatically.
//
// @gorhom/bottom-sheet requires GestureHandlerRootView in the tree above it.
// That is guaranteed by app/_layout.tsx.

import React, { useCallback } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { colors, spacing, typography } from '../styles/tokens';
import type { Exercise } from '../types/index';
import type { ExecutionStep } from './buildStepSequence';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

// ─── YouTube deep link ────────────────────────────────────────────────────────
//
// iOS: YouTube app registers youtube:// as a custom URL scheme.
// Android: YouTube app registers youtube:// on most builds.
// Fall back to https:// if the app is not installed.
// Both Linking.canOpenURL and Linking.openURL are async — fire-and-forget is
// acceptable here because a failure to open a URL is non-fatal.

export async function openYouTubeSearch(searchQuery: string): Promise<void> {
  const encodedQuery = encodeURIComponent(searchQuery);
  const appUrl = `youtube://results?search_query=${encodedQuery}`;
  const webUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;

  let canOpenApp = false;
  try {
    canOpenApp = await Linking.canOpenURL(appUrl);
  } catch {
    // canOpenURL can throw on Android if the app is not installed.
    // Treat as false and fall through to the web URL.
    canOpenApp = false;
  }

  if (canOpenApp) {
    await Linking.openURL(appUrl);
  } else {
    await Linking.openURL(webUrl);
  }
}

// ─── Snap points ──────────────────────────────────────────────────────────────
//
// Defined as a module-level constant so the reference is stable across renders.
// Passing an inline array literal to BottomSheet would create a new reference
// on every render, causing unnecessary re-computations inside the library —
// analogous to allocating a temporary array on every function call in C++.

const SNAP_POINTS: ReadonlyArray<string> = ['50%', '85%'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseDetailSheetProps {
  // Forwarded ref so the parent can call .snapToIndex() / .close() imperatively.
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  // The exercise to display. Null means nothing to show — sheet should not open.
  exercise: Exercise | null;
  // The step whose reps/duration target we display (may be the next exercise step,
  // not necessarily the current one).
  targetStep: ExecutionStep | null;
  // Called when the sheet is dismissed (swipe-down or Close button).
  // Parent should call handleResume() inside this callback.
  onClose: () => void;
}

// ─── ExerciseDetailSheet ──────────────────────────────────────────────────────

export function ExerciseDetailSheet(props: ExerciseDetailSheetProps): React.JSX.Element {
  const { bottomSheetRef, exercise, targetStep, onClose } = props;

  // Called by the BottomSheet library when the sheet reaches index -1 (closed).
  // We use onChange rather than onClose because @gorhom/bottom-sheet v5's onClose
  // fires before the animation completes, whereas onChange fires when the sheet
  // settles at index -1. This prevents resuming the timer before the close
  // animation finishes.
  const handleSheetChange = useCallback(
    (index: number): void => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  // Close button handler — calls .close() on the ref, which triggers the
  // close animation, and the onChange callback fires when it settles at -1.
  const handleCloseButton = useCallback((): void => {
    bottomSheetRef.current?.close();
  }, [bottomSheetRef]);

  // YouTube button handler — fire-and-forget async call.
  const handleYouTubePress = useCallback((): void => {
    if (exercise?.youtubeSearchQuery == null) {
      return;
    }
    void openYouTubeSearch(exercise.youtubeSearchQuery);
  }, [exercise]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={SNAP_POINTS as string[]}
      enablePanDownToClose={true}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {exercise === null ? (
          // Should not render in practice since the parent guards the tap,
          // but we handle it defensively to satisfy TypeScript strict mode.
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercise detail available.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Exercise name ────────────────────────────────────── */}
            <Text style={styles.exerciseName}>{exercise.name}</Text>

            {/* ── Equipment ────────────────────────────────────────── */}
            {exercise.equipment.length > 0 && (
              <View style={styles.equipmentRow}>
                <Text style={styles.metaLabel}>Equipment</Text>
                <Text style={styles.metaValue}>{exercise.equipment}</Text>
              </View>
            )}

            {/* ── Target: reps or duration ─────────────────────────── */}
            {targetStep !== null && (
              <View style={styles.targetRow}>
                <Text style={styles.metaLabel}>Target</Text>
                <Text style={styles.metaValue}>
                  {targetStep.durationSec !== null
                    ? formatSeconds(targetStep.durationSec)
                    : targetStep.reps !== null
                    ? `${targetStep.reps} ${exercise.isBilateral ? 'reps each side' : 'reps'}`
                    : '—'}
                  {targetStep.side !== null ? ` (${targetStep.side} side)` : ''}
                </Text>
              </View>
            )}

            {/* ── Form cues ─────────────────────────────────────────── */}
            {exercise.formCues.length > 0 && (
              <View style={styles.formCuesSection}>
                <Text style={styles.sectionHeading}>Form Cues</Text>
                {exercise.formCues.map((cue, cueIndex) => (
                  <View key={`cue-${cueIndex}`} style={styles.cueRow}>
                    <Text style={styles.cueBullet}>{'\u2022'}</Text>
                    <Text style={styles.cueText}>{cue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── YouTube button ────────────────────────────────────── */}
            {exercise.youtubeSearchQuery !== null && (
              <TouchableOpacity
                style={styles.youtubeButton}
                onPress={handleYouTubePress}
                activeOpacity={0.8}
              >
                <Text style={styles.youtubeButtonText}>Watch on YouTube</Text>
              </TouchableOpacity>
            )}

            {/* ── Close button ──────────────────────────────────────── */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseButton}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // Shadow for iOS (elevation handles Android).
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  // ── Exercise name ──────────────────────────────────────────────────────────
  exerciseName: {
    ...typography.heading,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // ── Metadata rows (equipment, target) ─────────────────────────────────────
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  metaLabel: {
    ...typography.label,
    color: colors.textSecondary,
    width: 80,
    textTransform: 'uppercase' as const,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },

  // ── Form cues section ──────────────────────────────────────────────────────
  formCuesSection: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    marginBottom: spacing.sm,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cueBullet: {
    ...typography.body,
    color: colors.primary,
    marginRight: spacing.sm,
    lineHeight: 22,
  },
  cueText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },

  // ── YouTube button ─────────────────────────────────────────────────────────
  youtubeButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  youtubeButtonText: {
    ...typography.subheading,
    color: '#FFFFFF',
  },

  // ── Close button ───────────────────────────────────────────────────────────
  closeButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  closeButtonText: {
    ...typography.subheading,
    color: colors.text,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

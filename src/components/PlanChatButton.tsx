// src/components/PlanChatButton.tsx
// FAB-style button that opens the plan-chat screen.
// Renders only when activePlan is non-null.
// Positioned absolutely in the bottom-right corner of whatever container
// it is placed in — the parent must have position: relative (or flex layout)
// and sufficient height for the button to be visible.

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../styles/tokens';

export default function PlanChatButton(): React.JSX.Element | null {
  const router = useRouter();
  const activePlan = useAppStore((s) => s.activePlan);

  // Guard: do not render when there is no active plan.
  // Returning null from a functional component is the React equivalent of
  // a no-op render — no DOM/view node is created.
  if (activePlan === null) {
    return null;
  }

  function handlePress(): void {
    router.push('/plan-chat');
  }

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel="Modify plan"
      accessibilityRole="button"
    >
      {/* Unicode pencil character U+270E — no icon library required */}
      <Text style={styles.icon}>{'\u270E'}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for iOS — gives the FAB visual elevation above the list.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Elevation for Android — equivalent to iOS shadow for material-depth look.
    elevation: 4,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
    // lineHeight adjustment prevents the Unicode glyph from being clipped on
    // some Android fonts where the ascent exceeds the font size.
    lineHeight: 28,
  },
});

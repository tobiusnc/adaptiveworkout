// app/index.tsx
// Home screen — displays the active plan and its session list.
// No active plan → redirects to onboarding.
// Interrupted session found in secure-store → navigates directly to that session.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAppStore } from '../src/store/useAppStore';
import type { Session } from '../src/types/index';
import { colors, spacing, typography } from '../src/styles/tokens';
import { getInterruptedSession, clearInterruptedSession } from '../src/session/interruptedSessionStore';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const activePlan    = useAppStore((s) => s.activePlan);
  const planSessions  = useAppStore((s) => s.planSessions);
  const loadSessions  = useAppStore((s) => s.loadSessions);

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── OS-kill recovery: navigate back to interrupted session on app open ──────
  //
  // When the OS kills the app mid-session (low memory, user force-quit, etc.),
  // the session screen wrote its state to secure-store before the process died.
  // On the next app open, this effect detects that saved state and navigates
  // the user directly back to the session screen, which then restores from it.
  //
  // This runs once on mount. It does NOT depend on activePlan being loaded yet —
  // the navigation happens before loadSessions completes.
  //
  // Note: we use router.push (not replace) so the user can navigate back home
  // if they don't want to resume. The session screen's End Session flow will
  // clear the saved record when they intentionally exit.
  useEffect(() => {
    getInterruptedSession().then((saved) => {
      if (saved !== null) {
        Alert.alert(
          'Resume Session?',
          'You have an unfinished workout session.',
          [
            {
              text: 'End',
              style: 'destructive',
              onPress: () => { void clearInterruptedSession(); },
            },
            {
              text: 'Resume',
              onPress: () => { router.push(`/session/${saved.sessionId}`); },
            },
          ],
        );
      }
    }).catch(() => {
      // getInterruptedSession never throws (parse errors return null), but
      // secure-store can fail on first install / permission issues on some
      // Android devices. Silently ignore — the user simply sees the home screen.
    });
  // Empty dependency array: run once on mount only, like componentDidMount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activePlan === null) {
      router.replace('/onboarding');
      return;
    }

    setLoading(true);
    setError(null);

    loadSessions(activePlan.id)
      .then(() => { setLoading(false); })
      .catch((err: unknown) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [activePlan, router, loadSessions]);

  // activePlan is null — redirect in flight, render nothing
  if (activePlan === null) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{activePlan.name}</Text>
        <Text style={styles.planDescription}>{activePlan.description}</Text>
      </View>

      {loading && (
        <ActivityIndicator
          style={styles.loader}
          color={colors.primary}
        />
      )}

      {error !== null && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {!loading && error === null && (
        <FlatList
          data={planSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No sessions in this plan yet.</Text>}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => { router.push(`/session/${item.id}`); }}
            />
          )}
        />
      )}
    </View>
  );
}

// ── SessionCard ───────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: Session;
  onPress: () => void;
}

function SessionCard({ session, onPress }: SessionCardProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardName}>{session.name}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>{session.type}</Text>
        <Text style={styles.cardMetaDot}>·</Text>
        <Text style={styles.cardMetaText}>{session.estimatedDurationMinutes} min</Text>
        <Text style={styles.cardMetaDot}>·</Text>
        <Text style={styles.cardMetaText}>{session.rounds} rounds</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  planHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  planName: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    margin: spacing.md,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardName: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardMetaDot: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

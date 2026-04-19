// app/plan-chat.tsx
// Plan Chat screen — conversational interface for modifying the active plan.
//
// Data flow (analogous to a request/response loop in C++):
//   1. Mount: loadPlanChatData() fetches context record, recent feedback, exercises.
//   2. User types a message and taps Send.
//   3. Append user message to local conversation state.
//   4. Show typing indicator (ActivityIndicator in an AI bubble).
//   5. Call modifyPlan() with full conversation + plan data.
//   6. Replace typing indicator with:
//      - Clarification: AI text bubble
//      - Proposal: AI summary bubble + ProposalCard
//      - Error: user-friendly error bubble
//   7. ProposalCard "Apply Change" → applyModification() → router.replace('/')
//      ProposalCard "Don't Apply" → remove card, keep conversation going

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';

import { useAppStore } from '../src/store/useAppStore';
import { modifyPlan, ModifyPlanError } from '../src/ai/modifyPlan';
import type {
  ConversationMessage,
  Exercise,
  ExerciseChange,
  ModifyPlanOutput,
  PlanContextRecord,
  Session,
  SessionChange,
  SessionFeedback,
} from '../src/types/index';
import { logger } from '../src/utils/logger';
import { colors, spacing, typography } from '../src/styles/tokens';

// ── Thread item discriminated union ──────────────────────────────────────────
// Each entry in the visible chat thread is one of these shapes.
// This is the runtime representation — think of it as a tagged union in C++.

interface TextThreadItem {
  kind: 'text';
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TypingThreadItem {
  kind: 'typing';
  id: string;
}

interface ProposalThreadItem {
  kind: 'proposal';
  id: string;
  output: ModifyPlanOutput;
  conversation: ConversationMessage[];
}

type ThreadItem = TextThreadItem | TypingThreadItem | ProposalThreadItem;

// ── ProposalCard ──────────────────────────────────────────────────────────────

interface ProposalCardProps {
  output: ModifyPlanOutput;
  conversation: ConversationMessage[];
  planSessions: Session[];
  onApplied: () => void;
  onDismissed: () => void;
}

function ProposalCard({
  output,
  conversation,
  planSessions,
  onApplied,
  onDismissed,
}: ProposalCardProps): React.JSX.Element {
  const router = useRouter();
  const activePlan = useAppStore((s) => s.activePlan);
  const applyModification = useAppStore((s) => s.applyModification);

  const [applying, setApplying] = useState(false);

  async function handleApply(): Promise<void> {
    // activePlan is guaranteed non-null on this screen (see guard in PlanChatScreen).
    // TypeScript requires the null check because the store type allows null.
    if (activePlan === null) {
      return;
    }
    setApplying(true);
    try {
      await applyModification(activePlan.id, output, conversation);
      onApplied();
      router.replace('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Apply failed', `Could not apply the change: ${message}`);
    } finally {
      setApplying(false);
    }
  }

  function handleDismiss(): void {
    onDismissed();
  }

  // ── Diff rendering helpers ────────────────────────────────────────────────

  function renderPlanChanges(): React.JSX.Element | null {
    if (output.planChanges === null) {
      return null;
    }
    const changes = output.planChanges;
    const rows: React.JSX.Element[] = [];

    if (changes.name !== undefined) {
      rows.push(
        <Text key="name" style={styles.diffRow}>
          Name: {changes.name}
        </Text>,
      );
    }
    if (changes.description !== undefined) {
      rows.push(
        <Text key="desc" style={styles.diffRow}>
          Description: {changes.description}
        </Text>,
      );
    }
    if (changes.config !== undefined) {
      const cfg = changes.config;
      const cfgKeys = Object.keys(cfg) as (keyof typeof cfg)[];
      for (const key of cfgKeys) {
        rows.push(
          <Text key={key} style={styles.diffRow}>
            Config.{key}: {String(cfg[key])}
          </Text>,
        );
      }
    }

    if (rows.length === 0) {
      return null;
    }

    return (
      <View style={styles.diffSection}>
        <Text style={styles.diffSectionTitle}>Plan changes</Text>
        {rows}
      </View>
    );
  }

  function getSessionName(sessionId: string | null): string {
    if (sessionId === null) {
      return '(new session)';
    }
    const found = planSessions.find((s) => s.id === sessionId);
    return found !== undefined ? found.name : sessionId;
  }

  function renderExerciseChange(
    change: ExerciseChange,
    index: number,
  ): React.JSX.Element {
    if (change.action === 'remove') {
      return (
        <Text key={index} style={[styles.diffRow, styles.diffRemove]}>
          Remove exercise: {change.exerciseId ?? '(unknown)'}
        </Text>
      );
    }

    if (change.action === 'add') {
      const draft = change.exerciseDraft;
      const name = draft?.name ?? '(unnamed)';
      return (
        <Text key={index} style={[styles.diffRow, styles.diffAdd]}>
          Add exercise: {name}
        </Text>
      );
    }

    // action === 'update'
    const draft = change.exerciseDraft;
    if (draft === null) {
      return (
        <Text key={index} style={styles.diffRow}>
          Update exercise: {change.exerciseId ?? '(unknown)'}
        </Text>
      );
    }
    const changedFields = Object.entries(draft)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');
    return (
      <Text key={index} style={styles.diffRow}>
        Update exercise [{change.exerciseId ?? 'new'}]: {changedFields}
      </Text>
    );
  }

  function renderSessionChange(
    change: SessionChange,
    index: number,
  ): React.JSX.Element {
    const sessionName = getSessionName(change.sessionId);

    if (change.action === 'remove') {
      return (
        <View key={index} style={styles.sessionChangeCard}>
          <Text style={[styles.sessionChangeTitle, styles.diffRemove]}>
            Remove session: {sessionName}
          </Text>
        </View>
      );
    }

    if (change.action === 'add') {
      const draft = change.sessionDraft;
      const addedName = draft?.name ?? '(unnamed)';
      return (
        <View key={index} style={styles.sessionChangeCard}>
          <Text style={[styles.sessionChangeTitle, styles.diffAdd]}>
            Add session: {addedName}
          </Text>
          {change.exerciseChanges.map((ec, i) =>
            renderExerciseChange(ec, i),
          )}
        </View>
      );
    }

    // action === 'update'
    const draft = change.sessionDraft;
    const changedSessionFields =
      draft !== null
        ? Object.entries(draft)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(', ')
        : '';

    return (
      <View key={index} style={styles.sessionChangeCard}>
        <Text style={styles.sessionChangeTitle}>
          Update session: {sessionName}
        </Text>
        {changedSessionFields.length > 0 && (
          <Text style={styles.diffRow}>{changedSessionFields}</Text>
        )}
        {change.exerciseChanges.map((ec, i) =>
          renderExerciseChange(ec, i),
        )}
      </View>
    );
  }

  return (
    <View style={styles.proposalCard}>
      <Text style={styles.proposalTitle}>Proposed changes</Text>

      {renderPlanChanges()}

      {output.sessionChanges.length > 0 && (
        <View style={styles.diffSection}>
          <Text style={styles.diffSectionTitle}>Session changes</Text>
          {output.sessionChanges.map((sc, i) => renderSessionChange(sc, i))}
        </View>
      )}

      <View style={styles.proposalButtons}>
        <TouchableOpacity
          style={[styles.proposalButton, styles.proposalButtonPrimary]}
          onPress={() => { void handleApply(); }}
          disabled={applying}
          activeOpacity={0.7}
        >
          {applying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.proposalButtonPrimaryText}>Apply Change</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.proposalButton, styles.proposalButtonSecondary]}
          onPress={handleDismiss}
          disabled={applying}
          activeOpacity={0.7}
        >
          <Text style={styles.proposalButtonSecondaryText}>{"Don't Apply"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── PlanChatScreen ────────────────────────────────────────────────────────────

export default function PlanChatScreen(): React.JSX.Element {
  const headerHeight = useHeaderHeight();
  const activePlan = useAppStore((s) => s.activePlan);
  const planSessions = useAppStore((s) => s.planSessions);
  const loadPlanChatData = useAppStore((s) => s.loadPlanChatData);

  // ── Load state ───────────────────────────────────────────────────────────
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Loaded data ──────────────────────────────────────────────────────────
  const [contextRecord, setContextRecord] =
    useState<PlanContextRecord | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<SessionFeedback[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  // ── Conversation and thread state ────────────────────────────────────────
  // `conversation` holds the messages passed to the AI (role/content pairs).
  // `thread` holds the visible items rendered in the FlatList — a superset
  // of `conversation` because it also contains typing indicators and
  // ProposalCards (which are UI-only and never sent to the AI).
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [thread, setThread] = useState<ThreadItem[]>([]);

  // ── Input state ──────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [aiInFlight, setAiInFlight] = useState(false);

  // ── Scroll ref ───────────────────────────────────────────────────────────
  // FlatList ref used to scroll to the bottom when new items are appended.
  // In C++ terms: a non-owning pointer to the list widget, set by the ref callback.
  const listRef = useRef<FlatList<ThreadItem>>(null);

  // ── ID counter ───────────────────────────────────────────────────────────
  // Simple incrementing counter for stable list keys.
  // useRef persists the value across renders without causing re-renders,
  // analogous to a mutable member variable.
  const nextId = useRef(0);

  function makeId(): string {
    nextId.current += 1;
    return String(nextId.current);
  }

  // ── Load on mount ────────────────────────────────────────────────────────
  const loadData = useCallback((): void => {
    if (activePlan === null) {
      return;
    }
    setLoadingData(true);
    setLoadError(null);

    loadPlanChatData(activePlan.id)
      .then((data) => {
        setContextRecord(data.contextRecord);
        setRecentFeedback(data.recentFeedback);
        setAllExercises(data.allExercises);
        setLoadingData(false);

        // Hardcoded opening message — no AI call.
        const openingId = makeId();
        const openingItem: TextThreadItem = {
          kind: 'text',
          id: openingId,
          role: 'assistant',
          content: `I can help you modify your ${activePlan.name} plan. What would you like to change?`,
        };
        setThread([openingItem]);
      })
      .catch((err: unknown) => {
        setLoadingData(false);
        setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, [activePlan, loadPlanChatData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Scroll to bottom when thread changes ────────────────────────────────
  useEffect(() => {
    if (thread.length > 0) {
      // scrollToEnd fires after the next layout pass.
      // animated: true gives a smooth scroll that signals to the user that
      // new content has appeared — similar to calling ScrollTo on a list widget.
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [thread]);

  // ── Send message ─────────────────────────────────────────────────────────
  async function handleSend(): Promise<void> {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || aiInFlight || loadingData || activePlan === null) {
      return;
    }

    // 1. Append user message to conversation and thread.
    const userMessage: ConversationMessage = { role: 'user', content: trimmed };
    const nextConversation: ConversationMessage[] = [...conversation, userMessage];

    const userThreadItem: TextThreadItem = {
      kind: 'text',
      id: makeId(),
      role: 'user',
      content: trimmed,
    };

    // 2. Append typing indicator.
    const typingId = makeId();
    const typingItem: TypingThreadItem = { kind: 'typing', id: typingId };

    setConversation(nextConversation);
    setThread((prev) => [...prev, userThreadItem, typingItem]);
    setInputText('');
    setAiInFlight(true);

    try {
      // 3. Build empty context record placeholder if none was loaded.
      const effectiveContextRecord: PlanContextRecord =
        contextRecord ?? {
          id: '',
          schemaVersion: 1,
          planId: activePlan.id,
          content: '',
          updatedAt: new Date().toISOString(),
        };

      // 4. Call modifyPlan.
      const result = await modifyPlan({
        schemaVersion: 1,
        currentPlan: activePlan,
        currentSessions: planSessions,
        currentExercises: allExercises,
        contextRecord: effectiveContextRecord,
        recentFeedback,
        conversation: nextConversation,
      });

      if (result.type === 'clarification') {
        // 5a. Replace typing indicator with clarification text.
        const aiMessage: ConversationMessage = {
          role: 'assistant',
          content: result.message,
        };
        setConversation((prev) => [...prev, aiMessage]);

        const clarificationItem: TextThreadItem = {
          kind: 'text',
          id: makeId(),
          role: 'assistant',
          content: result.message,
        };
        setThread((prev) =>
          prev
            .filter((item) => item.id !== typingId)
            .concat(clarificationItem),
        );
      } else {
        // 5b. Replace typing indicator with summary text + ProposalCard.
        const summaryMessage: ConversationMessage = {
          role: 'assistant',
          content: result.output.summary,
        };
        setConversation((prev) => [...prev, summaryMessage]);

        const summaryItem: TextThreadItem = {
          kind: 'text',
          id: makeId(),
          role: 'assistant',
          content: result.output.summary,
        };
        const proposalItem: ProposalThreadItem = {
          kind: 'proposal',
          id: makeId(),
          output: result.output,
          // Snapshot the conversation at proposal time so the ProposalCard
          // passes the correct history to applyModification.
          conversation: [...nextConversation, summaryMessage],
        };
        setThread((prev) =>
          prev
            .filter((item) => item.id !== typingId)
            .concat([summaryItem, proposalItem]),
        );
      }
    } catch (err: unknown) {
      // Distinguish ModifyPlanError (all retries exhausted) from unexpected errors.
      // Both show the same user-facing message — we don't expose internal details.
      const isExpectedError = err instanceof ModifyPlanError;
      if (!isExpectedError) {
        // Unexpected error — log for debugging in development.
        logger.error('[PlanChatScreen] unexpected error in modifyPlan:', { err });
      }

      const errorItem: TextThreadItem = {
        kind: 'text',
        id: makeId(),
        role: 'assistant',
        content: "Sorry, I couldn't process that request. Please try again.",
      };
      setThread((prev) =>
        prev
          .filter((item) => item.id !== typingId)
          .concat(errorItem),
      );
    } finally {
      setAiInFlight(false);
    }
  }

  // ── ProposalCard callbacks ────────────────────────────────────────────────
  // Called by ProposalCard when the user taps "Apply Change" and navigation
  // has been triggered — nothing to do in the screen itself.
  function handleProposalApplied(): void {
    // Navigation is handled inside ProposalCard via router.replace('/').
    // This callback exists for future use (e.g., analytics).
  }

  // Called by ProposalCard when the user taps "Don't Apply".
  // Removes the ProposalCard from the thread but keeps the AI summary message.
  function handleProposalDismissed(proposalId: string): void {
    setThread((prev) => prev.filter((item) => item.id !== proposalId));
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderItem({ item }: { item: ThreadItem }): React.JSX.Element {
    if (item.kind === 'typing') {
      return (
        <View style={[styles.bubble, styles.bubbleAI]}>
          <ActivityIndicator color={colors.textSecondary} size="small" />
        </View>
      );
    }

    if (item.kind === 'proposal') {
      return (
        <ProposalCard
          output={item.output}
          conversation={item.conversation}
          planSessions={planSessions}
          onApplied={handleProposalApplied}
          onDismissed={() => { handleProposalDismissed(item.id); }}
        />
      );
    }

    // kind === 'text'
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubbleRow,
          isUser ? styles.bubbleRowUser : styles.bubbleRowAI,
        ]}
      >
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAI}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (activePlan === null) {
    // Should never happen — home screen redirects to onboarding if no plan.
    // Guard prevents a runtime crash if navigation state is inconsistent.
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>No active plan.</Text>
      </View>
    );
  }

  if (loadingData) {
    return (
      <>
        <Stack.Screen options={{ title: 'Modify Plan' }} />
        <View style={styles.centred}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </>
    );
  }

  if (loadError !== null) {
    return (
      <>
        <Stack.Screen options={{ title: 'Modify Plan' }} />
        <View style={styles.centred}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const sendDisabled = aiInFlight || loadingData || inputText.trim().length === 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Modify Plan' }} />
      {/*
        KeyboardAvoidingView lifts the input area above the soft keyboard.
        behavior='padding' is the correct value for iOS (adds padding to the
        bottom of the view equal to the keyboard height).
        On Android, the manifest already sets windowSoftInputMode="adjustResize"
        in most Expo projects, so 'height' or no behavior is typically fine —
        but using platform detection here is the safe cross-platform approach.
      */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={listRef}
          data={thread}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.threadContent}
          renderItem={renderItem}
          // onContentSizeChange fires after each layout update — scrolls to
          // bottom whenever thread grows, catching rapid additions.
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: true });
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your plan..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            editable={!aiInFlight && !loadingData}
            // Submit on hardware return key (optional UX improvement).
            // blurOnSubmit must be false for multiline to prevent keyboard dismiss.
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              sendDisabled ? styles.sendButtonDisabled : null,
            ]}
            onPress={() => { void handleSend(); }}
            disabled={sendDisabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sendButtonText,
                sendDisabled ? styles.sendButtonTextDisabled : null,
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Screen layout ──────────────────────────────────────────────────────────
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.label,
    color: '#FFFFFF',
  },

  // ── Thread ─────────────────────────────────────────────────────────────────
  threadContent: {
    padding: spacing.md,
    gap: spacing.sm,
    // paddingBottom gives breathing room above the input bar.
    paddingBottom: spacing.lg,
  },

  // ── Bubbles ────────────────────────────────────────────────────────────────
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleAI: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 2,
  },
  bubbleTextUser: {
    ...typography.body,
    color: '#FFFFFF',
  },
  bubbleTextAI: {
    ...typography.body,
    color: colors.text,
  },

  // ── Input row ──────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    ...typography.label,
    color: '#FFFFFF',
  },
  sendButtonTextDisabled: {
    color: colors.textSecondary,
  },

  // ── ProposalCard ────────────────────────────────────────────────────────────
  proposalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  proposalTitle: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  diffSection: {
    marginBottom: spacing.sm,
  },
  diffSectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  diffRow: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  diffAdd: {
    color: '#2E7D32',   // green — no token for success color yet
  },
  diffRemove: {
    color: colors.error,
  },
  sessionChangeCard: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm,
  },
  sessionChangeTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  proposalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  proposalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  proposalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  proposalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  proposalButtonPrimaryText: {
    ...typography.label,
    color: '#FFFFFF',
  },
  proposalButtonSecondaryText: {
    ...typography.label,
    color: colors.primary,
  },
});

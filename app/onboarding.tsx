// app/onboarding.tsx
// Full onboarding questionnaire — 7-step linear wizard.
//
// Steps 1–5: Structured (option buttons + free-form "Other / add detail" input).
//   Step 2 (equipment) is multi-select; all others are single-select.
//   Selecting an option clears the free-form text; typing clears the selected option(s).
// Steps 6–7: Free-form TextInput only (no option buttons).
// Step 7 is optional — Next/Finish is always enabled there.
//
// On completion:
//   1. Build UserProfile from collected answers.
//   2. saveProfile(profile) via Zustand store.
//   3. generatePlan(input) from src/ai/generatePlan.ts.
//   4. savePlanFromDraft(output) via Zustand store.
//   5. router.replace('/') — home screen renders with the new plan.
//   On error: show error message + Retry button that re-runs steps 2–5.

import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { generatePlan, GeneratePlanError } from '../src/ai/generatePlan';
import { useAppStore } from '../src/store/useAppStore';
import { colors, spacing, typography } from '../src/styles/tokens';
import { logger } from '../src/utils/logger';
import type {
  FitnessLevel,
  GeneratePlanInput,
  GeneratePlanOutput,
  PrimaryGoal,
  TargetDuration,
  UserProfile,
} from '../src/types/index';

// ── Step definitions (discriminated union) ────────────────────────────────────
//
// Analogous to std::variant<StructuredStep, FreeFormStep> — TypeScript will
// enforce exhaustive handling in switch statements on the `kind` discriminant.

interface StructuredStep {
  readonly kind: 'structured';
  readonly stepNumber: 1 | 2 | 3 | 4 | 5;
  readonly question: string;
  readonly options: readonly string[];
  readonly multiSelect: boolean;
}

interface FreeFormStep {
  readonly kind: 'freeform';
  readonly stepNumber: 6 | 7;
  readonly question: string;
  readonly placeholder: string;
  readonly optional: boolean;
}

type WizardStep = StructuredStep | FreeFormStep;

// STEP_DEFINITIONS is a fixed-length tuple indexed 0–6 (step numbers 1–7).
// Declaring it `as const` gives TypeScript the narrowest possible type so that
// option arrays stay `readonly string[]` rather than widening to `string[]`.
const STEP_DEFINITIONS: readonly [
  StructuredStep,
  StructuredStep,
  StructuredStep,
  StructuredStep,
  StructuredStep,
  FreeFormStep,
  FreeFormStep,
] = [
  {
    kind: 'structured',
    stepNumber: 1,
    question: 'What is your primary fitness goal?',
    options: [
      'General fitness',
      'Strength',
      'Muscle growth',
      'Weight loss',
      'Rehabilitation',
    ],
    multiSelect: false,
  },
  {
    kind: 'structured',
    stepNumber: 2,
    question: 'What equipment do you have access to?',
    options: [
      'TRX',
      'Resistance bands',
      'Curl bar',
      'Kettlebell',
      'Dumbbells',
      'Bodyweight only',
    ],
    multiSelect: true,
  },
  {
    kind: 'structured',
    stepNumber: 3,
    question: 'How many sessions per week?',
    options: ['2', '3', '4', '5'],
    multiSelect: false,
  },
  {
    kind: 'structured',
    stepNumber: 4,
    question: 'How long do you want each session to be?',
    options: ['20–30 min', '30–45 min', '45–60 min', '60+ min'],
    multiSelect: false,
  },
  {
    kind: 'structured',
    stepNumber: 5,
    question: 'What is your fitness level?',
    options: ['Beginner', 'Intermediate', 'Experienced'],
    multiSelect: false,
  },
  {
    kind: 'freeform',
    stepNumber: 6,
    question: 'Any injuries or movements to avoid?',
    placeholder: 'e.g. no overhead pressing, bad left knee',
    optional: false,
  },
  {
    kind: 'freeform',
    stepNumber: 7,
    question: 'Anything else before I design your plan?',
    placeholder: 'Equipment biases, training style preferences, etc.',
    optional: true,
  },
] as const;

const TOTAL_STEPS = 7;

// ── Per-step answer state ─────────────────────────────────────────────────────
//
// Each structured step carries one selectedOption (or null) and a freeText.
// Step 2 uses selectedOptions (string[]) instead of selectedOption.
// Free-form steps carry only freeText.

interface StructuredSingleAnswer {
  kind: 'structured_single';
  selectedOption: string | null;
  freeText: string;
}

interface StructuredMultiAnswer {
  kind: 'structured_multi';
  selectedOptions: string[];
  freeText: string;
}

interface FreeFormAnswer {
  kind: 'freeform';
  freeText: string;
}

type StepAnswer = StructuredSingleAnswer | StructuredMultiAnswer | FreeFormAnswer;

// Build initial answers for all 7 steps.
function buildInitialAnswers(): readonly [
  StructuredSingleAnswer,
  StructuredMultiAnswer,
  StructuredSingleAnswer,
  StructuredSingleAnswer,
  StructuredSingleAnswer,
  FreeFormAnswer,
  FreeFormAnswer,
] {
  return [
    { kind: 'structured_single', selectedOption: null, freeText: '' },
    { kind: 'structured_multi',  selectedOptions: [],  freeText: '' },
    { kind: 'structured_single', selectedOption: null, freeText: '' },
    { kind: 'structured_single', selectedOption: null, freeText: '' },
    { kind: 'structured_single', selectedOption: null, freeText: '' },
    { kind: 'freeform',          freeText: '' },
    { kind: 'freeform',          freeText: '' },
  ] as const;
}

// ── Answer-validity guard ─────────────────────────────────────────────────────
//
// Returns true when the current step has a valid answer (used to gate Next button).
// Step 7 is always valid (optional).

function isStepAnswered(answer: StepAnswer, stepDef: WizardStep): boolean {
  if (stepDef.kind === 'freeform' && stepDef.optional) {
    return true;
  }

  switch (answer.kind) {
    case 'structured_single':
      return answer.selectedOption !== null || answer.freeText.trim().length > 0;

    case 'structured_multi':
      return answer.selectedOptions.length > 0 || answer.freeText.trim().length > 0;

    case 'freeform':
      return answer.freeText.trim().length > 0;
  }
}

// ── Profile assembly ──────────────────────────────────────────────────────────
//
// Maps raw string answers to the typed values declared in src/types/index.ts.
// All mapping is explicit — no computed key access — so TypeScript can verify
// completeness at compile time.

function mapPrimaryGoal(raw: string): PrimaryGoal {
  switch (raw) {
    case 'General fitness': return 'general_fitness';
    case 'Strength':        return 'strength';
    case 'Muscle growth':   return 'hypertrophy';
    case 'Weight loss':     return 'weight_loss';
    case 'Rehabilitation':  return 'rehabilitation';
    // Fallback for free-form entry — closest match.
    default:                return 'general_fitness';
  }
}

function mapTargetDuration(raw: string): TargetDuration {
  switch (raw) {
    case '20–30 min': return '20-30';
    case '30–45 min': return '30-45';
    case '45–60 min': return '45-60';
    case '60+ min':   return '60+';
    // Fallback for free-form entry.
    default:          return '30-45';
  }
}

function mapFitnessLevel(raw: string): FitnessLevel {
  switch (raw) {
    case 'Beginner':     return 'beginner';
    case 'Intermediate': return 'intermediate';
    case 'Experienced':  return 'experienced';
    // Fallback for free-form entry.
    default:             return 'beginner';
  }
}

// Extracts the raw answer string from a StructuredSingleAnswer.
// selectedOption takes precedence over freeText because they are mutually exclusive
// in the UI; freeText is the fallback for the rare case where only text was entered.
function resolveStructuredSingle(answer: StructuredSingleAnswer): string {
  if (answer.selectedOption !== null) {
    return answer.selectedOption;
  }
  return answer.freeText.trim();
}

// Builds the equipment array from the multi-select step.
// Both selected options AND free-form text can coexist on step 2 (equipment).
// Free-form text is split on commas so users can type "TRX, pull-up bar" naturally.
function resolveEquipment(answer: StructuredMultiAnswer): string[] {
  const fromOptions: string[] = [...answer.selectedOptions];

  const freeText = answer.freeText.trim();
  if (freeText.length > 0) {
    const freeItems = freeText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    fromOptions.push(...freeItems);
  }

  return fromOptions;
}

// Resolves sessions-per-week from either a selected option or free-form text.
// Parses the numeric string. Falls back to 3 if parsing fails (parseInt returns NaN).
function resolveSessionsPerWeek(answer: StructuredSingleAnswer): number {
  const raw = resolveStructuredSingle(answer);
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 3 : parsed;
}

// Assembles the complete UserProfile from all 7 step answers.
// `profileId` is passed in to keep this function pure (no side effects).
// The caller generates the ID once so retries reuse the same UUID.
function assembleProfile(
  answers: readonly StepAnswer[],
  profileId: string,
): UserProfile {
  // TypeScript index access on a readonly StepAnswer[] returns StepAnswer.
  // We cast each answer to the specific kind we know it to be at that index.
  // The runtime shape is guaranteed by buildInitialAnswers().

  const step1 = answers[0] as StructuredSingleAnswer;
  const step2 = answers[1] as StructuredMultiAnswer;
  const step3 = answers[2] as StructuredSingleAnswer;
  const step4 = answers[3] as StructuredSingleAnswer;
  const step5 = answers[4] as StructuredSingleAnswer;
  const step6 = answers[5] as FreeFormAnswer;
  const step7 = answers[6] as FreeFormAnswer;

  const primaryGoalRaw  = resolveStructuredSingle(step1);
  const equipment       = resolveEquipment(step2);
  const sessionsPerWeek = resolveSessionsPerWeek(step3);
  const durationRaw     = resolveStructuredSingle(step4);
  const fitnessRaw      = resolveStructuredSingle(step5);
  const limitations     = step6.freeText.trim();
  const additionalRaw   = step7.freeText.trim();

  const profile: UserProfile = {
    id:                profileId,
    schemaVersion:     1,
    primaryGoal:       mapPrimaryGoal(primaryGoalRaw),
    equipment,
    sessionsPerWeek,
    targetDuration:    mapTargetDuration(durationRaw),
    fitnessLevel:      mapFitnessLevel(fitnessRaw),
    limitations,
    additionalContext: additionalRaw.length > 0 ? additionalRaw : null,

    // Future-use fields — not collected during MVP onboarding.
    age:             null,
    biologicalSex:   null,
    weightKg:        null,
    heightCm:        null,
    targetWeightKg:  null,
    dietaryNotes:    null,
    userId:          null,

    createdAt: new Date().toISOString(),
  };

  return profile;
}

// ── Screen component ──────────────────────────────────────────────────────────

export default function OnboardingScreen(): React.JSX.Element {
  const saveProfile     = useAppStore((s) => s.saveProfile);
  const savePlanFromDraft = useAppStore((s) => s.savePlanFromDraft);

  // currentStepIndex is 0-based internally; displayed as stepIndex + 1.
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // answers is a mutable copy of the initial answer tuple.
  // Using an array instead of individual useState calls keeps mutation logic
  // centralised — analogous to holding an array of structs in C++ rather than
  // parallel arrays of primitives.
  const [answers, setAnswers] = useState<StepAnswer[]>(
    () => [...buildInitialAnswers()],
  );

  const [isLoading, setIsLoading]   = useState<boolean>(false);
  const [errorText, setErrorText]   = useState<string | null>(null);

  // Holds the assembled profile across error/retry cycles so we can re-run
  // generation without re-assembling (re-assembly would re-call Crypto.randomUUID).
  const [frozenProfile, setFrozenProfile] = useState<UserProfile | null>(null);

  const currentStepDef    = STEP_DEFINITIONS[currentStepIndex];
  const currentAnswer     = answers[currentStepIndex];
  const isFirstStep       = currentStepIndex === 0;
  const isLastStep        = currentStepIndex === TOTAL_STEPS - 1;
  const canAdvance        = isStepAnswered(currentAnswer, currentStepDef);

  // ── Immutable answer updater ────────────────────────────────────────────────
  // Returns a new answers array with the entry at `index` replaced.
  // Mirrors std::vector copy semantics — the original state is never mutated.
  const replaceAnswer = useCallback(
    (index: number, next: StepAnswer): StepAnswer[] => {
      const copy = [...answers];
      copy[index] = next;
      return copy;
    },
    [answers],
  );

  // ── Option button press handlers ────────────────────────────────────────────

  const handleSingleOptionPress = useCallback(
    (option: string): void => {
      const current = answers[currentStepIndex];
      if (current.kind !== 'structured_single') {
        return;
      }
      // Tapping the already-selected option deselects it.
      const next: StructuredSingleAnswer = {
        kind: 'structured_single',
        selectedOption: current.selectedOption === option ? null : option,
        freeText: '', // selecting an option clears free-form text
      };
      setAnswers(replaceAnswer(currentStepIndex, next));
    },
    [answers, currentStepIndex, replaceAnswer],
  );

  const handleMultiOptionPress = useCallback(
    (option: string): void => {
      const current = answers[currentStepIndex];
      if (current.kind !== 'structured_multi') {
        return;
      }
      const alreadySelected = current.selectedOptions.includes(option);
      const nextSelected = alreadySelected
        ? current.selectedOptions.filter((o) => o !== option)
        : [...current.selectedOptions, option];

      const next: StructuredMultiAnswer = {
        kind:            'structured_multi',
        selectedOptions: nextSelected,
        // Selecting options does NOT clear free-form text on the multi-select step
        // because equipment multi-select + free-form can coexist (per spec).
        freeText:        current.freeText,
      };
      setAnswers(replaceAnswer(currentStepIndex, next));
    },
    [answers, currentStepIndex, replaceAnswer],
  );

  // ── Free-form text change handlers ─────────────────────────────────────────

  const handleStructuredSingleFreeText = useCallback(
    (text: string): void => {
      const current = answers[currentStepIndex];
      if (current.kind !== 'structured_single') {
        return;
      }
      const next: StructuredSingleAnswer = {
        kind:           'structured_single',
        selectedOption: null, // typing clears the selected option
        freeText:       text,
      };
      setAnswers(replaceAnswer(currentStepIndex, next));
    },
    [answers, currentStepIndex, replaceAnswer],
  );

  const handleStructuredMultiFreeText = useCallback(
    (text: string): void => {
      const current = answers[currentStepIndex];
      if (current.kind !== 'structured_multi') {
        return;
      }
      // Multi-select step: free-form text does NOT clear selected options —
      // both coexist so the user can add custom equipment on top of preset choices.
      const next: StructuredMultiAnswer = {
        kind:            'structured_multi',
        selectedOptions: current.selectedOptions,
        freeText:        text,
      };
      setAnswers(replaceAnswer(currentStepIndex, next));
    },
    [answers, currentStepIndex, replaceAnswer],
  );

  const handleFreeFormText = useCallback(
    (text: string): void => {
      const current = answers[currentStepIndex];
      if (current.kind !== 'freeform') {
        return;
      }
      const next: FreeFormAnswer = { kind: 'freeform', freeText: text };
      setAnswers(replaceAnswer(currentStepIndex, next));
    },
    [answers, currentStepIndex, replaceAnswer],
  );

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const handleBack = useCallback((): void => {
    if (isFirstStep || isLoading) {
      return;
    }
    setCurrentStepIndex((prev) => prev - 1);
  }, [isFirstStep, isLoading]);

  // ── Plan generation sequence ────────────────────────────────────────────────
  //
  // Extracted so both the initial finish and the Retry button call the same code.
  // `profile` is passed in rather than read from store state because the store
  // update is async and may not be reflected by the time generatePlan is called.

  const runGeneration = useCallback(
    async (profile: UserProfile): Promise<void> => {
      setIsLoading(true);
      setErrorText(null);

      try {
        // Step 2: persist the profile.
        await saveProfile(profile);

        // Step 3: call the AI layer.
        const input: GeneratePlanInput = {
          schemaVersion:  1,
          userProfile:    profile,
          recentFeedback: [],
        };
        const output: GeneratePlanOutput = await generatePlan(input);

        // Step 4: persist the plan, sessions, and exercises.
        await savePlanFromDraft(output);

        // Step 5: navigate home. router.replace prevents back-navigation to onboarding.
        router.replace('/');
      } catch (err) {
        // Log full error for debugging; show user-friendly message in UI.
        if (err instanceof GeneratePlanError) {
          logger.error('[OnboardingScreen] GeneratePlanError:', {
            message: err.message,
            cause: String(err.cause),
          });
        } else {
          logger.error('[OnboardingScreen] unexpected error during plan generation:', {
            error: String(err),
          });
        }
        setErrorText('Plan generation failed. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [saveProfile, savePlanFromDraft],
  );

  const handleNext = useCallback(async (): Promise<void> => {
    if (!canAdvance || isLoading) {
      return;
    }

    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    // Last step — assemble profile and start generation sequence.
    const profileId = Crypto.randomUUID();
    const profile   = assembleProfile(answers, profileId);

    // Freeze the profile so Retry can re-run without re-UUID-ing.
    setFrozenProfile(profile);

    await runGeneration(profile);
  }, [canAdvance, isLoading, isLastStep, answers, runGeneration]);

  const handleRetry = useCallback(async (): Promise<void> => {
    if (frozenProfile === null || isLoading) {
      return;
    }
    await runGeneration(frozenProfile);
  }, [frozenProfile, isLoading, runGeneration]);

  // ── Option button rendering ─────────────────────────────────────────────────

  const renderOptionButton = (option: string, index: number): React.JSX.Element => {
    const stepDef = currentStepDef;

    let isSelected = false;
    if (stepDef.kind === 'structured') {
      if (stepDef.multiSelect) {
        const ans = currentAnswer as StructuredMultiAnswer;
        isSelected = ans.selectedOptions.includes(option);
      } else {
        const ans = currentAnswer as StructuredSingleAnswer;
        isSelected = ans.selectedOption === option;
      }
    }

    const onPress = stepDef.kind === 'structured' && stepDef.multiSelect
      ? () => handleMultiOptionPress(option)
      : () => handleSingleOptionPress(option);

    return (
      <TouchableOpacity
        key={`option-${index}-${option}`}
        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
        onPress={onPress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: isLoading }}
      >
        <Text
          style={[
            styles.optionButtonText,
            isSelected && styles.optionButtonTextSelected,
          ]}
        >
          {option}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Structured step free-form input ────────────────────────────────────────

  const renderStructuredFreeText = (): React.JSX.Element => {
    const stepDef = currentStepDef;
    if (stepDef.kind !== 'structured') {
      // This branch should never be reached — guard for TypeScript exhaustiveness.
      return <View />;
    }

    const isMulti = stepDef.multiSelect;
    const value   = isMulti
      ? (currentAnswer as StructuredMultiAnswer).freeText
      : (currentAnswer as StructuredSingleAnswer).freeText;

    const onChangeText = isMulti
      ? handleStructuredMultiFreeText
      : handleStructuredSingleFreeText;

    return (
      <TextInput
        style={styles.freeTextInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Other / add detail"
        placeholderTextColor={colors.textSecondary}
        multiline
        editable={!isLoading}
        accessibilityLabel="Other or add detail"
      />
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Step indicator */}
      <View style={styles.stepIndicatorRow}>
        <Text style={styles.stepIndicatorText}>
          Step {currentStepIndex + 1} of {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <Text style={styles.questionText}>{currentStepDef.question}</Text>

        {/* Option buttons (structured steps only) */}
        {currentStepDef.kind === 'structured' && (
          <>
            <View style={styles.optionsContainer}>
              {currentStepDef.options.map((option, index) =>
                renderOptionButton(option, index),
              )}
            </View>

            {/* Free-form "Other / add detail" input */}
            {renderStructuredFreeText()}
          </>
        )}

        {/* Free-form TextInput (free-form steps only) */}
        {currentStepDef.kind === 'freeform' && (
          <TextInput
            style={styles.freeTextInputLarge}
            value={(currentAnswer as FreeFormAnswer).freeText}
            onChangeText={handleFreeFormText}
            placeholder={currentStepDef.placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            editable={!isLoading}
            accessibilityLabel={currentStepDef.question}
          />
        )}

        {/* Error message */}
        {errorText !== null && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorText}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              disabled={isLoading}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <ActivityIndicator
            style={styles.activityIndicator}
            size="large"
            color={colors.primary}
          />
        )}
      </ScrollView>

      {/* Navigation footer */}
      <View style={styles.footer}>
        {/* Back button — hidden on step 1 */}
        {!isFirstStep ? (
          <TouchableOpacity
            style={[styles.backButton, isLoading && styles.buttonDisabled]}
            onPress={handleBack}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={[styles.backButtonText, isLoading && styles.buttonTextDisabled]}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          // Render an invisible placeholder to keep the Next button right-aligned.
          <View style={styles.backButtonPlaceholder} />
        )}

        {/* Next / Generate my plan button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!canAdvance || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canAdvance || isLoading}
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? 'Generate my plan' : 'Next'}
        >
          <Text
            style={[
              styles.nextButtonText,
              (!canAdvance || isLoading) && styles.buttonTextDisabled,
            ]}
          >
            {isLastStep ? 'Generate my plan' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
//
// All values reference design tokens — no hardcoded literals.

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },

  // Step indicator
  stepIndicatorRow: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.lg,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIndicatorText: {
    ...typography.label,
    color: colors.textSecondary,
  },

  // Scrollable content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding:       spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Question
  questionText: {
    ...typography.heading,
    color:        colors.text,
    marginBottom: spacing.lg,
  },

  // Option buttons
  optionsContainer: {
    marginBottom: spacing.md,
  },
  optionButton: {
    borderWidth:   1,
    borderColor:   colors.border,
    borderRadius:  spacing.sm,
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom:  spacing.sm,
    backgroundColor: colors.surface,
  },
  optionButtonSelected: {
    borderColor:     colors.primary,
    backgroundColor: colors.primary,
  },
  optionButtonText: {
    ...typography.body,
    color: colors.text,
  },
  optionButtonTextSelected: {
    color:      colors.background,
    fontWeight: '600',
  },

  // Free-form input below option buttons (structured steps)
  freeTextInput: {
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      spacing.sm,
    padding:           spacing.md,
    minHeight:         spacing.xl * 2, // ~64dp
    ...typography.body,
    color:             colors.text,
    backgroundColor:   colors.surface,
    textAlignVertical: 'top', // Android: align caret to top of multiline input
  },

  // Larger free-form input for steps 6 and 7 (no option buttons above)
  freeTextInputLarge: {
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      spacing.sm,
    padding:           spacing.md,
    minHeight:         spacing.xl * 4, // ~128dp — generous for mobile
    ...typography.body,
    color:             colors.text,
    backgroundColor:   colors.surface,
    textAlignVertical: 'top',
  },

  // Error state
  errorContainer: {
    marginTop:    spacing.lg,
    padding:      spacing.md,
    borderRadius: spacing.sm,
    borderWidth:  1,
    borderColor:  colors.error,
    backgroundColor: colors.surface,
  },
  errorText: {
    ...typography.body,
    color:        colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    alignSelf:         'flex-start',
    borderWidth:       1,
    borderColor:       colors.error,
    borderRadius:      spacing.sm,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
  },
  retryButtonText: {
    ...typography.label,
    color: colors.error,
  },

  // Activity indicator
  activityIndicator: {
    marginTop: spacing.lg,
  },

  // Footer navigation bar
  footer: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    backgroundColor:   colors.background,
  },

  // Back button
  backButton: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius:      spacing.sm,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  backButtonText: {
    ...typography.label,
    color: colors.text,
  },

  // Invisible placeholder when Back is hidden (keeps Next right-aligned)
  backButtonPlaceholder: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    // Same dimensions as backButton but transparent — no border.
  },

  // Next / Generate my plan button
  nextButton: {
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius:      spacing.sm,
    backgroundColor:   colors.primary,
  },
  nextButtonText: {
    ...typography.label,
    color: colors.background,
  },

  // Shared disabled overrides
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonTextDisabled: {
    // Colour override is not needed because opacity on the parent handles it,
    // but keeping this rule allows selective use if button background changes.
  },
});

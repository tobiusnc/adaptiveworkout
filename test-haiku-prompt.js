const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SYSTEM_PROMPT = `You are an extraction interpreter for a fitness app. Your only job is to read a user's message and update their structured User Context Record.

You do NOT generate workout plans. You do NOT suggest exercises. You do NOT respond conversationally.

# What you do
Read the rawInput carefully. Identify any clearly expressed preference signals, constraint updates, or profile changes. Update only the fields that are directly supported by the input. Return the full updatedContext record and an extractionSummary.

# What you never do
- Infer preferences that were not expressed
- Set a PreferenceLevel based on a single ambiguous word or phrase
- Interpret a plan modification request as a preference signal
- Remove entries from limitationsNotes or additionalDirections — those are append-only
- Add vague or unclear content to additionalDirections
- Change fields when the signal is uncertain — leave null rather than guess

# Output format
Return ONLY a JSON object (no prose) with: schemaVersion, updatedContext, extractionSummary

# Critical rules
1. Modification requests ("replace X", "add Y") are NOT preference signals — extract nothing unless there's an embedded preference.
2. No-signal case: if rawInput has only a modification request or vague comment, return currentContext unchanged. Set extractionSummary to: "No preference signals detected. [reason]"
3. PreferenceLevel: -2|-1|1|2|null. null = never expressed. Strong language (hate, way too) = ±2. Mild (prefer, bit) = ±1.
4. Single-session situational comments ("it was hard") do NOT trigger prefHigherIntensity alone.
5. Mild joint symptoms ("a bit achy, not terrible") warrant adding to jointLimitations BUT capture nuance in limitationsNotes.
6. additionalDirections and limitationsNotes are append-only — NEVER remove.
7. Ambiguous references ("less of that", "I don't know") = no signal.`;

const BASELINE = {
  id: 'ucr-test-001',
  schemaVersion: 1,
  userId: null,
  primaryGoal: 'general_fitness',
  equipment: [],
  sessionsPerWeek: 3,
  targetDuration: '30-45',
  fitnessLevel: 'beginner',
  jointLimitations: [],
  movementLimitations: [],
  limitationsNotes: [],
  preferredExercises: [],
  preferredMovements: [],
  preferredEquipment: [],
  dislikedExercises: [],
  dislikedMovements: [],
  prefHigherReps: null,
  prefLongerRest: null,
  prefMoreVariety: null,
  prefHigherIntensity: null,
  prefLongerSessions: null,
  prefMoreRounds: null,
  prefCompoundFocus: null,
  spaceConstraint: null,
  noiseConstraint: null,
  additionalDirections: [],
  updatedAt: '2026-04-18T10:00:00Z',
  updatedByModel: 'claude-haiku-4-5-20251001'
};

const T04_BASE = {
  ...BASELINE,
  fitnessLevel: 'intermediate',
  equipment: ['band','pullup'],
  movementLimitations: ['plyo'],
  noiseConstraint: 1,
  spaceConstraint: 2,
  additionalDirections: ['User wants to end every session with a short hip stretch.'],
  prefHigherIntensity: -2
};

const tests = [
  {
    name: 'T-05: Pure modification request (no signal)',
    input: {
      schemaVersion: 1,
      inputType: 'planChat',
      sessionContext: null,
      currentContext: T04_BASE,
      rawInput: 'Can you replace the lunges in Session B with something else?'
    },
    expectNoChange: true
  },
  {
    name: 'E-02: Ambiguous pronoun (no signal)',
    input: {
      schemaVersion: 1,
      inputType: 'planChat',
      sessionContext: null,
      currentContext: BASELINE,
      rawInput: 'Less of that.'
    },
    expectNoChange: true
  },
  {
    name: 'E-03: Vague intensity (no signal)',
    input: {
      schemaVersion: 1,
      inputType: 'feedback',
      sessionContext: 'Session A (completed)',
      currentContext: BASELINE,
      rawInput: 'It was a bit challenging today.'
    },
    expectNoChange: true
  },
  {
    name: 'T-04: Mild knee + positive exercise feedback',
    input: {
      schemaVersion: 1,
      inputType: 'feedback',
      sessionContext: 'Session B (completed)',
      currentContext: {
        ...T04_BASE,
        preferredExercises: [],
        jointLimitations: [],
        limitationsNotes: []
      },
      rawInput: 'Loved the band rows today, those felt great. Knee was a bit achy during the lunges though — not terrible but worth noting.'
    },
    expectKey: { preferredExercises: 'band rows', jointLimitations: 'knee', limitationsNotes: true }
  },
  {
    name: 'E-01: Safety valve - structural constraint',
    input: {
      schemaVersion: 1,
      inputType: 'planChat',
      sessionContext: null,
      currentContext: BASELINE,
      rawInput: 'I always like to have at least one pulling exercise per session. It\'s just something I need in every workout.'
    },
    expectKey: { preferredMovements: true, additionalDirections: true }
  }
];

(async () => {
  console.log('\n=== HAIKU CRITICAL TEST RESULTS ===\n');

  for (const test of tests) {
    console.log(`\nTEST: ${test.name}`);
    console.log(`INPUT: "${test.input.rawInput}"`);

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(test.input)
          }
        ]
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';
      let parsed;

      try {
        parsed = JSON.parse(output);
      } catch (e) {
        console.log('❌ JSON PARSE ERROR');
        console.log('Output:', output.substring(0, 300));
        continue;
      }

      if (test.expectNoChange) {
        const changed = JSON.stringify(parsed.updatedContext) !== JSON.stringify(test.input.currentContext);
        const verdict = changed ? '❌ FAIL (changed)' : '✓ PASS (unchanged)';
        console.log(`VERDICT: ${verdict}`);
        console.log(`SUMMARY: "${parsed.extractionSummary}"`);
        if (changed) {
          console.log('UNEXPECTED CHANGES:', {
            oldEquipment: test.input.currentContext.equipment,
            newEquipment: parsed.updatedContext.equipment,
            oldJoints: test.input.currentContext.jointLimitations,
            newJoints: parsed.updatedContext.jointLimitations
          });
        }
      } else if (test.expectKey) {
        const ctx = parsed.updatedContext;
        let pass = true;
        let details = {};

        if (test.expectKey.preferredExercises) {
          const has = ctx.preferredExercises?.includes('band rows');
          details.preferredExercises = has ? '✓' : '✗';
          pass = pass && has;
        }
        if (test.expectKey.jointLimitations) {
          const has = ctx.jointLimitations?.includes('knee');
          details.jointLimitations = has ? '✓' : '✗';
          pass = pass && has;
        }
        if (test.expectKey.limitationsNotes) {
          const has = ctx.limitationsNotes?.length > 0;
          details.limitationsNotes = has ? '✓' : '✗';
          pass = pass && has;
        }
        if (test.expectKey.preferredMovements) {
          const has = ctx.preferredMovements?.length > 0;
          details.preferredMovements = has ? '✓' : '✗';
          pass = pass && has;
        }
        if (test.expectKey.additionalDirections) {
          const has = ctx.additionalDirections?.length > 0;
          details.additionalDirections = has ? '✓' : '✗';
          pass = pass && has;
        }

        console.log(`VERDICT: ${pass ? '✓ PASS' : '❌ PARTIAL/FAIL'}`);
        console.log('DETAILS:', details);
        console.log(`SUMMARY: "${parsed.extractionSummary}"`);
      }
    } catch (e) {
      console.log(`❌ API ERROR: ${e.message}`);
    }
  }

  console.log('\n=== END RESULTS ===\n');
})();

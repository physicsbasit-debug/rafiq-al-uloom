import type { LessonRevisionPayload } from '@services/authoring';

export type { LessonRevisionPayload };

export interface CreatedRevision {
  status: 'created';
  revision: {
    id: string;
    entityId: string | null;
    revisionNumber: number;
    baseFingerprint: string | null;
  };
}

export type AuthoringRpcResult =
  | CreatedRevision
  | { status: 'saved'; revisionId: string }
  | { status: 'submitted'; revisionId: string }
  | { status: 'rejected_by_reviewer'; revisionId: string }
  | { status: 'approved'; revisionId: string; publishedEntityId: string }
  | { status: 'rejected'; reason: string };

export function buildLessonRevisionPayload(
  runId: string,
  displayOrder: number,
  title = `Phase 3-1 lesson ${runId}`
): LessonRevisionPayload {
  return {
    lesson: {
      unitId: 'g10-phy-waves-unit',
      title,
      displayOrder,
      summary: `Phase 3-1 summary ${runId}`,
      keyConcepts: [`concept-${runId}`],
      examples: [`example-${runId}`],
      misconceptions: [`misconception-${runId}`],
    },
    objectives: [
      {
        key: 'objective-a',
        text: `Objective A ${runId}`,
      },
      {
        key: 'objective-b',
        text: `Objective B ${runId}`,
      },
    ],
    questions: [
      {
        key: 'review-a',
        purpose: 'review',
        type: 'multiple_choice',
        prompt: `Review question ${runId}`,
        choices: ['A', 'B', 'C', 'D'],
        correctAnswerIndex: 1,
        explanation: `Review explanation ${runId}`,
        objectiveKey: 'objective-a',
        difficulty: 'easy',
      },
      {
        key: 'mastery-a',
        purpose: 'mastery',
        type: 'multiple_choice',
        prompt: `Mastery question ${runId}`,
        choices: ['A', 'B', 'C', 'D'],
        correctAnswerIndex: 2,
        explanation: `Mastery explanation ${runId}`,
        objectiveKey: 'objective-b',
        difficulty: 'medium',
      },
    ],
    games: [
      {
        key: 'game-a',
        type: 'matching',
        title: `Matching ${runId}`,
        instructions: 'Match each item.',
        items: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' },
        ],
        objectiveKeys: ['objective-a', 'objective-b'],
      },
    ],
    experiments: [
      {
        key: 'experiment-a',
        title: `Experiment ${runId}`,
        objective: `Observe ${runId}`,
        objectiveKeys: ['objective-a'],
        tools: ['tool'],
        steps: ['step one'],
        safetyNotes: ['stay safe'],
        safetyLevel: 'teacher_supervised',
        observationPrompt: 'What did you observe?',
        conclusionPrompt: 'What do you conclude?',
        homeAlternative: null,
      },
    ],
    simulations: [],
    inquiries: [],
    dataActivities: [],
  };
}

export function buildPhase55CompleteActivityPayload(
  runId: string,
  displayOrder: number,
  title = `Phase 5-5 lesson ${runId}`
): LessonRevisionPayload {
  const base = buildLessonRevisionPayload(runId, displayOrder, title);

  return {
    ...base,

    simulations: [
      {
        key: 'simulation-a',
        title: `Simulation ${runId}`,
        instructions: 'Change frequency and amplitude.',
        objectiveKeys: ['objective-a'],
        config: {
          engineKind: 'transverse_wave_v1',
          mediumSpeedMps: 12,
          frequencyHz: {
            min: 0.5,
            max: 4,
            step: 0.5,
            initial: 1,
          },
          amplitudeM: {
            min: 0.2,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        },
      },
    ],

    inquiries: [
      {
        key: 'inquiry-a',
        title: `Inquiry ${runId}`,
        instructions: 'Investigate the wave behavior.',
        objectiveKeys: ['objective-b'],
        context: `Wave inquiry context ${runId}`,
        drivingQuestion: 'What happens when the wave reaches the boundary?',
        hypothesisPrompt: 'Write your hypothesis.',
        observationPrompt: 'Record your observation.',
        conclusionPrompt: 'Write your conclusion.',
      },
    ],

    dataActivities: [
      {
        key: 'data-a',
        title: `Data Activity ${runId}`,
        instructions: 'Read the data and answer the task.',
        objectiveKeys: ['objective-a', 'objective-b'],
        config: {
          engineKind: 'data_graph_v1',
          context: `Wave data context ${runId}`,
          presentation: {
            mode: 'table_and_line_graph',
            xAxisLabel: 'Frequency (Hz)',
            yAxisLabel: 'Wavelength (m)',
          },
          dataset: {
            x: {
              label: 'Frequency',
              unit: 'Hz',
              values: [1, 2, 3],
            },
            series: [
              {
                id: 'wavelength',
                label: 'Wavelength',
                unit: 'm',
                values: [12, 6, 4],
              },
            ],
          },
          tasks: [
            {
              id: 'read-a',
              prompt: 'Read the second wavelength value.',
              unit: 'm',
              rule: {
                kind: 'read_value',
                seriesId: 'wavelength',
                pointIndex: 1,
              },
            },
          ],
        },
      },
    ],
  };
}

export function nextDisplayOrder(offset = 0): number {
  return 700_000_000 + Number(String(Date.now()).slice(-6)) * 100 + offset;
}

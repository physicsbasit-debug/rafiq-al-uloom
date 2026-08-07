export interface LessonRevisionPayload {
  lesson: {
    unitId: string;
    title: string;
    displayOrder: number;
    summary: string;
    keyConcepts: string[];
    examples: string[];
    misconceptions: string[];
  };
  objectives: Array<{
    key: string;
    text: string;
  }>;
  questions: Array<{
    key: string;
    purpose: 'review' | 'mastery';
    type: 'multiple_choice';
    prompt: string;
    choices: string[];
    correctAnswerIndex: number;
    explanation: string;
    objectiveKey: string;
    difficulty: string;
  }>;
  games: Array<{
    key: string;
    type: 'matching';
    title: string;
    instructions: string;
    items: Array<{ left: string; right: string }>;
    objectiveKeys: string[];
  }>;
  experiments: Array<{
    key: string;
    title: string;
    objective: string;
    tools: string[];
    steps: string[];
    safetyNotes: string[];
    safetyLevel: 'safe_home' | 'teacher_supervised' | 'lab_only' | 'not_allowed';
    observationPrompt: string;
    conclusionPrompt: string;
    homeAlternative: string | null;
  }>;
}

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
        tools: ['tool'],
        steps: ['step one'],
        safetyNotes: ['stay safe'],
        safetyLevel: 'teacher_supervised',
        observationPrompt: 'What did you observe?',
        conclusionPrompt: 'What do you conclude?',
        homeAlternative: null,
      },
    ],
  };
}

export function nextDisplayOrder(offset = 0): number {
  return 700_000_000 + Number(String(Date.now()).slice(-6)) * 100 + offset;
}

import type { LessonRevisionPayload } from '@services/authoring';

export type TeacherObjectiveDraft = LessonRevisionPayload['objectives'][number];
export type TeacherQuestionDraft = LessonRevisionPayload['questions'][number];

export interface ObjectiveOption {
  readonly key: string;
  readonly label: string;
}

export type ObjectiveDraftValidation =
  | { readonly valid: true; readonly text: string }
  | { readonly valid: false; readonly reason: 'empty_text' };

export type ObjectiveStateIssue = 'empty_key' | 'empty_text' | 'duplicate_key';

const TEACHER_OBJECTIVE_KEY_PREFIX = 'teacher-objective-';

export function validateObjectiveDraft(value: string): ObjectiveDraftValidation {
  const text = value.trim();
  if (!text) {
    return { valid: false, reason: 'empty_text' };
  }
  return { valid: true, text };
}

export function getObjectiveStateIssue(
  objectives: readonly TeacherObjectiveDraft[]
): ObjectiveStateIssue | null {
  const seen = new Set<string>();

  for (const objective of objectives) {
    const key = objective.key.trim();
    if (!key) return 'empty_key';
    if (!objective.text.trim()) return 'empty_text';
    if (seen.has(key)) return 'duplicate_key';
    seen.add(key);
  }

  return null;
}

export function createObjectiveKey(objectives: readonly TeacherObjectiveDraft[]): string {
  const used = new Set(objectives.map((objective) => objective.key.trim()).filter(Boolean));
  let highestAllocated = 0;

  for (const key of used) {
    if (!key.startsWith(TEACHER_OBJECTIVE_KEY_PREFIX)) continue;
    const suffix = key.slice(TEACHER_OBJECTIVE_KEY_PREFIX.length);
    if (!/^\d+$/.test(suffix)) continue;
    highestAllocated = Math.max(highestAllocated, Number(suffix));
  }

  let candidateNumber = highestAllocated + 1;
  let candidate = `${TEACHER_OBJECTIVE_KEY_PREFIX}${candidateNumber}`;

  while (used.has(candidate)) {
    candidateNumber += 1;
    candidate = `${TEACHER_OBJECTIVE_KEY_PREFIX}${candidateNumber}`;
  }

  return candidate;
}

export function isObjectiveReferenced(
  objectiveKey: string,
  questions: readonly TeacherQuestionDraft[]
): boolean {
  return questions.some((question) => question.objectiveKey === objectiveKey);
}

export function hasDanglingObjectiveReferences(
  objectives: readonly TeacherObjectiveDraft[],
  questions: readonly TeacherQuestionDraft[]
): boolean {
  const objectiveKeys = new Set(objectives.map((objective) => objective.key));
  return questions.some((question) => !objectiveKeys.has(question.objectiveKey));
}

export function getAvailableObjectiveOptions(
  objectives: readonly TeacherObjectiveDraft[]
): readonly ObjectiveOption[] {
  return objectives.map((objective) => ({
    key: objective.key,
    label: objective.text,
  }));
}

export function replaceObjectiveText(
  objectives: readonly TeacherObjectiveDraft[],
  objectiveKey: string,
  text: string
): readonly TeacherObjectiveDraft[] {
  return objectives.map((objective) =>
    objective.key === objectiveKey ? { ...objective, text } : objective
  );
}

export function removeObjectiveByKey(
  objectives: readonly TeacherObjectiveDraft[],
  objectiveKey: string
): readonly TeacherObjectiveDraft[] {
  return objectives.filter((objective) => objective.key !== objectiveKey);
}

export type TeacherQuestionPurpose = TeacherQuestionDraft['purpose'];
export type TeacherQuestionDifficulty = TeacherQuestionDraft['difficulty'];

export interface TeacherQuestionFormDraft {
  readonly purpose: TeacherQuestionPurpose;
  readonly prompt: TeacherQuestionDraft['prompt'];
  readonly choices: TeacherQuestionDraft['choices'];
  readonly correctAnswerIndex: TeacherQuestionDraft['correctAnswerIndex'] | null;
  readonly explanation: TeacherQuestionDraft['explanation'];
  readonly objectiveKey: TeacherQuestionDraft['objectiveKey'];
  readonly difficulty: TeacherQuestionDifficulty;
}

export type QuestionDraftValidationReason =
  | 'empty_prompt'
  | 'too_few_choices'
  | 'empty_choice'
  | 'missing_correct_answer'
  | 'correct_answer_out_of_range'
  | 'empty_explanation'
  | 'missing_objective'
  | 'objective_not_available'
  | 'invalid_purpose'
  | 'invalid_difficulty';

export type QuestionDraftValidation =
  | {
      readonly valid: true;
      readonly question: Omit<TeacherQuestionDraft, 'key' | 'type'>;
    }
  | { readonly valid: false; readonly reason: QuestionDraftValidationReason };

export type QuestionStateIssue =
  | 'empty_key'
  | 'duplicate_key'
  | 'invalid_purpose'
  | 'invalid_type'
  | 'empty_prompt'
  | 'too_few_choices'
  | 'empty_choice'
  | 'invalid_correct_answer'
  | 'empty_explanation'
  | 'missing_objective'
  | 'dangling_objective'
  | 'invalid_difficulty';

const TEACHER_QUESTION_KEY_PREFIX = 'teacher-question-';
const QUESTION_DIFFICULTIES: readonly TeacherQuestionDifficulty[] = ['easy', 'medium', 'hard'];

export function createQuestionKey(questions: readonly TeacherQuestionDraft[]): string {
  const used = new Set(questions.map((question) => question.key.trim()).filter(Boolean));
  let highestAllocated = 0;

  for (const key of used) {
    if (!key.startsWith(TEACHER_QUESTION_KEY_PREFIX)) continue;
    const suffix = key.slice(TEACHER_QUESTION_KEY_PREFIX.length);
    if (!/^\d+$/.test(suffix)) continue;
    highestAllocated = Math.max(highestAllocated, Number(suffix));
  }

  let candidateNumber = highestAllocated + 1;
  let candidate = `${TEACHER_QUESTION_KEY_PREFIX}${candidateNumber}`;

  while (used.has(candidate)) {
    candidateNumber += 1;
    candidate = `${TEACHER_QUESTION_KEY_PREFIX}${candidateNumber}`;
  }

  return candidate;
}

export function isObjectiveKeyAvailable(
  objectives: readonly TeacherObjectiveDraft[],
  objectiveKey: string
): boolean {
  return objectives.some((objective) => objective.key === objectiveKey);
}

export function validateQuestionDraft(
  draft: TeacherQuestionFormDraft,
  objectives: readonly TeacherObjectiveDraft[]
): QuestionDraftValidation {
  if (draft.purpose !== 'review' && draft.purpose !== 'mastery') {
    return { valid: false, reason: 'invalid_purpose' };
  }
  if (!QUESTION_DIFFICULTIES.includes(draft.difficulty)) {
    return { valid: false, reason: 'invalid_difficulty' };
  }

  const prompt = draft.prompt.trim();
  if (!prompt) return { valid: false, reason: 'empty_prompt' };

  if (draft.choices.length < 2) return { valid: false, reason: 'too_few_choices' };
  const choices = draft.choices.map((choice) => choice.trim());
  if (choices.some((choice) => !choice)) return { valid: false, reason: 'empty_choice' };

  if (draft.correctAnswerIndex === null) {
    return { valid: false, reason: 'missing_correct_answer' };
  }
  if (
    !Number.isInteger(draft.correctAnswerIndex) ||
    draft.correctAnswerIndex < 0 ||
    draft.correctAnswerIndex >= choices.length
  ) {
    return { valid: false, reason: 'correct_answer_out_of_range' };
  }

  const explanation = draft.explanation.trim();
  if (!explanation) return { valid: false, reason: 'empty_explanation' };

  const objectiveKey = draft.objectiveKey.trim();
  if (!objectiveKey) return { valid: false, reason: 'missing_objective' };
  if (!isObjectiveKeyAvailable(objectives, objectiveKey)) {
    return { valid: false, reason: 'objective_not_available' };
  }

  return {
    valid: true,
    question: {
      purpose: draft.purpose,
      prompt,
      choices,
      correctAnswerIndex: draft.correctAnswerIndex,
      explanation,
      objectiveKey,
      difficulty: draft.difficulty,
    },
  };
}

export function getQuestionStateIssue(
  questions: readonly TeacherQuestionDraft[],
  objectives: readonly TeacherObjectiveDraft[]
): QuestionStateIssue | null {
  const seen = new Set<string>();

  for (const question of questions) {
    const key = question.key.trim();
    if (!key) return 'empty_key';
    if (seen.has(key)) return 'duplicate_key';
    seen.add(key);

    if (question.purpose !== 'review' && question.purpose !== 'mastery') return 'invalid_purpose';
    if (question.type !== 'multiple_choice') return 'invalid_type';
    if (!question.prompt.trim()) return 'empty_prompt';
    if (question.choices.length < 2) return 'too_few_choices';
    if (question.choices.some((choice) => !choice.trim())) return 'empty_choice';
    if (
      !Number.isInteger(question.correctAnswerIndex) ||
      question.correctAnswerIndex < 0 ||
      question.correctAnswerIndex >= question.choices.length
    ) {
      return 'invalid_correct_answer';
    }
    if (!question.explanation.trim()) return 'empty_explanation';
    if (!question.objectiveKey.trim()) return 'missing_objective';
    if (!isObjectiveKeyAvailable(objectives, question.objectiveKey)) return 'dangling_objective';
    if (!QUESTION_DIFFICULTIES.includes(question.difficulty)) return 'invalid_difficulty';
  }

  return null;
}

export function replaceQuestion(
  questions: readonly TeacherQuestionDraft[],
  questionKey: string,
  replacement: TeacherQuestionDraft
): readonly TeacherQuestionDraft[] {
  return questions.map((question) => (question.key === questionKey ? replacement : question));
}

export function removeQuestionByKey(
  questions: readonly TeacherQuestionDraft[],
  questionKey: string
): readonly TeacherQuestionDraft[] {
  return questions.filter((question) => question.key !== questionKey);
}

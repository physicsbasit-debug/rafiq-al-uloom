import type { AiObjectiveSuggestion, AiQuestionSuggestion } from '@services/ai-authoring';

import {
  isObjectiveKeyAvailable,
  validateObjectiveDraft,
  validateQuestionDraft,
  type QuestionDraftValidationReason,
  type TeacherObjectiveDraft,
  type TeacherQuestionFormDraft,
  type TeacherQuestionPurpose,
} from './teacher-lesson-structure';

export type TeacherAiSnapshotValue =
  | null
  | boolean
  | number
  | string
  | readonly TeacherAiSnapshotValue[]
  | { readonly [key: string]: TeacherAiSnapshotValue };

function stableSerialize(value: TeacherAiSnapshotValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'bool:1' : 'bool:0';
  if (typeof value === 'number') return `num:${String(value)}`;
  if (typeof value === 'string') return `str:${JSON.stringify(value)}`;
  if (Array.isArray(value)) {
    return `arr:[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `obj:{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(',')}}`;
}

export function createAiDestinationSnapshot(value: TeacherAiSnapshotValue): string {
  return stableSerialize(value);
}

export function hasAiDestinationChanged(
  snapshot: string,
  currentValue: TeacherAiSnapshotValue
): boolean {
  return snapshot !== createAiDestinationSnapshot(currentValue);
}

export function createQuestionAiDestinationValue(
  form: TeacherQuestionFormDraft
): TeacherAiSnapshotValue {
  return {
    prompt: form.prompt,
    choices: [...form.choices],
    correctAnswerIndex: form.correctAnswerIndex,
    explanation: form.explanation,
    objectiveKey: form.objectiveKey,
    difficulty: form.difficulty,
  };
}

export type ObjectiveAiAcceptanceResult =
  | { readonly valid: true; readonly text: string }
  | { readonly valid: false; readonly reason: 'empty_text' };

export function acceptObjectiveAiSuggestion(
  suggestion: AiObjectiveSuggestion
): ObjectiveAiAcceptanceResult {
  return validateObjectiveDraft(suggestion.text);
}

export type QuestionAiAcceptanceResult =
  | { readonly valid: true; readonly form: TeacherQuestionFormDraft }
  | {
      readonly valid: false;
      readonly reason: 'objective_not_available' | QuestionDraftValidationReason;
    };

export function acceptQuestionAiSuggestion(
  suggestion: AiQuestionSuggestion,
  purpose: TeacherQuestionPurpose,
  objectives: readonly TeacherObjectiveDraft[]
): QuestionAiAcceptanceResult {
  if (!isObjectiveKeyAvailable(objectives, suggestion.objectiveKey)) {
    return { valid: false, reason: 'objective_not_available' };
  }

  const candidate: TeacherQuestionFormDraft = {
    purpose,
    prompt: suggestion.prompt,
    choices: [...suggestion.choices],
    correctAnswerIndex: suggestion.correctAnswerIndex,
    explanation: suggestion.explanation,
    objectiveKey: suggestion.objectiveKey,
    difficulty: suggestion.difficulty,
  };

  const validation = validateQuestionDraft(candidate, objectives);
  if (!validation.valid) {
    return { valid: false, reason: validation.reason };
  }

  return {
    valid: true,
    form: {
      purpose: validation.question.purpose,
      prompt: validation.question.prompt,
      choices: [...validation.question.choices],
      correctAnswerIndex: validation.question.correctAnswerIndex,
      explanation: validation.question.explanation,
      objectiveKey: validation.question.objectiveKey,
      difficulty: validation.question.difficulty,
    },
  };
}

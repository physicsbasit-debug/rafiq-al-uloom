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

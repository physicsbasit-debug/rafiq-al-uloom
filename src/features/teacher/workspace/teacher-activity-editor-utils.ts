import type { LessonRevisionPayload } from '@services/authoring';
import { parseSimulationConfig } from '@shared-types/simulation.types';

export type TeacherActivityKeyFamily =
  'game' | 'experiment' | 'simulation' | 'inquiry' | 'data-activity';

export function createTeacherActivityKey(
  family: TeacherActivityKeyFamily,
  existingKeys: readonly string[]
): string {
  const prefix = `teacher-${family}-`;
  const used = new Set(existingKeys.map((key) => key.trim()).filter(Boolean));

  let highestAllocated = 0;

  for (const key of used) {
    if (!key.startsWith(prefix)) continue;

    const suffix = key.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;

    highestAllocated = Math.max(highestAllocated, Number(suffix));
  }

  let candidateNumber = highestAllocated + 1;
  let candidate = `${prefix}${candidateNumber}`;

  while (used.has(candidate)) {
    candidateNumber += 1;
    candidate = `${prefix}${candidateNumber}`;
  }

  return candidate;
}

export function toggleObjectiveKey(
  objectiveKeys: readonly string[],
  objectiveKey: string
): readonly string[] {
  if (objectiveKeys.includes(objectiveKey)) {
    return objectiveKeys.filter((key) => key !== objectiveKey);
  }

  return [...objectiveKeys, objectiveKey];
}

export function linesToEditableArray(value: string): readonly string[] {
  return value.split('\n');
}

export function linesToTrimmedArray(value: string): readonly string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function trimmedArrayToLines(value: readonly string[]): string {
  return value.join('\n');
}

export function replaceByKey<T extends { readonly key: string }>(
  items: readonly T[],
  key: string,
  replacement: T
): readonly T[] {
  return items.map((item) => (item.key === key ? replacement : item));
}

export function removeByKey<T extends { readonly key: string }>(
  items: readonly T[],
  key: string
): readonly T[] {
  return items.filter((item) => item.key !== key);
}

export type MatchingGameDraft = LessonRevisionPayload['games'][number];

export type MatchingGameValidation =
  | {
      readonly valid: true;
      readonly game: Omit<MatchingGameDraft, 'key'>;
    }
  | {
      readonly valid: false;
      readonly reason: 'empty_title' | 'empty_instructions' | 'too_few_items' | 'empty_item';
    };

export function validateMatchingGameDraft(
  draft: Omit<MatchingGameDraft, 'key'>
): MatchingGameValidation {
  const title = draft.title.trim();
  if (!title) {
    return { valid: false, reason: 'empty_title' };
  }

  const instructions = draft.instructions.trim();
  if (!instructions) {
    return {
      valid: false,
      reason: 'empty_instructions',
    };
  }

  if (draft.items.length < 2) {
    return {
      valid: false,
      reason: 'too_few_items',
    };
  }

  const items = draft.items.map((item) => ({
    left: item.left.trim(),
    right: item.right.trim(),
  }));

  if (items.some((item) => !item.left || !item.right)) {
    return {
      valid: false,
      reason: 'empty_item',
    };
  }

  return {
    valid: true,
    game: {
      type: 'matching',
      title,
      instructions,
      items,
      objectiveKeys: [...draft.objectiveKeys],
    },
  };
}

export type ExperimentDraft = LessonRevisionPayload['experiments'][number];

export type ExperimentValidation =
  | {
      readonly valid: true;
      readonly experiment: Omit<ExperimentDraft, 'key'>;
    }
  | {
      readonly valid: false;
      readonly reason:
        | 'empty_title'
        | 'empty_objective'
        | 'missing_step'
        | 'empty_observation_prompt'
        | 'empty_conclusion_prompt';
    };

export function validateExperimentDraft(draft: Omit<ExperimentDraft, 'key'>): ExperimentValidation {
  const title = draft.title.trim();
  if (!title) {
    return { valid: false, reason: 'empty_title' };
  }

  const objective = draft.objective.trim();
  if (!objective) {
    return {
      valid: false,
      reason: 'empty_objective',
    };
  }

  const steps = draft.steps.map((step) => step.trim()).filter(Boolean);

  if (steps.length === 0) {
    return {
      valid: false,
      reason: 'missing_step',
    };
  }

  const observationPrompt = draft.observationPrompt.trim();

  if (!observationPrompt) {
    return {
      valid: false,
      reason: 'empty_observation_prompt',
    };
  }

  const conclusionPrompt = draft.conclusionPrompt.trim();

  if (!conclusionPrompt) {
    return {
      valid: false,
      reason: 'empty_conclusion_prompt',
    };
  }

  const homeAlternative =
    draft.homeAlternative === null ? null : draft.homeAlternative.trim() || null;

  return {
    valid: true,
    experiment: {
      title,
      objective,
      objectiveKeys: [...draft.objectiveKeys],
      tools: draft.tools.map((tool) => tool.trim()).filter(Boolean),
      steps,
      safetyNotes: draft.safetyNotes.map((note) => note.trim()).filter(Boolean),
      safetyLevel: draft.safetyLevel,
      observationPrompt,
      conclusionPrompt,
      homeAlternative,
    },
  };
}

export type SimulationDraft = LessonRevisionPayload['simulations'][number];

export type SimulationValidation =
  | {
      readonly valid: true;
      readonly simulation: Omit<SimulationDraft, 'key'>;
    }
  | {
      readonly valid: false;
      readonly reason: 'empty_title' | 'empty_instructions' | 'invalid_config';
    };

export function validateSimulationDraft(draft: Omit<SimulationDraft, 'key'>): SimulationValidation {
  const title = draft.title.trim();

  if (!title) {
    return {
      valid: false,
      reason: 'empty_title',
    };
  }

  const instructions = draft.instructions.trim();

  if (!instructions) {
    return {
      valid: false,
      reason: 'empty_instructions',
    };
  }

  try {
    const config = parseSimulationConfig(draft.config);

    return {
      valid: true,
      simulation: {
        title,
        instructions,
        objectiveKeys: [...draft.objectiveKeys],
        config,
      },
    };
  } catch {
    return {
      valid: false,
      reason: 'invalid_config',
    };
  }
}

export type InquiryDraft = LessonRevisionPayload['inquiries'][number];

export type InquiryValidation =
  | {
      readonly valid: true;
      readonly inquiry: Omit<InquiryDraft, 'key'>;
    }
  | {
      readonly valid: false;
      readonly reason:
        | 'empty_title'
        | 'empty_instructions'
        | 'empty_context'
        | 'empty_driving_question'
        | 'empty_hypothesis_prompt'
        | 'empty_observation_prompt'
        | 'empty_conclusion_prompt';
    };

export function validateInquiryDraft(draft: Omit<InquiryDraft, 'key'>): InquiryValidation {
  const title = draft.title.trim();

  if (!title) {
    return {
      valid: false,
      reason: 'empty_title',
    };
  }

  const instructions = draft.instructions.trim();

  if (!instructions) {
    return {
      valid: false,
      reason: 'empty_instructions',
    };
  }

  const context = draft.context.trim();

  if (!context) {
    return {
      valid: false,
      reason: 'empty_context',
    };
  }

  const drivingQuestion = draft.drivingQuestion.trim();

  if (!drivingQuestion) {
    return {
      valid: false,
      reason: 'empty_driving_question',
    };
  }

  const hypothesisPrompt = draft.hypothesisPrompt.trim();

  if (!hypothesisPrompt) {
    return {
      valid: false,
      reason: 'empty_hypothesis_prompt',
    };
  }

  const observationPrompt = draft.observationPrompt.trim();

  if (!observationPrompt) {
    return {
      valid: false,
      reason: 'empty_observation_prompt',
    };
  }

  const conclusionPrompt = draft.conclusionPrompt.trim();

  if (!conclusionPrompt) {
    return {
      valid: false,
      reason: 'empty_conclusion_prompt',
    };
  }

  return {
    valid: true,
    inquiry: {
      title,
      instructions,
      objectiveKeys: [...draft.objectiveKeys],
      context,
      drivingQuestion,
      hypothesisPrompt,
      observationPrompt,
      conclusionPrompt,
    },
  };
}

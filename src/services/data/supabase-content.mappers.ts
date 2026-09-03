import type {
  ContentSource,
  ContentStatus,
  Grade,
  Lesson,
  Objective,
  Semester,
  Subject,
  Unit,
} from '@shared-types/content.types';
import {
  assertScientificDataActivity,
  parseDataActivityConfig,
} from '@shared-types/data-activity.types';
import type { ScientificDataActivity } from '@shared-types/data-activity.types';
import type { Experiment, SafetyLevel } from '@shared-types/experiment.types';
import type { Game, GameType, MatchingItem } from '@shared-types/game.types';
import { assertInquiry } from '@shared-types/inquiry.types';
import type { Inquiry } from '@shared-types/inquiry.types';
import type { Difficulty, Question, QuestionType } from '@shared-types/quiz.types';
import { parseSimulationConfig } from '@shared-types/simulation.types';
import type { Simulation, SimulationEngineKind } from '@shared-types/simulation.types';

import type {
  DataActivityObjectiveRow,
  ExperimentObjectiveRow,
  GameObjectiveRow,
  InquiryObjectiveRow,
  SimulationObjectiveRow,
} from './supabase-content.rows';

const CONTENT_STATUSES = ['draft', 'pending_review', 'approved'] as const;
const CONTENT_SOURCES = ['ai_generated', 'teacher_authored', 'curriculum_seed'] as const;
const QUESTION_PURPOSES = ['review', 'mastery'] as const;
const QUESTION_TYPES = ['multiple_choice'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const GAME_TYPES = ['matching'] as const;
const SAFETY_LEVELS = ['safe_home', 'teacher_supervised', 'lab_only', 'not_allowed'] as const;
const SIMULATION_ENGINE_KINDS = ['transverse_wave_v1'] as const;
const DATA_ACTIVITY_ENGINE_KINDS = ['data_graph_v1'] as const;

function invalid(entity: string, id: string, detail: string): never {
  throw new Error(`Invalid ${entity} row "${id}": ${detail}`);
}

function asRecord(value: unknown, entity: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(entity, '<unknown>', 'expected an object');
  }

  return value as Record<string, unknown>;
}

function rowId(record: Record<string, unknown>): string {
  return typeof record.id === 'string' && record.id.length > 0 ? record.id : '<unknown>';
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  entity: string,
  id: string
): string {
  const value = record[key];
  if (typeof value !== 'string') {
    invalid(entity, id, `${key} must be a string`);
  }
  return value;
}

function requireNullableString(
  record: Record<string, unknown>,
  key: string,
  entity: string,
  id: string
): string | null {
  const value = record[key];
  if (value !== null && typeof value !== 'string') {
    invalid(entity, id, `${key} must be a string or null`);
  }
  return value;
}

function requireInteger(
  record: Record<string, unknown>,
  key: string,
  entity: string,
  id: string
): number {
  const value = record[key];
  if (!Number.isInteger(value)) {
    invalid(entity, id, `${key} must be an integer`);
  }
  return value as number;
}

function requireNonNegativeInteger(
  record: Record<string, unknown>,
  key: string,
  entity: string,
  id: string
): number {
  const value = requireInteger(record, key, entity, id);
  if (value < 0) {
    invalid(entity, id, `${key} must be non-negative`);
  }
  return value;
}

function requireStringArray(value: unknown, field: string, entity: string, id: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    invalid(entity, id, `${field} must be an array of strings`);
  }
  return [...value];
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  entity: string,
  id: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    invalid(entity, id, `${field} has unsupported value ${JSON.stringify(value)}`);
  }
  return value as T;
}

function requireObjectiveIds(value: unknown, entity: string, id: string): string[] {
  return requireStringArray(value, 'objectiveIds', entity, id);
}

function requireExperimentObjectiveIds(value: unknown, id: string): string[] {
  const objectiveIds = requireStringArray(value, 'objectiveIds', 'experiment', id);

  if (objectiveIds.length === 0) {
    invalid('experiment', id, 'objectiveIds must contain at least one objective');
  }

  if (objectiveIds.some((objectiveId) => objectiveId.length === 0)) {
    invalid('experiment', id, 'objectiveIds must not contain empty ids');
  }

  if (new Set(objectiveIds).size !== objectiveIds.length) {
    invalid('experiment', id, 'objectiveIds must not contain duplicates');
  }

  return objectiveIds;
}

function mapMatchingItems(value: unknown, gameId: string): MatchingItem[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid games.items for game "${gameId}": expected an array`);
  }

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Invalid games.items for game "${gameId}": item ${index} must be an object`);
    }

    const record = item as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length !== 2 || keys[0] !== 'left' || keys[1] !== 'right') {
      throw new Error(
        `Invalid games.items for game "${gameId}": item ${index} must contain only left and right`
      );
    }

    if (typeof record.left !== 'string' || typeof record.right !== 'string') {
      throw new Error(
        `Invalid games.items for game "${gameId}": item ${index} left and right must be strings`
      );
    }

    return { left: record.left, right: record.right };
  });
}

export function mapGradeRow(input: unknown): Grade {
  const row = asRecord(input, 'grade');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'grade', id),
    name: requireString(row, 'name', 'grade', id),
    order: requireInteger(row, 'display_order', 'grade', id),
  };
}

export function mapSemesterRow(input: unknown): Semester {
  const row = asRecord(input, 'semester');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'semester', id),
    gradeId: requireString(row, 'grade_id', 'semester', id),
    name: requireString(row, 'name', 'semester', id),
    order: requireInteger(row, 'display_order', 'semester', id),
  };
}

export function mapSubjectRow(input: unknown): Subject {
  const row = asRecord(input, 'subject');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'subject', id),
    gradeId: requireString(row, 'grade_id', 'subject', id),
    name: requireString(row, 'name', 'subject', id),
    themeColor: requireString(row, 'theme_color', 'subject', id),
  };
}

export function mapUnitRow(input: unknown): Unit {
  const row = asRecord(input, 'unit');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'unit', id),
    subjectId: requireString(row, 'subject_id', 'unit', id),
    semesterId: requireString(row, 'semester_id', 'unit', id),
    title: requireString(row, 'title', 'unit', id),
    order: requireInteger(row, 'display_order', 'unit', id),
  };
}

export function mapObjectiveRow(input: unknown): Objective {
  const row = asRecord(input, 'objective');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'objective', id),
    lessonId: requireString(row, 'lesson_id', 'objective', id),
    text: requireString(row, 'text', 'objective', id),
  };
}

export function mapLessonRow(input: unknown, objectiveIds: readonly string[]): Lesson {
  const row = asRecord(input, 'lesson');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'lesson', id),
    unitId: requireString(row, 'unit_id', 'lesson', id),
    title: requireString(row, 'title', 'lesson', id),
    order: requireInteger(row, 'display_order', 'lesson', id),
    objectiveIds: requireObjectiveIds(objectiveIds, 'lesson', id),
    summary: requireString(row, 'summary', 'lesson', id),
    keyConcepts: requireStringArray(row.key_concepts, 'key_concepts', 'lesson', id),
    examples: requireStringArray(row.examples, 'examples', 'lesson', id),
    misconceptions: requireStringArray(row.misconceptions, 'misconceptions', 'lesson', id),
    status: requireEnum(row.status, CONTENT_STATUSES, 'status', 'lesson', id) as ContentStatus,
    source: requireEnum(row.source, CONTENT_SOURCES, 'source', 'lesson', id) as ContentSource,
  };
}

export function mapQuestionRow(input: unknown): Question {
  const row = asRecord(input, 'question');
  const id = rowId(row);
  const choices = requireStringArray(row.choices, 'choices', 'question', id);
  const correctAnswerIndex = requireNonNegativeInteger(row, 'correct_answer_index', 'question', id);

  requireEnum(row.purpose, QUESTION_PURPOSES, 'purpose', 'question', id);

  if (correctAnswerIndex >= choices.length) {
    invalid('question', id, 'correct_answer_index must reference an existing choice');
  }

  return {
    id: requireString(row, 'id', 'question', id),
    lessonId: requireString(row, 'lesson_id', 'question', id),
    type: requireEnum(row.type, QUESTION_TYPES, 'type', 'question', id) as QuestionType,
    prompt: requireString(row, 'prompt', 'question', id),
    choices,
    correctAnswerIndex,
    explanation: requireString(row, 'explanation', 'question', id),
    objectiveId: requireString(row, 'objective_id', 'question', id),
    difficulty: requireEnum(
      row.difficulty,
      DIFFICULTIES,
      'difficulty',
      'question',
      id
    ) as Difficulty,
    status: requireEnum(row.status, CONTENT_STATUSES, 'status', 'question', id) as ContentStatus,
    source: requireEnum(row.source, CONTENT_SOURCES, 'source', 'question', id) as ContentSource,
  };
}

export function mapGameRow(input: unknown, objectiveIds: readonly string[]): Game {
  const row = asRecord(input, 'game');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'game', id),
    lessonId: requireString(row, 'lesson_id', 'game', id),
    type: requireEnum(row.type, GAME_TYPES, 'type', 'game', id) as GameType,
    title: requireString(row, 'title', 'game', id),
    instructions: requireString(row, 'instructions', 'game', id),
    items: mapMatchingItems(row.items, id),
    objectiveIds: requireObjectiveIds(objectiveIds, 'game', id),
    status: requireEnum(row.status, CONTENT_STATUSES, 'status', 'game', id) as ContentStatus,
    source: requireEnum(row.source, CONTENT_SOURCES, 'source', 'game', id) as ContentSource,
  };
}

export function mapExperimentRow(input: unknown, objectiveIds: readonly string[]): Experiment {
  const row = asRecord(input, 'experiment');
  const id = rowId(row);
  return {
    id: requireString(row, 'id', 'experiment', id),
    lessonId: requireString(row, 'lesson_id', 'experiment', id),
    title: requireString(row, 'title', 'experiment', id),
    objective: requireString(row, 'objective', 'experiment', id),
    objectiveIds: requireExperimentObjectiveIds(objectiveIds, id),
    tools: requireStringArray(row.tools, 'tools', 'experiment', id),
    steps: requireStringArray(row.steps, 'steps', 'experiment', id),
    safetyNotes: requireStringArray(row.safety_notes, 'safety_notes', 'experiment', id),
    safetyLevel: requireEnum(
      row.safety_level,
      SAFETY_LEVELS,
      'safety_level',
      'experiment',
      id
    ) as SafetyLevel,
    observationPrompt: requireString(row, 'observation_prompt', 'experiment', id),
    conclusionPrompt: requireString(row, 'conclusion_prompt', 'experiment', id),
    homeAlternative: requireNullableString(row, 'home_alternative', 'experiment', id),
    status: requireEnum(row.status, CONTENT_STATUSES, 'status', 'experiment', id) as ContentStatus,
    source: requireEnum(row.source, CONTENT_SOURCES, 'source', 'experiment', id) as ContentSource,
  };
}

export function mapExperimentObjectiveRow(input: unknown): ExperimentObjectiveRow {
  const row = asRecord(input, 'experiment_objective');
  const id = `${String(row.experiment_id ?? '<unknown>')}:${String(
    row.objective_id ?? '<unknown>'
  )}`;
  const experimentId = requireString(row, 'experiment_id', 'experiment_objective', id);
  const objectiveId = requireString(row, 'objective_id', 'experiment_objective', id);
  const lessonId = requireString(row, 'lesson_id', 'experiment_objective', id);

  if (experimentId.length === 0 || objectiveId.length === 0 || lessonId.length === 0) {
    invalid('experiment_objective', id, 'ids must be non-empty strings');
  }

  return {
    experiment_id: experimentId,
    objective_id: objectiveId,
    lesson_id: lessonId,
    position: requireNonNegativeInteger(row, 'position', 'experiment_objective', id),
  };
}

export function mapGameObjectiveRow(input: unknown): GameObjectiveRow {
  const row = asRecord(input, 'game_objective');
  const id = `${String(row.game_id ?? '<unknown>')}:${String(row.objective_id ?? '<unknown>')}`;
  return {
    game_id: requireString(row, 'game_id', 'game_objective', id),
    objective_id: requireString(row, 'objective_id', 'game_objective', id),
    position: requireNonNegativeInteger(row, 'position', 'game_objective', id),
  };
}

export function mapDataActivityRow(
  input: unknown,
  objectiveIds: readonly string[]
): ScientificDataActivity {
  const row = asRecord(input, 'data_activity');
  const id = rowId(row);
  const ids = requireStringArray(objectiveIds, 'objectiveIds', 'data_activity', id);

  const engineKind = requireEnum(
    row.engine_kind,
    DATA_ACTIVITY_ENGINE_KINDS,
    'engine_kind',
    'data_activity',
    id
  );
  const config = parseDataActivityConfig(row.config);
  if (config.engineKind !== engineKind) {
    invalid('data_activity', id, 'engine_kind must match config.engineKind');
  }

  return assertScientificDataActivity({
    id: requireString(row, 'id', 'data_activity', id),
    lessonId: requireString(row, 'lesson_id', 'data_activity', id),
    title: requireString(row, 'title', 'data_activity', id),
    instructions: requireString(row, 'instructions', 'data_activity', id),
    objectiveIds: ids,
    config,
    status: requireEnum(
      row.status,
      CONTENT_STATUSES,
      'status',
      'data_activity',
      id
    ) as ContentStatus,
    source: requireEnum(
      row.source,
      CONTENT_SOURCES,
      'source',
      'data_activity',
      id
    ) as ContentSource,
  });
}

export function mapDataActivityObjectiveRow(input: unknown): DataActivityObjectiveRow {
  const row = asRecord(input, 'data_activity_objective');
  const id = `${String(row.data_activity_id ?? '<unknown>')}:${String(
    row.objective_id ?? '<unknown>'
  )}`;
  const dataActivityId = requireString(
    row,
    'data_activity_id',
    'data_activity_objective',
    id
  );
  const objectiveId = requireString(row, 'objective_id', 'data_activity_objective', id);
  const lessonId = requireString(row, 'lesson_id', 'data_activity_objective', id);

  if (dataActivityId.length === 0 || objectiveId.length === 0 || lessonId.length === 0) {
    invalid('data_activity_objective', id, 'ids must be non-empty strings');
  }

  return {
    data_activity_id: dataActivityId,
    objective_id: objectiveId,
    lesson_id: lessonId,
    position: requireNonNegativeInteger(row, 'position', 'data_activity_objective', id),
  };
}

export function mapInquiryRow(input: unknown, objectiveIds: readonly string[]): Inquiry {
  const row = asRecord(input, 'inquiry');
  const id = rowId(row);

  return assertInquiry({
    id: requireString(row, 'id', 'inquiry', id),
    lessonId: requireString(row, 'lesson_id', 'inquiry', id),
    title: requireString(row, 'title', 'inquiry', id),
    instructions: requireString(row, 'instructions', 'inquiry', id),
    objectiveIds: requireStringArray(objectiveIds, 'objectiveIds', 'inquiry', id),
    context: requireString(row, 'context', 'inquiry', id),
    drivingQuestion: requireString(row, 'driving_question', 'inquiry', id),
    hypothesisPrompt: requireString(row, 'hypothesis_prompt', 'inquiry', id),
    observationPrompt: requireString(row, 'observation_prompt', 'inquiry', id),
    conclusionPrompt: requireString(row, 'conclusion_prompt', 'inquiry', id),
    status: requireEnum(row.status, CONTENT_STATUSES, 'status', 'inquiry', id) as ContentStatus,
    source: requireEnum(row.source, CONTENT_SOURCES, 'source', 'inquiry', id) as ContentSource,
  });
}

export function mapInquiryObjectiveRow(input: unknown): InquiryObjectiveRow {
  const row = asRecord(input, 'inquiry_objective');
  const id = `${String(row.inquiry_id ?? '<unknown>')}:${String(row.objective_id ?? '<unknown>')}`;

  const inquiryId = requireString(row, 'inquiry_id', 'inquiry_objective', id);
  const objectiveId = requireString(row, 'objective_id', 'inquiry_objective', id);
  const lessonId = requireString(row, 'lesson_id', 'inquiry_objective', id);

  if (inquiryId.length === 0 || objectiveId.length === 0 || lessonId.length === 0) {
    invalid('inquiry_objective', id, 'ids must be non-empty strings');
  }

  return {
    inquiry_id: inquiryId,
    objective_id: objectiveId,
    lesson_id: lessonId,
    position: requireNonNegativeInteger(row, 'position', 'inquiry_objective', id),
  };
}

export function mapSimulationRow(input: unknown, objectiveIds: readonly string[]): Simulation {
  const row = asRecord(input, 'simulation');
  const id = rowId(row);
  const ids = requireStringArray(objectiveIds, 'objectiveIds', 'simulation', id);

  if (ids.length === 0) {
    invalid('simulation', id, 'objectiveIds must contain at least one objective');
  }
  if (ids.some((objectiveId) => objectiveId.length === 0)) {
    invalid('simulation', id, 'objectiveIds must not contain empty ids');
  }
  if (new Set(ids).size !== ids.length) {
    invalid('simulation', id, 'objectiveIds must not contain duplicates');
  }

  const engineKind = requireEnum(
    row.engine_kind,
    SIMULATION_ENGINE_KINDS,
    'engine_kind',
    'simulation',
    id
  ) as SimulationEngineKind;
  const config = parseSimulationConfig(row.config);
  if (config.engineKind !== engineKind) {
    invalid('simulation', id, 'engine_kind must match config.engineKind');
  }

  return {
    id: requireString(row, 'id', 'simulation', id),
    lessonId: requireString(row, 'lesson_id', 'simulation', id),
    title: requireString(row, 'title', 'simulation', id),
    instructions: requireString(row, 'instructions', 'simulation', id),
    objectiveIds: ids,
    config,
    status: requireEnum(row.status, CONTENT_STATUSES, 'status', 'simulation', id) as ContentStatus,
    source: requireEnum(row.source, CONTENT_SOURCES, 'source', 'simulation', id) as ContentSource,
  };
}

export function mapSimulationObjectiveRow(input: unknown): SimulationObjectiveRow {
  const row = asRecord(input, 'simulation_objective');
  const id = `${String(row.simulation_id ?? '<unknown>')}:${String(
    row.objective_id ?? '<unknown>'
  )}`;
  const simulationId = requireString(row, 'simulation_id', 'simulation_objective', id);
  const objectiveId = requireString(row, 'objective_id', 'simulation_objective', id);
  const lessonId = requireString(row, 'lesson_id', 'simulation_objective', id);

  if (simulationId.length === 0 || objectiveId.length === 0 || lessonId.length === 0) {
    invalid('simulation_objective', id, 'ids must be non-empty strings');
  }

  return {
    simulation_id: simulationId,
    objective_id: objectiveId,
    lesson_id: lessonId,
    position: requireNonNegativeInteger(row, 'position', 'simulation_objective', id),
  };
}

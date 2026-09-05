import type { LessonRevisionPayload } from '@services/authoring';
import type { DataPresentationMode, NumericDataTask } from '@shared-types/data-activity.types';

import { type DataActivityDraft, validateDataActivityDraft } from './teacher-activity-editor-utils';

export interface TeacherDataSeriesForm {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly valuesText: string;
}

export type TeacherDataTaskKind = 'read_value' | 'difference' | 'mean';

export interface TeacherDataTaskForm {
  readonly id: string;
  readonly prompt: string;
  readonly unit: string;
  readonly toleranceText: string;
  readonly kind: TeacherDataTaskKind;
  readonly seriesId: string;

  readonly pointIndexText: string;

  readonly leftIndexText: string;
  readonly rightIndexText: string;
  readonly absolute: boolean;

  readonly pointIndicesText: string;
}

export interface TeacherDataActivityForm {
  readonly title: string;
  readonly instructions: string;
  readonly objectiveKeys: readonly string[];

  readonly context: string;

  readonly presentationMode: DataPresentationMode;
  readonly xAxisLabel: string;
  readonly yAxisLabel: string;

  readonly xLabel: string;
  readonly xUnit: string;
  readonly xValuesText: string;

  readonly series: readonly TeacherDataSeriesForm[];
  readonly tasks: readonly TeacherDataTaskForm[];
}

export type TeacherDataActivityFormBuildResult =
  | {
      readonly valid: true;
      readonly dataActivity: Omit<DataActivityDraft, 'key'>;
    }
  | {
      readonly valid: false;
      readonly reason:
        'invalid_numeric_input' | 'empty_title' | 'empty_instructions' | 'invalid_config';
    };

function nextNumericId(prefix: string, existingIds: readonly string[]): string {
  let highest = 0;

  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue;

    const suffix = id.slice(prefix.length);

    if (!/^\d+$/.test(suffix)) continue;

    highest = Math.max(highest, Number(suffix));
  }

  let next = highest + 1;
  let candidate = `${prefix}${next}`;

  while (existingIds.includes(candidate)) {
    next += 1;
    candidate = `${prefix}${next}`;
  }

  return candidate;
}

export function createTeacherDataSeriesForm(existingIds: readonly string[]): TeacherDataSeriesForm {
  return {
    id: nextNumericId('series-', existingIds),
    label: '',
    unit: '',
    valuesText: '',
  };
}

export function createTeacherDataTaskForm(
  kind: TeacherDataTaskKind,
  existingIds: readonly string[]
): TeacherDataTaskForm {
  return {
    id: nextNumericId('task-', existingIds),
    prompt: '',
    unit: '',
    toleranceText: '',
    kind,
    seriesId: '',
    pointIndexText: '',
    leftIndexText: '',
    rightIndexText: '',
    absolute: true,
    pointIndicesText: '',
  };
}

export function createEmptyTeacherDataActivityForm(): TeacherDataActivityForm {
  return {
    title: '',
    instructions: '',
    objectiveKeys: [],

    context: '',

    presentationMode: 'table_and_line_graph',
    xAxisLabel: '',
    yAxisLabel: '',

    xLabel: '',
    xUnit: '',
    xValuesText: '',

    series: [createTeacherDataSeriesForm([])],

    tasks: [createTeacherDataTaskForm('read_value', [])],
  };
}

function numbersToText(values: readonly number[]): string {
  return values.join('\n');
}

function indicesToText(values: readonly number[]): string {
  return values.join(', ');
}

function taskToForm(task: NumericDataTask): TeacherDataTaskForm {
  const base = {
    id: task.id,
    prompt: task.prompt,
    unit: task.unit,
    toleranceText: task.tolerance === undefined ? '' : String(task.tolerance),
    kind: task.rule.kind,
    seriesId: task.rule.seriesId,
    pointIndexText: '',
    leftIndexText: '',
    rightIndexText: '',
    absolute: true,
    pointIndicesText: '',
  };

  switch (task.rule.kind) {
    case 'read_value':
      return {
        ...base,
        kind: 'read_value',
        pointIndexText: String(task.rule.pointIndex),
      };

    case 'difference':
      return {
        ...base,
        kind: 'difference',
        leftIndexText: String(task.rule.leftIndex),
        rightIndexText: String(task.rule.rightIndex),
        absolute: task.rule.absolute,
      };

    case 'mean':
      return {
        ...base,
        kind: 'mean',
        pointIndicesText: indicesToText(task.rule.pointIndices),
      };
  }
}

export function teacherDataActivityFormFromDraft(
  activity: DataActivityDraft
): TeacherDataActivityForm {
  return {
    title: activity.title,
    instructions: activity.instructions,
    objectiveKeys: [...activity.objectiveKeys],

    context: activity.config.context,

    presentationMode: activity.config.presentation.mode,
    xAxisLabel: activity.config.presentation.xAxisLabel,
    yAxisLabel: activity.config.presentation.yAxisLabel,

    xLabel: activity.config.dataset.x.label,
    xUnit: activity.config.dataset.x.unit,
    xValuesText: numbersToText(activity.config.dataset.x.values),

    series: activity.config.dataset.series.map((series) => ({
      id: series.id,
      label: series.label,
      unit: series.unit,
      valuesText: numbersToText(series.values),
    })),

    tasks: activity.config.tasks.map(taskToForm),
  };
}

function tokens(value: string): readonly string[] {
  return value
    .split(/[\s,،]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFiniteNumber(value: string): number | null {
  const normalized = value.trim();

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseNumberList(value: string): number[] | null {
  const parts = tokens(value);

  if (parts.length === 0) {
    return null;
  }

  const result: number[] = [];

  for (const part of parts) {
    const parsed = parseFiniteNumber(part);

    if (parsed === null) {
      return null;
    }

    result.push(parsed);
  }

  return result;
}

function parseNonNegativeInteger(value: string): number | null {
  const parsed = parseFiniteNumber(value);

  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseIndexList(value: string): number[] | null {
  const parts = tokens(value);

  if (parts.length === 0) {
    return null;
  }

  const result: number[] = [];

  for (const part of parts) {
    const parsed = parseNonNegativeInteger(part);

    if (parsed === null) {
      return null;
    }

    result.push(parsed);
  }

  return result;
}

function buildTask(task: TeacherDataTaskForm): NumericDataTask | null {
  const toleranceText = task.toleranceText.trim();

  let tolerance: number | undefined;

  if (toleranceText) {
    const parsedTolerance = parseFiniteNumber(toleranceText);

    if (parsedTolerance === null) {
      return null;
    }

    tolerance = parsedTolerance;
  }

  const common = {
    id: task.id.trim(),
    prompt: task.prompt.trim(),
    unit: task.unit.trim(),
    ...(tolerance === undefined ? {} : { tolerance }),
  };

  switch (task.kind) {
    case 'read_value': {
      const pointIndex = parseNonNegativeInteger(task.pointIndexText);

      if (pointIndex === null) {
        return null;
      }

      return {
        ...common,
        rule: {
          kind: 'read_value',
          seriesId: task.seriesId.trim(),
          pointIndex,
        },
      };
    }

    case 'difference': {
      const leftIndex = parseNonNegativeInteger(task.leftIndexText);

      const rightIndex = parseNonNegativeInteger(task.rightIndexText);

      if (leftIndex === null || rightIndex === null) {
        return null;
      }

      return {
        ...common,
        rule: {
          kind: 'difference',
          seriesId: task.seriesId.trim(),
          leftIndex,
          rightIndex,
          absolute: task.absolute,
        },
      };
    }

    case 'mean': {
      const pointIndices = parseIndexList(task.pointIndicesText);

      if (pointIndices === null) {
        return null;
      }

      return {
        ...common,
        rule: {
          kind: 'mean',
          seriesId: task.seriesId.trim(),
          pointIndices,
        },
      };
    }
  }
}

export function buildTeacherDataActivityDraft(
  form: TeacherDataActivityForm
): TeacherDataActivityFormBuildResult {
  const xValues = parseNumberList(form.xValuesText);

  if (xValues === null) {
    return {
      valid: false,
      reason: 'invalid_numeric_input',
    };
  }

  const series = [];

  for (const item of form.series) {
    const values = parseNumberList(item.valuesText);

    if (values === null) {
      return {
        valid: false,
        reason: 'invalid_numeric_input',
      };
    }

    series.push({
      id: item.id.trim(),
      label: item.label.trim(),
      unit: item.unit.trim(),
      values,
    });
  }

  const tasks: NumericDataTask[] = [];

  for (const task of form.tasks) {
    const built = buildTask(task);

    if (built === null) {
      return {
        valid: false,
        reason: 'invalid_numeric_input',
      };
    }

    tasks.push(built);
  }

  const validation = validateDataActivityDraft({
    title: form.title,
    instructions: form.instructions,
    objectiveKeys: [...form.objectiveKeys],
    config: {
      engineKind: 'data_graph_v1',
      context: form.context.trim(),
      presentation: {
        mode: form.presentationMode,
        xAxisLabel: form.xAxisLabel.trim(),
        yAxisLabel: form.yAxisLabel.trim(),
      },
      dataset: {
        x: {
          label: form.xLabel.trim(),
          unit: form.xUnit.trim(),
          values: xValues,
        },
        series,
      },
      tasks,
    },
  });

  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    dataActivity: validation.dataActivity,
  };
}

export type TeacherDataActivityDraft = LessonRevisionPayload['dataActivities'][number];

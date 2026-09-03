import type { ContentSource, ContentStatus } from './content.types';

export type DataActivityEngineKind = 'data_graph_v1';

export type DataPresentationMode = 'table' | 'line_graph' | 'table_and_line_graph';

export interface NumericAxis {
  label: string;
  unit: string;
  values: number[];
}

export interface NumericSeries {
  id: string;
  label: string;
  unit: string;
  values: number[];
}

export interface NumericDataset {
  x: NumericAxis;
  series: NumericSeries[];
}

export interface DataPresentation {
  mode: DataPresentationMode;
  xAxisLabel: string;
  yAxisLabel: string;
}

export type NumericDataTaskRule =
  | {
      kind: 'read_value';
      seriesId: string;
      pointIndex: number;
    }
  | {
      kind: 'difference';
      seriesId: string;
      leftIndex: number;
      rightIndex: number;
      absolute: boolean;
    }
  | {
      kind: 'mean';
      seriesId: string;
      pointIndices: number[];
    };

export interface NumericDataTask {
  id: string;
  prompt: string;
  unit: string;
  tolerance?: number;
  rule: NumericDataTaskRule;
}

export interface DataActivityConfig {
  engineKind: 'data_graph_v1';
  context: string;
  presentation: DataPresentation;
  dataset: NumericDataset;
  tasks: NumericDataTask[];
}

export interface ScientificDataActivity {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  objectiveIds: string[];
  config: DataActivityConfig;
  status: ContentStatus;
  source: ContentSource;
}

function invalid(detail: string): never {
  throw new Error(`Invalid data activity config: ${detail}`);
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  field: string
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      invalid(`${field} contains unsupported key ${JSON.stringify(key)}`);
    }
  }
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    invalid(`${field} must be a string`);
  }
  return value;
}

function nonBlankString(value: unknown, field: string): string {
  const parsed = stringValue(value, field);
  if (!parsed.trim()) {
    invalid(`${field} must not be blank`);
  }
  return parsed;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(`${field} must be a finite number`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    invalid(`${field} must be a non-negative integer`);
  }
  return value;
}

function finiteNumberArray(value: unknown, field: string, requireNonEmpty = false): number[] {
  if (!Array.isArray(value)) {
    invalid(`${field} must be an array`);
  }
  if (requireNonEmpty && value.length === 0) {
    invalid(`${field} must not be empty`);
  }
  return value.map((item, index) => finiteNumber(item, `${field}[${index}]`));
}

function parseAxis(value: unknown): NumericAxis {
  const record = asRecord(value, 'dataset.x');
  exactKeys(record, ['label', 'unit', 'values'], 'dataset.x');

  const label = nonBlankString(record.label, 'dataset.x.label');
  const unit = stringValue(record.unit, 'dataset.x.unit');
  const values = finiteNumberArray(record.values, 'dataset.x.values', true);

  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined || current <= previous) {
      invalid('dataset.x.values must be strictly increasing');
    }
  }

  return { label, unit, values };
}

function parseSeries(value: unknown, index: number, pointCount: number): NumericSeries {
  const field = `dataset.series[${index}]`;
  const record = asRecord(value, field);
  exactKeys(record, ['id', 'label', 'unit', 'values'], field);

  const id = nonBlankString(record.id, `${field}.id`);
  const label = nonBlankString(record.label, `${field}.label`);
  const unit = stringValue(record.unit, `${field}.unit`);
  const values = finiteNumberArray(record.values, `${field}.values`);

  if (values.length !== pointCount) {
    invalid(`${field}.values length must match dataset.x.values length`);
  }

  return { id, label, unit, values };
}

function parseDataset(value: unknown): NumericDataset {
  const record = asRecord(value, 'dataset');
  exactKeys(record, ['x', 'series'], 'dataset');

  const x = parseAxis(record.x);
  if (!Array.isArray(record.series) || record.series.length === 0) {
    invalid('dataset.series must be a non-empty array');
  }

  const series = record.series.map((item, index) => parseSeries(item, index, x.values.length));
  const normalizedIds = series.map((item) => item.id.trim());
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    invalid('dataset.series ids must not contain duplicates');
  }

  return { x, series };
}

function parsePresentation(value: unknown): DataPresentation {
  const record = asRecord(value, 'presentation');
  exactKeys(record, ['mode', 'xAxisLabel', 'yAxisLabel'], 'presentation');

  const mode = record.mode;
  if (mode !== 'table' && mode !== 'line_graph' && mode !== 'table_and_line_graph') {
    invalid(`unsupported presentation.mode ${JSON.stringify(mode)}`);
  }

  return {
    mode,
    xAxisLabel: nonBlankString(record.xAxisLabel, 'presentation.xAxisLabel'),
    yAxisLabel: nonBlankString(record.yAxisLabel, 'presentation.yAxisLabel'),
  };
}

function requireSeries(dataset: NumericDataset, seriesId: string, field: string): NumericSeries {
  const series = dataset.series.find((item) => item.id === seriesId);
  if (!series) {
    invalid(`${field} references unknown seriesId ${JSON.stringify(seriesId)}`);
  }
  return series;
}

function requirePointIndex(index: number, dataset: NumericDataset, field: string): number {
  if (index >= dataset.x.values.length) {
    invalid(`${field} is out of range`);
  }
  return index;
}

function parseRule(value: unknown, dataset: NumericDataset, field: string): NumericDataTaskRule {
  const record = asRecord(value, field);
  const kind = record.kind;

  if (kind === 'read_value') {
    exactKeys(record, ['kind', 'seriesId', 'pointIndex'], field);
    const seriesId = nonBlankString(record.seriesId, `${field}.seriesId`);
    requireSeries(dataset, seriesId, `${field}.seriesId`);
    const pointIndex = requirePointIndex(
      nonNegativeInteger(record.pointIndex, `${field}.pointIndex`),
      dataset,
      `${field}.pointIndex`
    );
    return { kind, seriesId, pointIndex };
  }

  if (kind === 'difference') {
    exactKeys(record, ['kind', 'seriesId', 'leftIndex', 'rightIndex', 'absolute'], field);
    const seriesId = nonBlankString(record.seriesId, `${field}.seriesId`);
    requireSeries(dataset, seriesId, `${field}.seriesId`);
    const leftIndex = requirePointIndex(
      nonNegativeInteger(record.leftIndex, `${field}.leftIndex`),
      dataset,
      `${field}.leftIndex`
    );
    const rightIndex = requirePointIndex(
      nonNegativeInteger(record.rightIndex, `${field}.rightIndex`),
      dataset,
      `${field}.rightIndex`
    );
    if (typeof record.absolute !== 'boolean') {
      invalid(`${field}.absolute must be a boolean`);
    }
    return { kind, seriesId, leftIndex, rightIndex, absolute: record.absolute };
  }

  if (kind === 'mean') {
    exactKeys(record, ['kind', 'seriesId', 'pointIndices'], field);
    const seriesId = nonBlankString(record.seriesId, `${field}.seriesId`);
    requireSeries(dataset, seriesId, `${field}.seriesId`);
    if (!Array.isArray(record.pointIndices) || record.pointIndices.length === 0) {
      invalid(`${field}.pointIndices must be a non-empty array`);
    }
    const pointIndices = record.pointIndices.map((item, index) =>
      requirePointIndex(
        nonNegativeInteger(item, `${field}.pointIndices[${index}]`),
        dataset,
        `${field}.pointIndices[${index}]`
      )
    );
    return { kind, seriesId, pointIndices };
  }

  invalid(`unsupported ${field}.kind ${JSON.stringify(kind)}`);
}

function parseTask(value: unknown, dataset: NumericDataset, index: number): NumericDataTask {
  const field = `tasks[${index}]`;
  const record = asRecord(value, field);
  exactKeys(record, ['id', 'prompt', 'unit', 'tolerance', 'rule'], field);

  const id = nonBlankString(record.id, `${field}.id`);
  const prompt = nonBlankString(record.prompt, `${field}.prompt`);
  const unit = stringValue(record.unit, `${field}.unit`);
  const rule = parseRule(record.rule, dataset, `${field}.rule`);

  if (record.tolerance === undefined) {
    return { id, prompt, unit, rule };
  }

  const tolerance = finiteNumber(record.tolerance, `${field}.tolerance`);
  if (tolerance < 0) {
    invalid(`${field}.tolerance must be non-negative`);
  }

  return { id, prompt, unit, tolerance, rule };
}

export function parseDataActivityConfig(value: unknown): DataActivityConfig {
  const record = asRecord(value, 'config');
  exactKeys(record, ['engineKind', 'context', 'presentation', 'dataset', 'tasks'], 'config');

  if (record.engineKind !== 'data_graph_v1') {
    invalid(`unsupported engineKind ${JSON.stringify(record.engineKind)}`);
  }

  const context = nonBlankString(record.context, 'context');
  const presentation = parsePresentation(record.presentation);
  const dataset = parseDataset(record.dataset);

  if (!Array.isArray(record.tasks) || record.tasks.length === 0) {
    invalid('tasks must be a non-empty array');
  }
  const tasks = record.tasks.map((item, index) => parseTask(item, dataset, index));
  const normalizedTaskIds = tasks.map((task) => task.id.trim());
  if (new Set(normalizedTaskIds).size !== normalizedTaskIds.length) {
    invalid('task ids must not contain duplicates');
  }

  return {
    engineKind: 'data_graph_v1',
    context,
    presentation,
    dataset,
    tasks,
  };
}

export function assertScientificDataActivity(
  activity: ScientificDataActivity
): ScientificDataActivity {
  if (!activity.id.trim()) {
    throw new Error('Invalid scientific data activity: id must not be blank.');
  }
  if (!activity.lessonId.trim()) {
    throw new Error(
      `Invalid scientific data activity "${activity.id}": lessonId must not be blank.`
    );
  }
  if (!activity.title.trim()) {
    throw new Error(`Invalid scientific data activity "${activity.id}": title must not be blank.`);
  }
  if (!activity.instructions.trim()) {
    throw new Error(
      `Invalid scientific data activity "${activity.id}": instructions must not be blank.`
    );
  }
  if (activity.objectiveIds.length === 0) {
    throw new Error(
      `Invalid scientific data activity "${activity.id}": objectiveIds must not be empty.`
    );
  }

  const normalizedObjectiveIds = activity.objectiveIds.map((id) => id.trim());
  if (normalizedObjectiveIds.some((id) => id.length === 0)) {
    throw new Error(
      `Invalid scientific data activity "${activity.id}": objectiveIds must not contain blanks.`
    );
  }
  if (new Set(normalizedObjectiveIds).size !== normalizedObjectiveIds.length) {
    throw new Error(
      `Invalid scientific data activity "${activity.id}": objectiveIds must not contain duplicates.`
    );
  }

  parseDataActivityConfig(activity.config);
  return activity;
}

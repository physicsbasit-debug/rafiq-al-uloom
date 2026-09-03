import type {
  NumericDataTask,
  NumericDataTaskRule,
  NumericDataset,
  NumericSeries,
} from '@shared-types/data-activity.types';

export const DEFAULT_NUMERIC_TOLERANCE = 1e-9;

export type NumericAnswerParseResult =
  { status: 'empty' } | { status: 'invalid_number' } | { status: 'valid'; value: number };

export type NumericAnswerEvaluation =
  | { status: 'empty' }
  | { status: 'invalid_number' }
  | { status: 'correct'; expected: number; actual: number }
  | { status: 'incorrect'; expected: number; actual: number };

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function requireFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite.`);
  }
  return value;
}

function requireSeries(dataset: NumericDataset, seriesId: string): NumericSeries {
  const series = dataset.series.find((item) => item.id === seriesId);
  if (!series) {
    throw new Error(`Unknown seriesId ${JSON.stringify(seriesId)}.`);
  }
  return series;
}

function readSeriesValue(series: NumericSeries, pointIndex: number): number {
  if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= series.values.length) {
    throw new Error(
      `Point index ${pointIndex} is out of range for series ${JSON.stringify(series.id)}.`
    );
  }
  const value = series.values[pointIndex];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Series ${JSON.stringify(series.id)} contains an invalid value.`);
  }
  return value;
}

export function deriveExpectedValue(dataset: NumericDataset, rule: NumericDataTaskRule): number {
  const series = requireSeries(dataset, rule.seriesId);

  if (rule.kind === 'read_value') {
    return readSeriesValue(series, rule.pointIndex);
  }

  if (rule.kind === 'difference') {
    const left = readSeriesValue(series, rule.leftIndex);
    const right = readSeriesValue(series, rule.rightIndex);
    const difference = right - left;
    return rule.absolute ? Math.abs(difference) : difference;
  }

  if (rule.kind === 'mean') {
    if (rule.pointIndices.length === 0) {
      throw new Error('Mean rule must contain at least one point index.');
    }
    const total = rule.pointIndices.reduce(
      (sum, pointIndex) => sum + readSeriesValue(series, pointIndex),
      0
    );
    return total / rule.pointIndices.length;
  }

  const unsupported: never = rule;
  throw new Error(`Unsupported data task rule ${JSON.stringify(unsupported)}.`);
}

export function normalizeNumericAnswer(rawInput: string): NumericAnswerParseResult {
  const normalized = rawInput.trim();
  if (!normalized) {
    return { status: 'empty' };
  }
  if (!DECIMAL_PATTERN.test(normalized)) {
    return { status: 'invalid_number' };
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { status: 'invalid_number' };
  }
  return { status: 'valid', value };
}

export function evaluateNumericAnswer(
  expected: number,
  actual: number,
  tolerance = DEFAULT_NUMERIC_TOLERANCE
): Extract<NumericAnswerEvaluation, { status: 'correct' | 'incorrect' }> {
  const checkedExpected = requireFinite(expected, 'expected');
  const checkedActual = requireFinite(actual, 'actual');
  const checkedTolerance = requireFinite(tolerance, 'tolerance');
  if (checkedTolerance < 0) {
    throw new Error('tolerance must be non-negative.');
  }

  const status =
    Math.abs(checkedActual - checkedExpected) <= checkedTolerance ? 'correct' : 'incorrect';
  return { status, expected: checkedExpected, actual: checkedActual };
}

export function evaluateNumericTask(
  dataset: NumericDataset,
  task: NumericDataTask,
  rawInput: string
): NumericAnswerEvaluation {
  const parsed = normalizeNumericAnswer(rawInput);
  if (parsed.status === 'empty' || parsed.status === 'invalid_number') {
    return parsed;
  }

  return evaluateNumericAnswer(
    deriveExpectedValue(dataset, task.rule),
    parsed.value,
    task.tolerance ?? DEFAULT_NUMERIC_TOLERANCE
  );
}

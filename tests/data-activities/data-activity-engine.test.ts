import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NUMERIC_TOLERANCE,
  deriveExpectedValue,
  evaluateNumericAnswer,
  evaluateNumericTask,
  normalizeNumericAnswer,
} from '@features/data-activities/engine/data-activity.engine';
import type { NumericDataTaskRule, NumericDataset } from '@shared-types/data-activity.types';

const dataset: NumericDataset = {
  x: {
    label: 'التردد',
    unit: 'Hz',
    values: [1, 2, 3, 4],
  },
  series: [
    {
      id: 'wavelength',
      label: 'الطول الموجي',
      unit: 'm',
      values: [12, 6, 4, 3],
    },
  ],
};

describe('data activity deterministic engine', () => {
  it('derives a directly read value from the visible dataset', () => {
    expect(
      deriveExpectedValue(dataset, {
        kind: 'read_value',
        seriesId: 'wavelength',
        pointIndex: 1,
      })
    ).toBe(6);
  });

  it('derives signed and absolute differences deterministically', () => {
    const base = {
      kind: 'difference' as const,
      seriesId: 'wavelength',
      leftIndex: 0,
      rightIndex: 1,
    };

    expect(deriveExpectedValue(dataset, { ...base, absolute: false })).toBe(-6);
    expect(deriveExpectedValue(dataset, { ...base, absolute: true })).toBe(6);
  });

  it('derives an arithmetic mean from selected visible values', () => {
    expect(
      deriveExpectedValue(dataset, {
        kind: 'mean',
        seriesId: 'wavelength',
        pointIndices: [1, 2, 3],
      })
    ).toBeCloseTo(13 / 3, 12);
  });

  it('parses ordinary decimal input and rejects non-decimal or non-finite forms', () => {
    expect(normalizeNumericAnswer('  -2.25  ')).toEqual({ status: 'valid', value: -2.25 });
    expect(normalizeNumericAnswer('.5')).toEqual({ status: 'valid', value: 0.5 });
    expect(normalizeNumericAnswer('')).toEqual({ status: 'empty' });
    expect(normalizeNumericAnswer('1e3')).toEqual({ status: 'invalid_number' });
    expect(normalizeNumericAnswer('Infinity')).toEqual({ status: 'invalid_number' });
  });

  it('applies the absolute tolerance boundary exactly', () => {
    expect(evaluateNumericAnswer(10, 10 + DEFAULT_NUMERIC_TOLERANCE)).toMatchObject({
      status: 'correct',
    });
    expect(evaluateNumericAnswer(10, 10 + DEFAULT_NUMERIC_TOLERANCE * 2)).toMatchObject({
      status: 'incorrect',
    });
  });

  it('returns empty and invalid states without deriving student feedback from NaN', () => {
    const task = {
      id: 'read-1',
      prompt: 'اقرأ القيمة.',
      unit: 'm',
      rule: { kind: 'read_value' as const, seriesId: 'wavelength', pointIndex: 0 },
    };

    expect(evaluateNumericTask(dataset, task, '   ')).toEqual({ status: 'empty' });
    expect(evaluateNumericTask(dataset, task, 'abc')).toEqual({ status: 'invalid_number' });
  });

  it('rejects invalid references defensively', () => {
    expect(() =>
      deriveExpectedValue(dataset, {
        kind: 'read_value',
        seriesId: 'missing',
        pointIndex: 0,
      })
    ).toThrow('Unknown seriesId');

    expect(() =>
      deriveExpectedValue(dataset, {
        kind: 'read_value',
        seriesId: 'wavelength',
        pointIndex: 99,
      })
    ).toThrow('out of range');

    const malformedMean = {
      kind: 'mean',
      seriesId: 'wavelength',
      pointIndices: [],
    } as NumericDataTaskRule;
    expect(() => deriveExpectedValue(dataset, malformedMean)).toThrow('at least one');
  });

  it('is deterministic for identical dataset, rule, and input', () => {
    const task = {
      id: 'mean-1',
      prompt: 'احسب المتوسط.',
      unit: 'm',
      tolerance: 0.001,
      rule: {
        kind: 'mean' as const,
        seriesId: 'wavelength',
        pointIndices: [0, 1, 2],
      },
    };

    expect(evaluateNumericTask(dataset, task, '7.333')).toEqual(
      evaluateNumericTask(dataset, task, '7.333')
    );
  });
});

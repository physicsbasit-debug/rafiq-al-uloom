import { describe, expect, it } from 'vitest';
import {
  assertScientificDataActivity,
  parseDataActivityConfig,
} from '@shared-types/data-activity.types';

const config = {
  engineKind: 'data_graph_v1' as const,
  context: 'موجات تتحرك في وسط ثابت السرعة.',
  presentation: {
    mode: 'table_and_line_graph' as const,
    xAxisLabel: 'التردد (Hz)',
    yAxisLabel: 'الطول الموجي (m)',
  },
  dataset: {
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
  },
  tasks: [
    {
      id: 'read-1',
      prompt: 'اقرأ الطول الموجي عند التردد 2 Hz.',
      unit: 'm',
      rule: { kind: 'read_value' as const, seriesId: 'wavelength', pointIndex: 1 },
    },
    {
      id: 'difference-1',
      prompt: 'أوجد مقدار الفرق بين القيمتين الأولى والثانية.',
      unit: 'm',
      tolerance: 0.01,
      rule: {
        kind: 'difference' as const,
        seriesId: 'wavelength',
        leftIndex: 0,
        rightIndex: 1,
        absolute: true,
      },
    },
  ],
};

describe('data activity domain', () => {
  it('accepts the approved data_graph_v1 contract', () => {
    expect(parseDataActivityConfig(config)).toEqual(config);
  });

  it('rejects unsupported structural keys', () => {
    expect(() => parseDataActivityConfig({ ...config, formula: 'x * 2' })).toThrow(
      'unsupported key'
    );
  });

  it.each([
    [{ ...config.dataset, x: { ...config.dataset.x, values: [] } }, 'must not be empty'],
    [
      { ...config.dataset, x: { ...config.dataset.x, values: [1, 1, 2] } },
      'strictly increasing',
    ],
    [
      {
        ...config.dataset,
        x: { ...config.dataset.x, values: [1, Number.NaN, 3] },
      },
      'finite number',
    ],
    [
      {
        ...config.dataset,
        series: [
          config.dataset.series[0],
          { ...config.dataset.series[0], label: 'نسخة أخرى' },
        ],
      },
      'duplicates',
    ],
    [
      {
        ...config.dataset,
        series: [{ ...config.dataset.series[0], values: [12, 6] }],
      },
      'length must match',
    ],
  ])('rejects invalid dataset contracts', (dataset, expectedMessage) => {
    expect(() => parseDataActivityConfig({ ...config, dataset })).toThrow(expectedMessage);
  });

  it('rejects unknown series and out-of-range point references', () => {
    expect(() =>
      parseDataActivityConfig({
        ...config,
        tasks: [
          {
            ...config.tasks[0],
            rule: { kind: 'read_value', seriesId: 'missing', pointIndex: 0 },
          },
        ],
      })
    ).toThrow('unknown seriesId');

    expect(() =>
      parseDataActivityConfig({
        ...config,
        tasks: [
          {
            ...config.tasks[0],
            rule: { kind: 'read_value', seriesId: 'wavelength', pointIndex: 99 },
          },
        ],
      })
    ).toThrow('out of range');
  });

  it('rejects unsupported rules, duplicate task ids, and negative tolerance', () => {
    expect(() =>
      parseDataActivityConfig({
        ...config,
        tasks: [
          {
            ...config.tasks[0],
            rule: { kind: 'formula', expression: 'x * 2' },
          },
        ],
      })
    ).toThrow('unsupported');

    expect(() =>
      parseDataActivityConfig({
        ...config,
        tasks: [config.tasks[0], { ...config.tasks[0] }],
      })
    ).toThrow('duplicates');

    expect(() =>
      parseDataActivityConfig({
        ...config,
        tasks: [{ ...config.tasks[0], tolerance: -0.01 }],
      })
    ).toThrow('non-negative');
  });

  it('rejects duplicate structural objective ids', () => {
    expect(() =>
      assertScientificDataActivity({
        id: 'data-1',
        lessonId: 'lesson-1',
        title: 'بيانات ورسوم',
        instructions: 'اقرأ البيانات وأجب.',
        objectiveIds: ['o1', 'o1'],
        config,
        status: 'draft',
        source: 'curriculum_seed',
      })
    ).toThrow('duplicates');
  });
});

import { describe, expect, it } from 'vitest';

import {
  mapDataActivityObjectiveRow,
  mapDataActivityRow,
} from '@services/data/supabase-content.mappers';

const config = {
  engineKind: 'data_graph_v1',
  context: 'بيانات موجة بسرعة ثابتة.',
  presentation: {
    mode: 'table_and_line_graph',
    xAxisLabel: 'التردد',
    yAxisLabel: 'الطول الموجي',
  },
  dataset: {
    x: { label: 'التردد', unit: 'Hz', values: [100, 200, 400] },
    series: [
      {
        id: 'wavelength',
        label: 'الطول الموجي',
        unit: 'm',
        values: [3.4, 1.7, 0.85],
      },
    ],
  },
  tasks: [
    {
      id: 'read',
      prompt: 'اقرأ القيمة.',
      unit: 'm',
      rule: { kind: 'read_value', seriesId: 'wavelength', pointIndex: 1 },
    },
  ],
};

const dataActivityRow = {
  id: 'data-1',
  lesson_id: 'lesson-1',
  title: 'نشاط بيانات',
  instructions: 'اقرأ البيانات.',
  engine_kind: 'data_graph_v1',
  config,
  status: 'draft',
  source: 'curriculum_seed',
};

describe('Phase 5-4B Supabase data activity mappers', () => {
  it('يبني ScientificDataActivity ويحافظ على ترتيب objectiveIds', () => {
    const activity = mapDataActivityRow(dataActivityRow, ['objective-2', 'objective-1']);

    expect(activity).toMatchObject({
      id: 'data-1',
      lessonId: 'lesson-1',
      objectiveIds: ['objective-2', 'objective-1'],
      config: { engineKind: 'data_graph_v1' },
    });
  });

  it('يرفض نشاط بيانات بلا objectiveIds أو بروابط مكررة', () => {
    expect(() => mapDataActivityRow(dataActivityRow, [])).toThrow(
      'objectiveIds must not be empty'
    );
    expect(() =>
      mapDataActivityRow(dataActivityRow, ['objective-1', 'objective-1'])
    ).toThrow('objectiveIds must not contain duplicates');
  });

  it('يرفض engine_kind غير المدعوم أو المختلف عن config.engineKind', () => {
    expect(() =>
      mapDataActivityRow({ ...dataActivityRow, engine_kind: 'unknown_engine' }, ['objective-1'])
    ).toThrow('engine_kind has unsupported value');

    expect(() =>
      mapDataActivityRow(
        {
          ...dataActivityRow,
          config: { ...config, engineKind: 'unknown_engine' },
        },
        ['objective-1']
      )
    ).toThrow('unsupported engineKind');
  });

  it('يرفض config غير صالح عند عبور حد الشبكة', () => {
    expect(() =>
      mapDataActivityRow(
        {
          ...dataActivityRow,
          config: {
            ...config,
            dataset: {
              ...config.dataset,
              x: { ...config.dataset.x, values: [100, 100, 400] },
            },
          },
        },
        ['objective-1']
      )
    ).toThrow('strictly increasing');
  });

  it('يحوّل data_activity_objectives ويتحقق من lesson_id وposition', () => {
    expect(
      mapDataActivityObjectiveRow({
        data_activity_id: 'data-1',
        objective_id: 'objective-1',
        lesson_id: 'lesson-1',
        position: 0,
      })
    ).toEqual({
      data_activity_id: 'data-1',
      objective_id: 'objective-1',
      lesson_id: 'lesson-1',
      position: 0,
    });

    expect(() =>
      mapDataActivityObjectiveRow({
        data_activity_id: 'data-1',
        objective_id: 'objective-1',
        lesson_id: 'lesson-1',
        position: -1,
      })
    ).toThrow('position must be non-negative');
  });
});

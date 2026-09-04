import { describe, expect, it } from 'vitest';

import { validateDataActivityDraft } from '@features/teacher/workspace/teacher-activity-editor-utils';

const validConfig = {
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
      rule: {
        kind: 'read_value' as const,
        seriesId: 'wavelength',
        pointIndex: 1,
      },
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

describe('Phase 5-5D2-C Data Activity editor utilities', () => {
  it('يقبل عقد data_graph_v1 الصحيح ويطبّع عنوان النشاط وتعليماته', () => {
    const result = validateDataActivityDraft({
      title: ' نشاط قراءة البيانات ',
      instructions: ' اقرأ الجدول والرسم ثم أجب ',
      objectiveKeys: [],
      config: validConfig,
    });

    expect(result).toEqual({
      valid: true,
      dataActivity: {
        title: 'نشاط قراءة البيانات',
        instructions: 'اقرأ الجدول والرسم ثم أجب',
        objectiveKeys: [],
        config: validConfig,
      },
    });
  });

  it('يسمح بمسودة بلا objectiveKeys ويترك شرط الربط لبوابة Submit', () => {
    const result = validateDataActivityDraft({
      title: 'بيانات الموجة',
      instructions: 'حلل البيانات.',
      objectiveKeys: [],
      config: validConfig,
    });

    expect(result.valid).toBe(true);
  });

  it('يرفض محور x غير متزايد وفق parser الإنتاجي', () => {
    expect(
      validateDataActivityDraft({
        title: 'بيانات',
        instructions: 'حلل البيانات.',
        objectiveKeys: [],
        config: {
          ...validConfig,
          dataset: {
            ...validConfig.dataset,
            x: {
              ...validConfig.dataset.x,
              values: [1, 1, 3, 4],
            },
          },
        },
      })
    ).toEqual({
      valid: false,
      reason: 'invalid_config',
    });
  });

  it('يرفض مهمة تشير إلى seriesId غير موجود', () => {
    expect(
      validateDataActivityDraft({
        title: 'بيانات',
        instructions: 'حلل البيانات.',
        objectiveKeys: [],
        config: {
          ...validConfig,
          tasks: [
            {
              ...validConfig.tasks[0],
              rule: {
                kind: 'read_value',
                seriesId: 'missing',
                pointIndex: 0,
              },
            },
          ],
        },
      })
    ).toEqual({
      valid: false,
      reason: 'invalid_config',
    });
  });

  it('يرفض القواعد الحرة ولا يسمح بصيغة formula', () => {
    const unsafeConfig = {
      ...validConfig,
      tasks: [
        {
          id: 'formula-1',
          prompt: 'احسب القيمة.',
          unit: 'm',
          rule: {
            kind: 'formula',
            expression: 'x * 2',
          },
        },
      ],
    };

    expect(
      validateDataActivityDraft({
        title: 'بيانات',
        instructions: 'حلل البيانات.',
        objectiveKeys: [],
        config: unsafeConfig as never,
      })
    ).toEqual({
      valid: false,
      reason: 'invalid_config',
    });
  });
});

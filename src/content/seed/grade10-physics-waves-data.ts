import type { ScientificDataActivity } from '@shared-types/data-activity.types';

export const grade10PhysicsWavesDataActivities: ScientificDataActivity[] = [
  {
    id: 'g10-phy-waves-l2-data-frequency-wavelength',
    lessonId: 'g10-phy-waves-l2',
    title: 'كيف يتغير الطول الموجي مع التردد؟',
    instructions: 'اقرأ الجدول والرسم ثم استخدم القيم المعروضة للإجابة عن المهام العددية.',
    objectiveIds: ['l2-o2'],
    config: {
      engineKind: 'data_graph_v1',
      context:
        'تتحرك الموجة في الوسط نفسه بسرعة ثابتة مقدارها 340 م/ث. تعرض البيانات أزواجًا من التردد f والطول الموجي λ المتوافقة مع العلاقة v = f λ.',
      presentation: {
        mode: 'table_and_line_graph',
        xAxisLabel: 'التردد f (Hz)',
        yAxisLabel: 'الطول الموجي λ (m)',
      },
      dataset: {
        x: {
          label: 'التردد',
          unit: 'Hz',
          values: [100, 200, 400],
        },
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
          id: 'read-wavelength-at-200',
          prompt: 'ما الطول الموجي عند تردد 200 هرتز؟',
          unit: 'm',
          rule: {
            kind: 'read_value',
            seriesId: 'wavelength',
            pointIndex: 1,
          },
        },
        {
          id: 'wavelength-drop-100-to-200',
          prompt: 'بكم ينخفض الطول الموجي عند الانتقال من 100 إلى 200 هرتز؟',
          unit: 'm',
          rule: {
            kind: 'difference',
            seriesId: 'wavelength',
            leftIndex: 0,
            rightIndex: 1,
            absolute: true,
          },
        },
      ],
    },
    status: 'approved',
    source: 'curriculum_seed',
  },
];

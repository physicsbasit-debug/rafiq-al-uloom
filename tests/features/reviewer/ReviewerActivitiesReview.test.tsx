// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen, within } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { ReviewerActivitiesReview } from '@features/reviewer/workspace/ReviewerActivitiesReview';
import type { LessonRevisionPayload } from '@services/authoring';

const payload: LessonRevisionPayload = {
  lesson: {
    unitId: 'unit-waves',
    title: 'خصائص الموجات',
    displayOrder: 1,
    summary: 'ملخص',
    keyConcepts: [],
    examples: [],
    misconceptions: [],
  },

  objectives: [
    {
      key: 'objective-wave',
      text: 'يفسر خصائص الموجات',
    },
  ],

  questions: [],

  games: [
    {
      key: 'game-1',
      type: 'matching',
      title: 'مطابقة الموجات',
      instructions: 'طابق الكمية بوحدتها.',
      objectiveKeys: ['objective-wave'],
      items: [
        {
          left: 'التردد',
          right: 'Hz',
        },
        {
          left: 'الطول الموجي',
          right: 'm',
        },
      ],
    },
  ],

  experiments: [
    {
      key: 'experiment-1',
      title: 'موجة في حبل',
      objective: 'ملاحظة انتقال الموجة',
      objectiveKeys: ['objective-wave'],
      tools: ['حبل'],
      steps: ['حرّك طرف الحبل'],
      safetyNotes: ['اترك مساحة كافية'],
      safetyLevel: 'teacher_supervised',
      observationPrompt: 'ماذا تلاحظ؟',
      conclusionPrompt: 'ماذا تستنتج؟',
      homeAlternative: null,
    },
  ],

  simulations: [
    {
      key: 'simulation-1',
      title: 'محاكاة الموجة',
      instructions: 'غيّر التردد والسعة.',
      objectiveKeys: ['objective-wave'],
      config: {
        engineKind: 'transverse_wave_v1',
        mediumSpeedMps: 12,
        frequencyHz: {
          min: 0.5,
          max: 4,
          step: 0.5,
          initial: 1,
        },
        amplitudeM: {
          min: 0.2,
          max: 1,
          step: 0.1,
          initial: 0.5,
        },
      },
    },
  ],

  inquiries: [
    {
      key: 'inquiry-1',
      title: 'استقصاء الانعكاس',
      instructions: 'اقرأ الموقف وأجب.',
      objectiveKeys: ['objective-wave'],
      context: 'موجة تتجه إلى حاجز.',
      drivingQuestion: 'ماذا يحدث عند الحاجز؟',
      hypothesisPrompt: 'اكتب فرضيتك.',
      observationPrompt: 'دوّن ملاحظتك.',
      conclusionPrompt: 'اكتب استنتاجك.',
    },
  ],

  dataActivities: [
    {
      key: 'data-1',
      title: 'تحليل بيانات الموجة',
      instructions: 'اقرأ البيانات وأجب.',
      objectiveKeys: ['objective-wave'],
      config: {
        engineKind: 'data_graph_v1',
        context: 'موجات في وسط ثابت.',
        presentation: {
          mode: 'table_and_line_graph',
          xAxisLabel: 'التردد (Hz)',
          yAxisLabel: 'الطول الموجي (m)',
        },
        dataset: {
          x: {
            label: 'التردد',
            unit: 'Hz',
            values: [1, 2, 3],
          },
          series: [
            {
              id: 'wavelength',
              label: 'الطول الموجي',
              unit: 'm',
              values: [12, 6, 4],
            },
          ],
        },
        tasks: [
          {
            id: 'read-1',
            prompt: 'اقرأ القيمة الثانية.',
            unit: 'm',
            rule: {
              kind: 'read_value',
              seriesId: 'wavelength',
              pointIndex: 1,
            },
          },
        ],
      },
    },
  ],
};

describe('Phase 5-5E ReviewerActivitiesReview', () => {
  it('يعرض تفاصيل العائلات الخمس كاملة بصورة للقراءة فقط', () => {
    render(<ReviewerActivitiesReview payload={payload} />);

    const game = screen.getByRole('article', {
      name: 'تفاصيل لعبة المطابقة 1',
    });

    expect(game).toHaveTextContent('مطابقة الموجات');
    expect(game).toHaveTextContent('التردد ↔ Hz');
    expect(game).toHaveTextContent('يفسر خصائص الموجات');

    const experiment = screen.getByRole('article', {
      name: 'تفاصيل التجربة 1',
    });

    expect(experiment).toHaveTextContent('موجة في حبل');
    expect(experiment).toHaveTextContent('بإشراف المعلم');
    expect(experiment).toHaveTextContent('اترك مساحة كافية');
    expect(experiment).toHaveTextContent('ماذا تلاحظ؟');

    const simulation = screen.getByRole('article', {
      name: 'تفاصيل المحاكاة 1',
    });

    expect(simulation).toHaveTextContent('محاكاة الموجة');
    expect(simulation).toHaveTextContent('transverse_wave_v1');
    expect(simulation).toHaveTextContent('12 m/s');

    const inquiry = screen.getByRole('article', {
      name: 'تفاصيل الاستقصاء 1',
    });

    expect(inquiry).toHaveTextContent('استقصاء الانعكاس');
    expect(inquiry).toHaveTextContent('ماذا يحدث عند الحاجز؟');
    expect(inquiry).toHaveTextContent('اكتب فرضيتك.');

    const data = screen.getByRole('article', {
      name: 'تفاصيل نشاط البيانات 1',
    });

    expect(data).toHaveTextContent('تحليل بيانات الموجة');
    expect(data).toHaveTextContent('جدول ورسم خطي');
    expect(data).toHaveTextContent('1، 2، 3');
    expect(data).toHaveTextContent('12، 6، 4');
    expect(data).toHaveTextContent('اقرأ القيمة الثانية.');
  });

  it('يعرض الارتباط البنيوي المفقود بوضوح ولا يخفيه', () => {
    render(
      <ReviewerActivitiesReview
        payload={{
          ...payload,
          games: [
            {
              ...payload.games[0]!,
              objectiveKeys: ['missing-objective'],
            },
          ],
        }}
      />
    );

    const game = screen.getByRole('article', {
      name: 'تفاصيل لعبة المطابقة 1',
    });

    expect(within(game).getByText(/هدف غير موجود: missing-objective/)).toBeInTheDocument();
  });

  it('لا يعرض أي أدوات تعديل أو حفظ أو نشر', () => {
    render(<ReviewerActivitiesReview payload={payload} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

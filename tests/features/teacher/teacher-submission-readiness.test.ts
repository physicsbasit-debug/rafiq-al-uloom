import { describe, expect, it } from 'vitest';

import { getLessonSubmissionReadiness } from '@features/teacher/workspace/teacher-submission-readiness';
import type { LessonRevisionPayload } from '@services/authoring';

const objective = { key: 'obj-1', text: 'يفسر انعكاس الموجات' } as const;
const masteryQuestion: LessonRevisionPayload['questions'][number] = {
  key: 'q-1',
  purpose: 'mastery',
  type: 'multiple_choice',
  prompt: 'ماذا يحدث للموجة عند الحاجز؟',
  choices: ['تنعكس', 'تختفي'],
  correctAnswerIndex: 0,
  explanation: 'تنعكس الموجة عند اصطدامها بحاجز مناسب.',
  objectiveKey: objective.key,
  difficulty: 'medium',
};

function payload(overrides: Partial<LessonRevisionPayload> = {}): LessonRevisionPayload {
  return {
    lesson: {
      unitId: 'g10-phy-waves-unit',
      title: 'انعكاس الموجات',
      displayOrder: 1,
      summary: 'ملخص',
      keyConcepts: [],
      examples: [],
      misconceptions: [],
    },
    objectives: [],
    questions: [],
    games: [],
    experiments: [],
    simulations: [],
    inquiries: [],
    dataActivities: [],
    ...overrides,
  };
}

describe('getLessonSubmissionReadiness', () => {
  it('يعكس شروط الاكتمال الثلاثة للمسودة الفارغة بترتيب ثابت', () => {
    expect(getLessonSubmissionReadiness(payload())).toEqual({
      ready: false,
      reasons: ['missing_objective', 'missing_question', 'missing_mastery_question'],
    });
  });

  it('يبقي objective-only غير جاهزة بسبب السؤال والإتقان فقط', () => {
    expect(getLessonSubmissionReadiness(payload({ objectives: [objective] }))).toEqual({
      ready: false,
      reasons: ['missing_question', 'missing_mastery_question'],
    });
  });

  it('يبقي review-only غير جاهزة بسبب غياب mastery فقط', () => {
    const reviewQuestion = { ...masteryQuestion, key: 'q-review', purpose: 'review' as const };
    expect(
      getLessonSubmissionReadiness(
        payload({ objectives: [objective], questions: [reviewQuestion] })
      )
    ).toEqual({ ready: false, reasons: ['missing_mastery_question'] });
  });

  it('يقبل payload مكتملة تحتوي mastery صالحًا', () => {
    expect(
      getLessonSubmissionReadiness(
        payload({ objectives: [objective], questions: [masteryQuestion] })
      )
    ).toEqual({ ready: true, reasons: [] });
  });

  it('يترجم dangling_objective من getQuestionStateIssue ولا يعيد فحص الرابط', () => {
    const dangling = { ...masteryQuestion, objectiveKey: 'missing-objective' };
    expect(
      getLessonSubmissionReadiness(payload({ objectives: [objective], questions: [dangling] }))
    ).toEqual({ ready: false, reasons: ['dangling_objective'] });
  });

  it('يترجم أي عيب بنيوي آخر إلى invalid_question_structure', () => {
    const invalid = { ...masteryQuestion, correctAnswerIndex: 9 };
    expect(
      getLessonSubmissionReadiness(payload({ objectives: [objective], questions: [invalid] }))
    ).toEqual({ ready: false, reasons: ['invalid_question_structure'] });
  });
});

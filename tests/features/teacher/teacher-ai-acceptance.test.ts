import { describe, expect, it } from 'vitest';

import {
  acceptObjectiveAiSuggestion,
  acceptQuestionAiSuggestion,
  createAiDestinationSnapshot,
  createQuestionAiDestinationValue,
  hasAiDestinationChanged,
} from '@features/teacher/workspace/teacher-ai-acceptance';
import type { AiQuestionSuggestion } from '@services/ai-authoring';

const objectives = [
  { key: 'teacher-objective-1', text: 'يفسر انعكاس الموجات' },
  { key: 'teacher-objective-2', text: 'يفسر انكسار الموجات' },
] as const;

const suggestion: AiQuestionSuggestion = {
  kind: 'question',
  prompt: 'ما معنى الانعكاس؟',
  choices: ['ارتداد الموجة', 'انعدام الموجة'],
  correctAnswerIndex: 0,
  explanation: 'الانعكاس هو ارتداد الموجة عن حاجز.',
  objectiveKey: 'teacher-objective-1',
  difficulty: 'medium',
};

describe('teacher AI acceptance helpers', () => {
  it('يقارن destination snapshot بعمق بدل مرجع المصفوفة', () => {
    const first = {
      prompt: 'سؤال',
      choices: ['أ', 'ب'],
      correctAnswerIndex: 0,
      explanation: 'شرح',
      objectiveKey: 'o1',
      difficulty: 'medium',
    } as const;
    const snapshot = createAiDestinationSnapshot(first);

    expect(
      hasAiDestinationChanged(snapshot, {
        ...first,
        choices: ['أ', 'ب'],
      })
    ).toBe(false);
    expect(
      hasAiDestinationChanged(snapshot, {
        ...first,
        choices: ['أ', 'ج'],
      })
    ).toBe(true);
  });

  it('يستبعد purpose من snapshot الخاص بالسؤال', () => {
    const review = {
      purpose: 'review' as const,
      prompt: 'سؤال',
      choices: ['أ', 'ب'],
      correctAnswerIndex: 0,
      explanation: 'شرح',
      objectiveKey: 'teacher-objective-1',
      difficulty: 'medium' as const,
    };
    const mastery = { ...review, purpose: 'mastery' as const };

    expect(createQuestionAiDestinationValue(review)).toEqual(
      createQuestionAiDestinationValue(mastery)
    );
  });

  it('يمرر Objective suggestion عبر validateObjectiveDraft', () => {
    expect(acceptObjectiveAiSuggestion({ kind: 'objective', text: '  يفسر الانعكاس  ' })).toEqual({
      valid: true,
      text: 'يفسر الانعكاس',
    });
  });

  it('يحافظ على purpose الحالي للمعلم عند قبول Question suggestion', () => {
    const result = acceptQuestionAiSuggestion(suggestion, 'mastery', objectives);
    expect(result).toEqual({
      valid: true,
      form: expect.objectContaining({
        purpose: 'mastery',
        objectiveKey: 'teacher-objective-1',
        prompt: 'ما معنى الانعكاس؟',
      }),
    });
  });

  it('يرفض objectiveKey الذي لم يعد موجودًا وقت القبول', () => {
    expect(acceptQuestionAiSuggestion(suggestion, 'review', [objectives[1]])).toEqual({
      valid: false,
      reason: 'objective_not_available',
    });
  });
});

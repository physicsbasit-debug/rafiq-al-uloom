import { describe, expect, it } from 'vitest';
import { grade10PhysicsWavesReviewQuestions } from '@content/seed/grade10-physics-waves';
import { getQuestionFeedback, isChoiceIndexValid, isCorrectAnswer } from '@features/quiz/quiz-engine';

const question = grade10PhysicsWavesReviewQuestions[0];

describe('quiz-engine: multiple choice review questions', () => {
  it('يتحقق من الإجابة الصحيحة', () => {
    expect(isCorrectAnswer(question, question.correctAnswerIndex)).toBe(true);
  });

  it('يتحقق من الإجابة الخاطئة', () => {
    const wrongIndex = question.correctAnswerIndex === 0 ? 1 : 0;

    expect(isCorrectAnswer(question, wrongIndex)).toBe(false);
  });

  it('يرجع التغذية الراجعة والشرح للإجابة الصحيحة', () => {
    const feedback = getQuestionFeedback(question, question.correctAnswerIndex);

    expect(feedback.isCorrect).toBe(true);
    expect(feedback.statusText).toBe('إجابة صحيحة');
    expect(feedback.explanation).toBe(question.explanation);
    expect(feedback.correctChoice).toBe(question.choices[question.correctAnswerIndex]);
  });

  it('يرجع التغذية الراجعة والإجابة الصحيحة عند الخطأ', () => {
    const wrongIndex = question.correctAnswerIndex === 0 ? 1 : 0;
    const feedback = getQuestionFeedback(question, wrongIndex);

    expect(feedback.isCorrect).toBe(false);
    expect(feedback.statusText).toBe('إجابة خاطئة');
    expect(feedback.explanation).toBe(question.explanation);
    expect(feedback.correctChoice).toBe(question.choices[question.correctAnswerIndex]);
    expect(feedback.selectedChoice).toBe(question.choices[wrongIndex]);
  });

  it('يتعامل مع فهرس خارج النطاق بلا كسر', () => {
    const invalidIndex = question.choices.length + 5;
    const feedback = getQuestionFeedback(question, invalidIndex);

    expect(isChoiceIndexValid(question, invalidIndex)).toBe(false);
    expect(feedback.isCorrect).toBe(false);
    expect(feedback.isValidChoice).toBe(false);
    expect(feedback.statusText).toBe('اختيار غير صالح');
    expect(feedback.selectedChoice).toBe(null);
  });
});

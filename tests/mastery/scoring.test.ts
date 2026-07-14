import { describe, expect, it } from 'vitest';
import { grade10PhysicsWavesMasteryQuestions } from '@content/seed/grade10-physics-waves';
import { classifyMasteryScore } from '@features/mastery/mastery-classifier';
import type { Question } from '@shared-types/quiz.types';
import { areAllQuestionsAnswered, calculateScore, type AnswersByQuestionId } from '@utils/scoring';

const questions = grade10PhysicsWavesMasteryQuestions.filter(
  (question) => question.lessonId === 'g10-phy-waves-l1',
);

function getWrongChoiceIndex(question: Question): number {
  return question.correctAnswerIndex === 0 ? 1 : 0;
}

function buildAnswers(correctCount: number): AnswersByQuestionId {
  return questions.reduce<AnswersByQuestionId>((answers, question, index) => {
    answers[question.id] =
      index < correctCount ? question.correctAnswerIndex : getWrongChoiceIndex(question);

    return answers;
  }, {});
}

describe('scoring: حساب درجة اختبار الإتقان', () => {
  it('يتحقق أن عينة الاختبار تحتوي خمسة أسئلة', () => {
    expect(questions.length).toBe(5);
  });

  it.each([
    [0, 0],
    [1, 20],
    [2, 40],
    [3, 60],
    [4, 80],
    [5, 100],
  ])('يحسب %s من 5 = %s من 100', (correctCount, expectedScore) => {
    const result = calculateScore(questions, buildAnswers(correctCount));

    expect(result.totalQuestions).toBe(5);
    expect(result.correctAnswers).toBe(correctCount);
    expect(result.score).toBe(expectedScore);
  });

  it('يحسب السؤال غير المجاب خاطئًا ويبقي المقام هو العدد الكلي', () => {
    const firstQuestion = questions[0];
    const answers: AnswersByQuestionId = {
      [firstQuestion.id]: firstQuestion.correctAnswerIndex,
    };

    const result = calculateScore(questions, answers);

    expect(result.totalQuestions).toBe(5);
    expect(result.answeredQuestions).toBe(1);
    expect(result.correctAnswers).toBe(1);
    expect(result.score).toBe(20);
  });

  it('يتحقق من اكتمال الإجابات قبل الإنهاء', () => {
    expect(areAllQuestionsAnswered(questions, buildAnswers(5))).toBe(true);
    expect(areAllQuestionsAnswered(questions, { [questions[0].id]: questions[0].correctAnswerIndex })).toBe(false);
  });

  it('يصنف 3/5 قريبًا من الإتقان و4/5 متقنًا', () => {
    const threeOfFive = calculateScore(questions, buildAnswers(3));
    const fourOfFive = calculateScore(questions, buildAnswers(4));

    expect(threeOfFive.score).toBe(60);
    expect(classifyMasteryScore(threeOfFive.score)).toBe('قريب من الإتقان');

    expect(fourOfFive.score).toBe(80);
    expect(classifyMasteryScore(fourOfFive.score)).toBe('متقن');
  });
});

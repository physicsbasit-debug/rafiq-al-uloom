import type { Question } from '@shared-types/quiz.types';
import { isCorrectAnswer } from '@features/quiz/quiz-engine';

export interface ScoreResult {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  score: number;
}

export type AnswersByQuestionId = Record<string, number | undefined>;

export function calculateScore(questions: Question[], answersByQuestionId: AnswersByQuestionId): ScoreResult {
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter(
    (question) => answersByQuestionId[question.id] !== undefined,
  ).length;

  const correctAnswers = questions.filter((question) => {
    const selectedIndex = answersByQuestionId[question.id];

    return selectedIndex !== undefined && isCorrectAnswer(question, selectedIndex);
  }).length;

  return {
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    score: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
  };
}

export function areAllQuestionsAnswered(
  questions: Question[],
  answersByQuestionId: AnswersByQuestionId,
): boolean {
  return questions.length > 0 && questions.every((question) => answersByQuestionId[question.id] !== undefined);
}

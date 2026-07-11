import type { Question } from '@shared-types/quiz.types';

export interface QuestionFeedbackResult {
  isCorrect: boolean;
  isValidChoice: boolean;
  statusText: 'إجابة صحيحة' | 'إجابة خاطئة' | 'اختيار غير صالح';
  selectedChoice: string | null;
  correctChoice: string;
  explanation: string;
}

export function isChoiceIndexValid(question: Question, selectedIndex: number): boolean {
  return Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < question.choices.length;
}

export function isCorrectAnswer(question: Question, selectedIndex: number): boolean {
  return isChoiceIndexValid(question, selectedIndex) && selectedIndex === question.correctAnswerIndex;
}

export function getQuestionFeedback(question: Question, selectedIndex: number): QuestionFeedbackResult {
  const isValidChoice = isChoiceIndexValid(question, selectedIndex);
  const isCorrect = isCorrectAnswer(question, selectedIndex);
  const selectedChoice = isValidChoice ? question.choices[selectedIndex] : null;
  const correctChoice = question.choices[question.correctAnswerIndex] ?? '';

  return {
    isCorrect,
    isValidChoice,
    statusText: !isValidChoice ? 'اختيار غير صالح' : isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة',
    selectedChoice,
    correctChoice,
    explanation: question.explanation,
  };
}

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { useReviewQuestions } from '@services/queries/content-query.hooks';
import type { Question } from '@shared-types/quiz.types';

vi.mock('@services/queries/content-query.hooks', () => ({
  useReviewQuestions: vi.fn(),
}));

const mockedUseReviewQuestions = vi.mocked(useReviewQuestions);

const questions: Question[] = Array.from({ length: 5 }, (_, index) => ({
  id: `l13-review-${index + 1}`,
  lessonId: 'g9-phy-s1-u1-l3',
  type: 'multiple_choice' as const,
  prompt: `سؤال ${index + 1}`,
  choices: [`صحيح ${index + 1}`, `خطأ ${index + 1}`],
  correctAnswerIndex: 0,
  explanation: `شرح ${index + 1}`,
  objectiveId: `objective-${index + 1}`,
  difficulty: index < 2 ? ('easy' as const) : ('medium' as const),
  status: 'approved' as const,
  source: 'curriculum_seed' as const,
}));

function currentCard() {
  const heading = screen.getByRole('heading', { level: 3 });
  const article = heading.closest('article');
  expect(article).not.toBeNull();
  return article as HTMLElement;
}

beforeEach(() => {
  mockedUseReviewQuestions.mockReturnValue({
    data: questions,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
});

describe('ReviewQuestionsView completion signal', () => {
  it('يعتبر needs_review حالة نهائية ويبلغ باكتمال الأسئلة الخمسة', () => {
    const onComplete = vi.fn();

    render(
      <ReviewQuestionsView
        lessonId="g9-phy-s1-u1-l3"
        onBackToLesson={vi.fn()}
        onComplete={onComplete}
      />
    );

    fireEvent.click(within(currentCard()).getByRole('button', { name: 'خطأ 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    fireEvent.click(within(currentCard()).getByRole('button', { name: 'خطأ 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'السؤال التالي' }));

    for (let index = 2; index <= 5; index += 1) {
      fireEvent.click(within(currentCard()).getByRole('button', { name: `صحيح ${index}` }));
      fireEvent.click(
        screen.getByRole('button', {
          name: index === 5 ? 'إنهاء المراجعة' : 'السؤال التالي',
        })
      );
    }

    expect(screen.getByText('يحتاج مراجعة')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

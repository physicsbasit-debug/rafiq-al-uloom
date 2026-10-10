// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { useReviewQuestions } from '@services/queries/content-query.hooks';
import { semester1ReferenceReviewQuestions } from '@content/seed/semester1-reference-lessons.seed';

vi.mock('@services/queries/content-query.hooks', () => ({
  useReviewQuestions: vi.fn(),
}));

const mockedUseReviewQuestions = vi.mocked(useReviewQuestions);
const questions = semester1ReferenceReviewQuestions.filter(
  (question) => question.lessonId === 'g9-phy-s1-u1-l3'
);

function currentCard() {
  const cards = screen.getAllByRole('article');
  return cards[cards.length - 1];
}

function clickCorrectAndAdvance() {
  const card = currentCard();
  const correct = within(card)
    .getAllByRole('button')
    .find((button) => button.getAttribute('data-correct') === 'true');
  expect(correct).toBeDefined();
  fireEvent.click(correct as HTMLButtonElement);
  fireEvent.click(
    within(card).getByRole('button', {
      name: /السؤال التالي|الخطوة التالية|إنهاء المراجعة/,
    })
  );
}

beforeEach(() => {
  mockedUseReviewQuestions.mockReturnValue({
    data: questions,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
});

afterEach(() => cleanup());

describe('ReviewQuestionsView lesson 1-3 completion signal', () => {
  it('يعتبر needs_review حالة نهائية ويبلغ بعد إنهاء RQ1-RQ5 بكل خطوات RQ5', () => {
    const onComplete = vi.fn();

    render(
      <ReviewQuestionsView
        lessonId="g9-phy-s1-u1-l3"
        onBackToLesson={vi.fn()}
        onComplete={onComplete}
      />
    );

    const first = currentCard();
    let wrong = within(first)
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-pressed') !== null &&
          button.getAttribute('data-correct') !== 'true'
      );

    fireEvent.click(wrong[0]);
    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    wrong = within(currentCard())
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-pressed') !== null &&
          button.getAttribute('data-correct') !== 'true'
      );
    fireEvent.click(wrong[1]);
    fireEvent.click(screen.getByRole('button', { name: 'السؤال التالي' }));

    for (let index = 0; index < 3; index += 1) clickCorrectAndAdvance();
    for (let index = 0; index < 3; index += 1) clickCorrectAndAdvance();

    expect(screen.getByText('يحتاج مراجعة')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

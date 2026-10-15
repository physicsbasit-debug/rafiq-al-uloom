// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatchingGameView } from '@features/games/matching/MatchingGameView';
import { useGamesByLesson, useObjectivesByIds } from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useGamesByLesson: vi.fn(),
  useObjectivesByIds: vi.fn(),
}));

afterEach(() => cleanup());

describe('Lesson 1-3 race route', () => {
  it('يفتح سباق أجزاء الثانية مباشرة بدل placeholder ودون قفل', () => {
    render(<MatchingGameView lessonId="g9-phy-s1-u1-l3" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'سباق أجزاء الثانية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ابدأ السباق' })).toBeInTheDocument();
    expect(
      screen.queryByText('اللعبة الجديدة قيد البناء وفق العقد المعتمد.')
    ).not.toBeInTheDocument();
    expect(vi.mocked(useGamesByLesson)).not.toHaveBeenCalled();
    expect(vi.mocked(useObjectivesByIds)).not.toHaveBeenCalled();
  });

  it('query param لا يغير timeScale الإنتاجي', () => {
    window.history.replaceState({}, '', '/?timeScale=4');

    render(<MatchingGameView lessonId="g9-phy-s1-u1-l3" onBackToLesson={vi.fn()} />);

    expect(screen.getByTestId('time-race-shell')).toHaveAttribute('data-time-scale', '1');
  });
});

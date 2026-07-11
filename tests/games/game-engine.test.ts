import { describe, expect, it } from 'vitest';
import { grade10PhysicsWavesGames } from '@content/seed/grade10-physics-waves';
import {
  createMatchingRound,
  getMatchingAttemptResult,
  isMatchingCorrect,
  isRightColumnRowByRow,
} from '@features/games/game-engine';

const game = grade10PhysicsWavesGames[0];

describe('game-engine: matching game', () => {
  it('ينشئ جولة مطابقة بعدد عناصر صحيح', () => {
    const round = createMatchingRound(game);

    expect(round.leftItems.length).toBe(game.items.length);
    expect(round.rightItems.length).toBe(game.items.length);
  });

  it('يبعثر ترتيب الجهة المقابلة فلا تكون صفًا بصف', () => {
    const round = createMatchingRound(game);

    expect(isRightColumnRowByRow(round)).toBe(false);
  });

  it('يتحقق من المطابقة الصحيحة', () => {
    const round = createMatchingRound(game);
    const left = round.leftItems[0];
    const right = round.rightItems.find((item) => item.pairId === left.pairId);

    expect(right).toBeDefined();
    expect(isMatchingCorrect(left, right!)).toBe(true);
  });

  it('يرفض المطابقة الخاطئة', () => {
    const round = createMatchingRound(game);
    const left = round.leftItems[0];
    const wrongRight = round.rightItems.find((item) => item.pairId !== left.pairId);

    expect(wrongRight).toBeDefined();
    expect(isMatchingCorrect(left, wrongRight!)).toBe(false);
  });

  it('يرجع تغذية راجعة واضحة للمحاولة الصحيحة والخاطئة', () => {
    const round = createMatchingRound(game);
    const left = round.leftItems[0];
    const correctRight = round.rightItems.find((item) => item.pairId === left.pairId)!;
    const wrongRight = round.rightItems.find((item) => item.pairId !== left.pairId)!;

    const correctFeedback = getMatchingAttemptResult(left, correctRight);
    const wrongFeedback = getMatchingAttemptResult(left, wrongRight);

    expect(correctFeedback.isCorrect).toBe(true);
    expect(correctFeedback.statusText).toBe('مطابقة صحيحة');
    expect(wrongFeedback.isCorrect).toBe(false);
    expect(wrongFeedback.statusText).toBe('مطابقة غير صحيحة');
  });
});

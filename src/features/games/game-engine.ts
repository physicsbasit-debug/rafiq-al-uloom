import type { Game } from '@shared-types/game.types';

export interface MatchingLeftItem {
  id: string;
  text: string;
  pairId: string;
}

export interface MatchingRightItem {
  id: string;
  text: string;
  pairId: string;
}

export interface MatchingRound {
  leftItems: MatchingLeftItem[];
  rightItems: MatchingRightItem[];
}

export interface MatchingAttemptResult {
  isCorrect: boolean;
  statusText: 'مطابقة صحيحة' | 'مطابقة غير صحيحة';
  feedbackText: string;
}

function createPairId(gameId: string, index: number): string {
  return `${gameId}-pair-${index}`;
}

function rotateRightItems<T>(items: T[]): T[] {
  if (items.length <= 1) {
    return items.slice();
  }

  return [...items.slice(1), items[0]];
}

export function createMatchingRound(game: Game): MatchingRound {
  const leftItems = game.items.map((item, index) => ({
    id: `${game.id}-left-${index}`,
    text: item.left,
    pairId: createPairId(game.id, index),
  }));

  const rightItems = rotateRightItems(
    game.items.map((item, index) => ({
      id: `${game.id}-right-${index}`,
      text: item.right,
      pairId: createPairId(game.id, index),
    }))
  );

  return {
    leftItems,
    rightItems,
  };
}

export function isMatchingCorrect(
  leftItem: MatchingLeftItem,
  rightItem: MatchingRightItem
): boolean {
  return leftItem.pairId === rightItem.pairId;
}

export function getMatchingAttemptResult(
  leftItem: MatchingLeftItem,
  rightItem: MatchingRightItem
): MatchingAttemptResult {
  const isCorrect = isMatchingCorrect(leftItem, rightItem);

  return {
    isCorrect,
    statusText: isCorrect ? 'مطابقة صحيحة' : 'مطابقة غير صحيحة',
    feedbackText: isCorrect
      ? 'أحسنت، هذه المطابقة صحيحة.'
      : 'ليست المطابقة الصحيحة. جرّب مرة أخرى.',
  };
}

export function isRightColumnRowByRow(round: MatchingRound): boolean {
  if (round.leftItems.length !== round.rightItems.length) {
    return false;
  }

  return round.leftItems.every(
    (leftItem, index) => leftItem.pairId === round.rightItems[index]?.pairId
  );
}

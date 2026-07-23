import { useMemo, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import {
  createMatchingRound,
  getMatchingAttemptResult,
  type MatchingAttemptResult,
  type MatchingLeftItem,
  type MatchingRightItem,
} from '@features/games/game-engine';
import { getGamesByLesson, getObjectivesByIds } from '@services/data/local-content.repository';
import { MatchingFeedback } from './MatchingFeedback';

interface MatchingGameViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}

interface FeedbackState {
  gameId: string;
  result: MatchingAttemptResult;
}

export function MatchingGameView({ lessonId, onBackToLesson }: MatchingGameViewProps) {
  const games = getGamesByLesson(lessonId);
  const rounds = useMemo(
    () => games.map((game) => ({ game, round: createMatchingRound(game) })),
    [games]
  );
  const [selectedLeftByGame, setSelectedLeftByGame] = useState<
    Record<string, MatchingLeftItem | undefined>
  >({});
  const [completedPairsByGame, setCompletedPairsByGame] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  function isPairCompleted(gameId: string, pairId: string) {
    return completedPairsByGame[gameId]?.includes(pairId) ?? false;
  }

  function clearSelection(gameId: string) {
    setSelectedLeftByGame((current) => ({ ...current, [gameId]: undefined }));
    setFeedback((current) => (current?.gameId === gameId ? null : current));
  }

  function handleSelectLeft(gameId: string, leftItem: MatchingLeftItem) {
    if (!isPairCompleted(gameId, leftItem.pairId)) {
      setSelectedLeftByGame((current) => ({ ...current, [gameId]: leftItem }));
      setFeedback(null);
    }
  }

  function handleSelectRight(gameId: string, rightItem: MatchingRightItem) {
    const selectedLeft = selectedLeftByGame[gameId];

    if (!selectedLeft || isPairCompleted(gameId, rightItem.pairId)) {
      return;
    }

    const result = getMatchingAttemptResult(selectedLeft, rightItem);
    setFeedback({ gameId, result });

    if (result.isCorrect) {
      setCompletedPairsByGame((current) => ({
        ...current,
        [gameId]: [...(current[gameId] ?? []), selectedLeft.pairId],
      }));
      clearSelection(gameId);
    }
  }

  return (
    <section>
      <header style={{ marginBottom: spacing.lg }}>
        <p
          style={{
            margin: `0 0 ${spacing.xs}`,
            color: colors.textSecondary,
            fontWeight: 800,
          }}
        >
          لعبة تدريبية
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>لعبة المطابقة</h2>
      </header>

      <div style={{ display: 'grid', gap: spacing.lg }}>
        {rounds.map(({ game, round }) => {
          const selectedLeft = selectedLeftByGame[game.id];
          const completedCount = completedPairsByGame[game.id]?.length ?? 0;
          const availableLeftItems = round.leftItems.filter(
            (item) => !isPairCompleted(game.id, item.pairId)
          );
          const availableRightItems = round.rightItems.filter(
            (item) => !isPairCompleted(game.id, item.pairId)
          );
          const gameObjectives = getObjectivesByIds(game.objectiveIds);
          const complete = completedCount === round.leftItems.length;

          return (
            <article
              key={game.id}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: radius.lg,
                padding: spacing.lg,
                backgroundColor: colors.surface,
              }}
            >
              <h3 style={{ margin: `0 0 ${spacing.xs}`, color: colors.textPrimary }}>
                {game.title}
              </h3>

              <p
                style={{
                  margin: `0 0 ${spacing.md}`,
                  color: colors.textSecondary,
                  lineHeight: typography.lineHeight.lg,
                }}
              >
                {game.instructions}
              </p>

              <section
                style={{
                  marginBottom: spacing.lg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                <p style={{ margin: 0, color: colors.textPrimary, fontWeight: 900 }}>
                  هذه اللعبة تختبر:
                </p>

                <ul
                  style={{
                    margin: `${spacing.sm} 0 0`,
                    paddingInlineStart: spacing.lg,
                    color: colors.textPrimary,
                    lineHeight: typography.lineHeight.xl,
                  }}
                >
                  {gameObjectives.map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
                </ul>
              </section>

              {!selectedLeft && !complete ? (
                <>
                  <h4 style={{ color: colors.textPrimary }}>اختر عنصرًا</h4>

                  <div style={{ display: 'grid', gap: spacing.sm }}>
                    {availableLeftItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectLeft(game.id, item)}
                        style={{
                          minHeight: '50px',
                          textAlign: 'right',
                          border: `1px solid ${colors.borderStrong}`,
                          borderRadius: radius.md,
                          backgroundColor: colors.surfaceMuted,
                          color: colors.textPrimary,
                          padding: spacing.md,
                          fontFamily: 'inherit',
                          fontSize: typography.fontSize.md,
                          cursor: 'pointer',
                        }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {selectedLeft && !complete ? (
                <>
                  <div
                    style={{
                      position: 'sticky',
                      top: spacing.sm,
                      zIndex: 1,
                      border: `2px solid ${colors.primary}`,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                      backgroundColor: colors.primarySoft,
                    }}
                  >
                    <p style={{ margin: 0, color: colors.textSecondary, fontWeight: 800 }}>
                      العنصر المختار
                    </p>

                    <p
                      style={{
                        margin: `${spacing.xs} 0 0`,
                        color: colors.textPrimary,
                        fontWeight: 900,
                      }}
                    >
                      {selectedLeft.text}
                    </p>

                    <button
                      type="button"
                      onClick={() => clearSelection(game.id)}
                      style={{
                        minHeight: '44px',
                        marginTop: spacing.sm,
                        border: 0,
                        background: 'transparent',
                        color: colors.primaryDark,
                        fontFamily: 'inherit',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      تغيير الاختيار
                    </button>
                  </div>

                  <h4 style={{ color: colors.textPrimary }}>اختر المقابل</h4>

                  <div style={{ display: 'grid', gap: spacing.sm }}>
                    {availableRightItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRight(game.id, item)}
                        style={{
                          minHeight: '50px',
                          textAlign: 'right',
                          border: `1px solid ${colors.borderStrong}`,
                          borderRadius: radius.md,
                          backgroundColor: colors.surfaceMuted,
                          color: colors.textPrimary,
                          padding: spacing.md,
                          fontFamily: 'inherit',
                          fontSize: typography.fontSize.md,
                          cursor: 'pointer',
                        }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {feedback?.gameId === game.id ? (
                <div style={{ marginTop: spacing.md }}>
                  <MatchingFeedback
                    message={feedback.result.feedbackText}
                    isCorrect={feedback.result.isCorrect}
                  />
                </div>
              ) : null}

              {complete ? (
                <MatchingFeedback message="اكتملت جميع المطابقات بنجاح." isCorrect />
              ) : null}
            </article>
          );
        })}
      </div>

      <div style={{ maxWidth: '220px', marginTop: spacing.lg }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

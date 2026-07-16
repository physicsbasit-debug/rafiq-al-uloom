import { useMemo, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
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
      <header style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.25rem', color: colors.textSecondary, fontWeight: 800 }}>
          لعبة تدريبية
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>لعبة المطابقة</h2>
      </header>

      <div style={{ display: 'grid', gap: '1rem' }}>
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
                borderRadius: '1rem',
                padding: '1rem',
                backgroundColor: colors.surface,
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem', color: colors.textPrimary }}>{game.title}</h3>

              <p style={{ margin: '0 0 0.75rem', color: colors.textSecondary, lineHeight: 1.7 }}>
                {game.instructions}
              </p>

              <section
                style={{
                  marginBottom: '0.9rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.85rem',
                  padding: '0.75rem',
                  backgroundColor: colors.surfaceMuted,
                }}
              >
                <p style={{ margin: 0, color: colors.textPrimary, fontWeight: 900 }}>
                  هذه اللعبة تختبر:
                </p>

                <ul
                  style={{
                    margin: '0.4rem 0 0',
                    paddingInlineStart: '1.2rem',
                    color: colors.textPrimary,
                    lineHeight: 1.75,
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

                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    {availableLeftItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectLeft(game.id, item)}
                        style={{
                          minHeight: '50px',
                          textAlign: 'right',
                          border: `1px solid ${colors.borderStrong}`,
                          borderRadius: '0.85rem',
                          backgroundColor: colors.surfaceMuted,
                          color: colors.textPrimary,
                          padding: '0.75rem',
                          fontFamily: 'inherit',
                          fontSize: '1rem',
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
                      top: '0.5rem',
                      zIndex: 1,
                      border: `2px solid ${colors.primary}`,
                      borderRadius: '0.9rem',
                      padding: '0.75rem',
                      backgroundColor: colors.primarySoft,
                    }}
                  >
                    <p style={{ margin: 0, color: colors.textSecondary, fontWeight: 800 }}>
                      العنصر المختار
                    </p>

                    <p
                      style={{ margin: '0.25rem 0 0', color: colors.textPrimary, fontWeight: 900 }}
                    >
                      {selectedLeft.text}
                    </p>

                    <button
                      type="button"
                      onClick={() => clearSelection(game.id)}
                      style={{
                        minHeight: '44px',
                        marginTop: '0.55rem',
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

                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    {availableRightItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRight(game.id, item)}
                        style={{
                          minHeight: '50px',
                          textAlign: 'right',
                          border: `1px solid ${colors.borderStrong}`,
                          borderRadius: '0.85rem',
                          backgroundColor: colors.surfaceMuted,
                          color: colors.textPrimary,
                          padding: '0.75rem',
                          fontFamily: 'inherit',
                          fontSize: '1rem',
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
                <div style={{ marginTop: '0.75rem' }}>
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

      <div style={{ maxWidth: '220px', marginTop: '1rem' }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

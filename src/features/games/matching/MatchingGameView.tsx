import { useMemo, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
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
    [games],
  );

  const [selectedLeftByGame, setSelectedLeftByGame] = useState<Record<string, MatchingLeftItem | undefined>>({});
  const [completedPairsByGame, setCompletedPairsByGame] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  function isPairCompleted(gameId: string, pairId: string): boolean {
    return completedPairsByGame[gameId]?.includes(pairId) ?? false;
  }

  function handleSelectLeft(gameId: string, leftItem: MatchingLeftItem) {
    if (isPairCompleted(gameId, leftItem.pairId)) {
      return;
    }

    setSelectedLeftByGame((current) => ({
      ...current,
      [gameId]: leftItem,
    }));
  }

  function handleSelectRight(gameId: string, rightItem: MatchingRightItem) {
    if (isPairCompleted(gameId, rightItem.pairId)) {
      return;
    }

    const selectedLeft = selectedLeftByGame[gameId];

    if (!selectedLeft) {
      setFeedback({
        gameId,
        result: {
          isCorrect: false,
          statusText: 'مطابقة غير صحيحة',
          feedbackText: 'اختر عنصرًا من الجهة اليمنى أولًا، ثم اختر مقابله.',
        },
      });
      return;
    }

    const result = getMatchingAttemptResult(selectedLeft, rightItem);

    setFeedback({ gameId, result });

    if (result.isCorrect) {
      setCompletedPairsByGame((current) => ({
        ...current,
        [gameId]: [...(current[gameId] ?? []), selectedLeft.pairId],
      }));
      setSelectedLeftByGame((current) => ({
        ...current,
        [gameId]: undefined,
      }));
      return;
    }

    setSelectedLeftByGame((current) => ({
      ...current,
      [gameId]: undefined,
    }));
  }

  return (
    <section>
      <header style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: '0 0 0.4rem', color: '#6B7280', fontWeight: 700 }}>لعبة تدريبية</p>
        <h2 style={{ margin: 0, color: '#1F2937' }}>لعبة المطابقة</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.8 }}>
          اختر عنصرًا من الجهة اليمنى، ثم اختر مقابله من الجهة الأخرى. المطابقة الخاطئة لا تُقفل،
          ويمكنك إعادة المحاولة.
        </p>
      </header>

      {rounds.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد لعبة مطابقة مرتبطة بهذا الدرس بعد.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {rounds.map(({ game, round }) => {
            const selectedLeft = selectedLeftByGame[game.id];
            const gameObjectives = getObjectivesByIds(game.objectiveIds);
            const completedCount = completedPairsByGame[game.id]?.length ?? 0;
            const isGameComplete = completedCount === round.leftItems.length;

            return (
              <article
                key={game.id}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '1rem',
                  padding: '1rem',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem', color: '#1F2937' }}>{game.title}</h3>
                <p style={{ margin: '0 0 0.75rem', color: '#6B7280', lineHeight: 1.8 }}>
                  {game.instructions}
                </p>

                <div
                  style={{
                    marginBottom: '1rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.85rem',
                    padding: '0.75rem',
                    backgroundColor: '#F9FAFB',
                  }}
                >
                  <strong>هذه اللعبة تختبر:</strong>
                  <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '1.25rem', lineHeight: 1.8 }}>
                    {gameObjectives.map((objective) => (
                      <li key={objective.id}>{objective.text}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h4 style={{ color: '#1F2937' }}>العناصر</h4>
                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                      {round.leftItems.map((leftItem) => {
                        const completed = isPairCompleted(game.id, leftItem.pairId);
                        const selected = selectedLeft?.id === leftItem.id;

                        return (
                          <button
                            key={leftItem.id}
                            type="button"
                            disabled={completed}
                            onClick={() => handleSelectLeft(game.id, leftItem)}
                            style={{
                              textAlign: 'right',
                              border: selected ? '2px solid #2563EB' : '1px solid #D1D5DB',
                              borderRadius: '0.85rem',
                              backgroundColor: completed ? '#ECFDF5' : selected ? '#EFF6FF' : '#F9FAFB',
                              color: '#1F2937',
                              padding: '0.8rem',
                              cursor: completed ? 'not-allowed' : 'pointer',
                              lineHeight: 1.6,
                            }}
                          >
                            {completed ? '✓ ' : ''}
                            {leftItem.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#1F2937' }}>المقابلات</h4>
                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                      {round.rightItems.map((rightItem) => {
                        const completed = isPairCompleted(game.id, rightItem.pairId);

                        return (
                          <button
                            key={rightItem.id}
                            type="button"
                            disabled={completed}
                            onClick={() => handleSelectRight(game.id, rightItem)}
                            style={{
                              textAlign: 'right',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.85rem',
                              backgroundColor: completed ? '#ECFDF5' : '#F9FAFB',
                              color: '#1F2937',
                              padding: '0.8rem',
                              cursor: completed ? 'not-allowed' : 'pointer',
                              lineHeight: 1.6,
                            }}
                          >
                            {completed ? '✓ ' : ''}
                            {rightItem.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                  {feedback?.gameId === game.id ? (
                    <MatchingFeedback
                      message={feedback.result.feedbackText}
                      isCorrect={feedback.result.isCorrect}
                    />
                  ) : null}

                  {isGameComplete ? <MatchingFeedback message="اكتملت جميع المطابقات بنجاح." isCorrect /> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <AppButton label="العودة إلى الدرس" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

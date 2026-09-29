import { useMemo, useState } from 'react';
import { spacing } from '@design-system/theme/spacing';
import {
  createMatchingRound,
  getMatchingAttemptResult,
  type MatchingAttemptResult,
  type MatchingLeftItem,
  type MatchingRightItem,
} from '@features/games/game-engine';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { StudentIcon } from '@features/student/navigation/StudentIcon';
import type { Objective } from '@shared-types/content.types';
import type { Game } from '@shared-types/game.types';
import { MatchingFeedback } from './MatchingFeedback';

interface MatchingGameRunnerProps {
  games: Game[];
  objectives: Objective[];
  onBack: () => void;
  backLabel?: string;
}

interface FeedbackState {
  gameId: string;
  result: MatchingAttemptResult;
}

export function MatchingGameRunner({
  games,
  objectives,
  onBack,
  backLabel = 'العودة إلى الدرس',
}: MatchingGameRunnerProps) {
  const rounds = useMemo(
    () => games.map((game) => ({ game, round: createMatchingRound(game) })),
    [games]
  );
  const objectivesById = useMemo(
    () => new Map(objectives.map((objective) => [objective.id, objective])),
    [objectives]
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
    <section className="rafiq-game-hub">
      <header className="rafiq-learning-hub-hero">
        <span className="rafiq-learning-hub-hero-icon" aria-hidden="true">
          <StudentIcon name="game" width="34" height="34" />
        </span>
        <div>
          <p>تحدٍّ تعليمي قصير</p>
          <h2>لعبة المطابقة</h2>
          <span>اختر المفهوم أولًا، ثم ابحث عن الوصف أو الوحدة التي تطابقه.</span>
        </div>
      </header>

      <div className="rafiq-game-rounds">
        {rounds.map(({ game, round }) => {
          const selectedLeft = selectedLeftByGame[game.id];
          const completedCount = completedPairsByGame[game.id]?.length ?? 0;
          const availableLeftItems = round.leftItems.filter(
            (item) => !isPairCompleted(game.id, item.pairId)
          );
          const availableRightItems = round.rightItems.filter(
            (item) => !isPairCompleted(game.id, item.pairId)
          );
          const gameObjectives = game.objectiveIds
            .map((objectiveId) => objectivesById.get(objectiveId))
            .filter((objective): objective is Objective => objective !== undefined);
          const complete = completedCount === round.leftItems.length;
          const progress = round.leftItems.length
            ? Math.round((completedCount / round.leftItems.length) * 100)
            : 0;

          return (
            <article key={game.id} className="rafiq-game-card">
              <div className="rafiq-game-title-row">
                <div>
                  <span>جولة مطابقة</span>
                  <h3>{game.title}</h3>
                </div>
                <strong aria-label={`التقدم ${completedCount} من ${round.leftItems.length}`}>
                  {completedCount}/{round.leftItems.length}
                </strong>
              </div>

              <div className="rafiq-game-progress" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>

              <p className="rafiq-game-instructions">{game.instructions}</p>

              <details className="rafiq-game-objectives">
                <summary>ما الذي تختبره هذه اللعبة؟</summary>
                <ul>
                  {gameObjectives.map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
                </ul>
              </details>

              {!selectedLeft && !complete ? (
                <section className="rafiq-game-stage">
                  <h4>1. اختر عنصرًا</h4>
                  <div className="rafiq-game-option-grid">
                    {availableLeftItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectLeft(game.id, item)}
                        className="rafiq-game-option"
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {selectedLeft && !complete ? (
                <section className="rafiq-game-stage">
                  <div className="rafiq-game-selected">
                    <div>
                      <span>العنصر المختار</span>
                      <strong>{selectedLeft.text}</strong>
                    </div>
                    <button type="button" onClick={() => clearSelection(game.id)}>
                      تغيير الاختيار
                    </button>
                  </div>

                  <h4>2. اختر المقابل</h4>
                  <div className="rafiq-game-option-grid">
                    {availableRightItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRight(game.id, item)}
                        className="rafiq-game-option is-answer"
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </section>
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
                <div className="rafiq-game-complete">
                  <StudentIcon name="check" width="26" height="26" aria-hidden="true" />
                  <MatchingFeedback message="اكتملت جميع المطابقات بنجاح." isCorrect />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <StudentBackAction label={backLabel} onClick={onBack} />
    </section>
  );
}

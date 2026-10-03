import { useMemo } from 'react';
import { PrecisionEngineerGame } from '@features/games/precision-engineer/PrecisionEngineerGame';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { MeasurementMissionGame } from '@features/games/measurement-mission/MeasurementMissionGame';
import { MatchingGameRunner } from '@features/games/matching/MatchingGameRunner';
import { useGamesByLesson, useObjectivesByIds } from '@services/queries/content-query.hooks';
import type { Game } from '@shared-types/game.types';
interface MatchingGameViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}
interface LoaderProps {
  games: Game[];
  onBackToLesson: () => void;
}
function MatchingGameObjectivesLoader({ games, onBackToLesson }: LoaderProps) {
  const objectiveIds = useMemo(
    () => [...new Set(games.flatMap((game) => game.objectiveIds))],
    [games]
  );
  const objectivesQuery = useObjectivesByIds(objectiveIds);
  return (
    <QueryBoundary
      isLoading={objectivesQuery.isLoading}
      error={objectivesQuery.error}
      onRetry={objectivesQuery.reload}
    >
      <MatchingGameRunner
        games={games}
        objectives={objectivesQuery.data}
        onBack={onBackToLesson}
        backLabel="العودة إلى الدرس"
      />
    </QueryBoundary>
  );
}
function BaseMatchingGameView({ lessonId, onBackToLesson }: MatchingGameViewProps) {
  const gamesQuery = useGamesByLesson(lessonId);
  if (lessonId === 'g9-phy-s1-u1-l1') return <MeasurementMissionGame onBack={onBackToLesson} />;
  return (
    <QueryBoundary
      isLoading={gamesQuery.isLoading}
      error={gamesQuery.error}
      onRetry={gamesQuery.reload}
    >
      <MatchingGameObjectivesLoader games={gamesQuery.data} onBackToLesson={onBackToLesson} />
    </QueryBoundary>
  );
}

export function MatchingGameView(props: MatchingGameViewProps) {
  if (props.lessonId === 'g9-phy-s1-u1-l2') {
    return <PrecisionEngineerGame onBack={props.onBackToLesson} />;
  }

  return <BaseMatchingGameView {...props} />;
}

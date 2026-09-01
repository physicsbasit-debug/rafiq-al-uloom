import { useMemo } from 'react';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { MatchingGameRunner } from '@features/games/matching/MatchingGameRunner';
import { useGamesByLesson, useObjectivesByIds } from '@services/queries/content-query.hooks';
import type { Game } from '@shared-types/game.types';

interface MatchingGameViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}

interface MatchingGameObjectivesLoaderProps {
  games: Game[];
  onBackToLesson: () => void;
}

function MatchingGameObjectivesLoader({
  games,
  onBackToLesson,
}: MatchingGameObjectivesLoaderProps) {
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

export function MatchingGameView({ lessonId, onBackToLesson }: MatchingGameViewProps) {
  const gamesQuery = useGamesByLesson(lessonId);

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

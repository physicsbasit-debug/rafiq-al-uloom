import type { ReactNode } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { ExperimentCard } from '@features/experiments/experiment-card';
import { MatchingGameRunner } from '@features/games/matching/MatchingGameRunner';
import type { AvailableLearningActivity, LearningActivityKind } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';

export interface StudentActivityRendererProps {
  activity: AvailableLearningActivity;
  objectivesById: ReadonlyMap<string, Objective>;
  onBackToActivities: () => void;
}

export type StudentActivityRenderer = (props: StudentActivityRendererProps) => ReactNode;

function renderMatchingActivity({
  activity,
  objectivesById,
  onBackToActivities,
}: StudentActivityRendererProps): ReactNode {
  if (activity.kind !== 'matching') {
    throw new Error('Matching activity renderer received a non-matching activity.');
  }

  const objectives = activity.objectiveIds
    .map((objectiveId) => objectivesById.get(objectiveId))
    .filter((objective): objective is Objective => objective !== undefined);

  return (
    <MatchingGameRunner
      games={[activity.content]}
      objectives={objectives}
      onBack={onBackToActivities}
      backLabel="العودة إلى الأنشطة"
    />
  );
}

function renderExperimentActivity({
  activity,
  onBackToActivities,
}: StudentActivityRendererProps): ReactNode {
  if (activity.kind !== 'experiment') {
    throw new Error('Experiment activity renderer received a non-experiment activity.');
  }

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <ExperimentCard experiment={activity.content} />
      <div style={{ maxWidth: '220px' }}>
        <AppButton label="العودة إلى الأنشطة" variant="secondary" onClick={onBackToActivities} />
      </div>
    </section>
  );
}

const STUDENT_ACTIVITY_RENDERERS: Partial<Record<LearningActivityKind, StudentActivityRenderer>> = {
  matching: renderMatchingActivity,
  experiment: renderExperimentActivity,
};

export function getStudentActivityRenderer(
  kind: LearningActivityKind
): StudentActivityRenderer | undefined {
  return STUDENT_ACTIVITY_RENDERERS[kind];
}

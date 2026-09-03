import type { ReactNode } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { DataActivityRunner } from '@features/data-activities/DataActivityRunner';
import { ExperimentCard } from '@features/experiments/experiment-card';
import { MatchingGameRunner } from '@features/games/matching/MatchingGameRunner';
import { InquiryRunner } from '@features/inquiries/InquiryRunner';
import { WaveSimulationRunner } from '@features/simulations/wave/WaveSimulationRunner';
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

function renderSimulationActivity({
  activity,
  onBackToActivities,
}: StudentActivityRendererProps): ReactNode {
  if (activity.kind !== 'simulation') {
    throw new Error('Simulation activity renderer received a non-simulation activity.');
  }

  return <WaveSimulationRunner simulation={activity.content} onBack={onBackToActivities} />;
}

function renderInquiryActivity({
  activity,
  onBackToActivities,
}: StudentActivityRendererProps): ReactNode {
  if (activity.kind !== 'inquiry') {
    throw new Error('Inquiry activity renderer received a non-inquiry activity.');
  }

  return <InquiryRunner inquiry={activity.content} onBack={onBackToActivities} />;
}

function renderDataActivity({
  activity,
  onBackToActivities,
}: StudentActivityRendererProps): ReactNode {
  if (activity.kind !== 'data') {
    throw new Error('Data activity renderer received a non-data activity.');
  }

  return <DataActivityRunner activity={activity.content} onBack={onBackToActivities} />;
}

const STUDENT_ACTIVITY_RENDERERS: Partial<Record<LearningActivityKind, StudentActivityRenderer>> = {
  matching: renderMatchingActivity,
  experiment: renderExperimentActivity,
  simulation: renderSimulationActivity,
  inquiry: renderInquiryActivity,
  data: renderDataActivity,
};

export function getStudentActivityRenderer(
  kind: LearningActivityKind
): StudentActivityRenderer | undefined {
  return STUDENT_ACTIVITY_RENDERERS[kind];
}

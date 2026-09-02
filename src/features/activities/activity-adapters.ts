import { getActivityRegistryEntry } from '@features/activities/activity-registry';
import type {
  AvailableLearningActivity,
  ExperimentActivity,
  InquiryActivity,
  MatchingActivity,
  SimulationActivity,
} from '@shared-types/activity.types';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
import type { Inquiry } from '@shared-types/inquiry.types';
import type { Simulation } from '@shared-types/simulation.types';

function assertStructuralIds(
  kind: AvailableLearningActivity['kind'],
  id: string,
  lessonId: string,
  objectiveIds: string[]
): void {
  if (!id.trim()) {
    throw new Error(`Invalid ${kind} activity: id must not be blank.`);
  }

  if (!lessonId.trim()) {
    throw new Error(`Invalid ${kind} activity "${id}": lessonId must not be blank.`);
  }

  if (objectiveIds.length === 0) {
    throw new Error(`Invalid ${kind} activity "${id}": objectiveIds must not be empty.`);
  }

  const normalizedObjectiveIds = objectiveIds.map((objectiveId) => objectiveId.trim());

  if (normalizedObjectiveIds.some((objectiveId) => objectiveId.length === 0)) {
    throw new Error(`Invalid ${kind} activity "${id}": objectiveIds must not contain blanks.`);
  }

  if (new Set(normalizedObjectiveIds).size !== normalizedObjectiveIds.length) {
    throw new Error(`Invalid ${kind} activity "${id}": objectiveIds must not contain duplicates.`);
  }
}

function assertSingleLesson(activities: AvailableLearningActivity[]): void {
  const lessonIds = new Set(activities.map((activity) => activity.lessonId));

  if (lessonIds.size > 1) {
    throw new Error(
      'Invalid lesson activity catalog: activities from multiple lessons were mixed.'
    );
  }
}

export function toMatchingActivity(game: Game): MatchingActivity {
  assertStructuralIds('matching', game.id, game.lessonId, game.objectiveIds);

  return {
    id: game.id,
    lessonId: game.lessonId,
    kind: 'matching',
    title: game.title,
    objectiveIds: [...game.objectiveIds],
    status: game.status,
    source: game.source,
    content: game,
  };
}

export function toExperimentActivity(experiment: Experiment): ExperimentActivity {
  assertStructuralIds('experiment', experiment.id, experiment.lessonId, experiment.objectiveIds);

  return {
    id: experiment.id,
    lessonId: experiment.lessonId,
    kind: 'experiment',
    title: experiment.title,
    objectiveIds: [...experiment.objectiveIds],
    status: experiment.status,
    source: experiment.source,
    content: experiment,
  };
}

export function toSimulationActivity(simulation: Simulation): SimulationActivity {
  assertStructuralIds('simulation', simulation.id, simulation.lessonId, simulation.objectiveIds);

  return {
    id: simulation.id,
    lessonId: simulation.lessonId,
    kind: 'simulation',
    title: simulation.title,
    objectiveIds: [...simulation.objectiveIds],
    status: simulation.status,
    source: simulation.source,
    content: simulation,
  };
}

export function toInquiryActivity(inquiry: Inquiry): InquiryActivity {
  assertStructuralIds('inquiry', inquiry.id, inquiry.lessonId, inquiry.objectiveIds);

  return {
    id: inquiry.id,
    lessonId: inquiry.lessonId,
    kind: 'inquiry',
    title: inquiry.title,
    objectiveIds: [...inquiry.objectiveIds],
    status: inquiry.status,
    source: inquiry.source,
    content: inquiry,
  };
}

export function buildLessonActivities(
  games: Game[],
  experiments: Experiment[],
  simulations: Simulation[],
  inquiries: Inquiry[]
): AvailableLearningActivity[] {
  const activities: AvailableLearningActivity[] = [
    ...games.map(toMatchingActivity),
    ...experiments.map(toExperimentActivity),
    ...simulations.map(toSimulationActivity),
    ...inquiries.map(toInquiryActivity),
  ];

  assertSingleLesson(activities);

  return activities
    .map((activity, repositoryIndex) => ({ activity, repositoryIndex }))
    .sort((left, right) => {
      const leftOrder = getActivityRegistryEntry(left.activity.kind)?.displayOrder;
      const rightOrder = getActivityRegistryEntry(right.activity.kind)?.displayOrder;

      if (leftOrder === undefined || rightOrder === undefined) {
        throw new Error('Invalid activity registry: available activity kind is not registered.');
      }

      return leftOrder - rightOrder || left.repositoryIndex - right.repositoryIndex;
    })
    .map(({ activity }) => activity);
}

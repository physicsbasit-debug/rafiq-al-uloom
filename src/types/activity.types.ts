import type { ContentSource, ContentStatus } from './content.types';
import type { Experiment } from './experiment.types';
import type { Game } from './game.types';

export type LearningActivityKind = 'matching' | 'experiment' | 'simulation' | 'inquiry' | 'data';

export interface LearningActivityBase {
  id: string;
  lessonId: string;
  kind: LearningActivityKind;
  title: string;
  objectiveIds: string[];
  status: ContentStatus;
  source: ContentSource;
}

export interface MatchingActivity extends LearningActivityBase {
  kind: 'matching';
  content: Game;
}

export interface ExperimentActivity extends LearningActivityBase {
  kind: 'experiment';
  content: Experiment;
}

export type AvailableLearningActivity = MatchingActivity | ExperimentActivity;

import type { ContentSource, ContentStatus } from './content.types';
import type { ScientificDataActivity } from './data-activity.types';
import type { Experiment } from './experiment.types';
import type { Game } from './game.types';
import type { Inquiry } from './inquiry.types';
import type { Simulation } from './simulation.types';

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

export interface SimulationActivity extends LearningActivityBase {
  kind: 'simulation';
  content: Simulation;
}

export interface InquiryActivity extends LearningActivityBase {
  kind: 'inquiry';
  content: Inquiry;
}

export interface DataActivity extends LearningActivityBase {
  kind: 'data';
  content: ScientificDataActivity;
}

export type AvailableLearningActivity =
  MatchingActivity | ExperimentActivity | SimulationActivity | InquiryActivity | DataActivity;

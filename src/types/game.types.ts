import type { ContentSource, ContentStatus } from './content.types';

export type GameType = 'matching';

export interface MatchingItem {
  left: string;
  right: string;
}

export interface Game {
  id: string;
  lessonId: string;
  type: GameType;
  title: string;
  instructions: string;
  items: MatchingItem[];
  objectiveIds: string[];
  status: ContentStatus;
  source: ContentSource;
}

import type { ContentSource, ContentStatus } from './content.types';

export type QuestionType = 'multiple_choice';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  lessonId: string;
  type: QuestionType;
  prompt: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation: string;
  objectiveId: string;
  difficulty: Difficulty;
  status: ContentStatus;
  source: ContentSource;
}

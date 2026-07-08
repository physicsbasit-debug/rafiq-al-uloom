import type { ContentSource, ContentStatus } from './content.types';

export type SafetyLevel = 'safe_home' | 'teacher_supervised' | 'lab_only' | 'not_allowed';

export interface Experiment {
  id: string;
  lessonId: string;
  title: string;
  objective: string;
  tools: string[];
  steps: string[];
  safetyNotes: string[];
  safetyLevel: SafetyLevel;
  observationPrompt: string;
  conclusionPrompt: string;
  homeAlternative: string | null;
  status: ContentStatus;
  source: ContentSource;
}

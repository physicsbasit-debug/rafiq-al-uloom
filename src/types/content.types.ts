export type ContentStatus = 'draft' | 'pending_review' | 'approved';
export type ContentSource = 'ai_generated' | 'teacher_authored' | 'curriculum_seed';

export interface Grade {
  id: string;
  name: string;
  order: number;
}

export interface Subject {
  id: string;
  gradeId: string;
  name: string;
  themeColor: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  title: string;
  order: number;
}

export interface Objective {
  id: string;
  lessonId: string;
  text: string;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  order: number;
  objectiveIds: string[];
  summary: string;
  keyConcepts: string[];
  examples: string[];
  misconceptions: string[];
  status: ContentStatus;
  source: ContentSource;
}

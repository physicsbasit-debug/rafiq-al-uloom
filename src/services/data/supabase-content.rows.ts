/**
 * Raw row shapes returned by the Supabase content tables.
 *
 * These interfaces mirror the PostgreSQL schema created in Phase 2-B2a.
 * Runtime validation remains the responsibility of the mapper layer because
 * data crossing a network boundary cannot be trusted solely through types.
 */

export type ContentStatusRow = 'draft' | 'pending_review' | 'approved';
export type ContentSourceRow = 'ai_generated' | 'teacher_authored' | 'curriculum_seed';
export type QuestionPurposeRow = 'review' | 'mastery';
export type QuestionTypeRow = 'multiple_choice';
export type QuestionDifficultyRow = 'easy' | 'medium' | 'hard';
export type GameTypeRow = 'matching';
export type SafetyLevelRow = 'safe_home' | 'teacher_supervised' | 'lab_only' | 'not_allowed';
export type SimulationEngineKindRow = 'transverse_wave_v1';

export interface GradeRow {
  id: string;
  name: string;
  display_order: number;
}

export interface SemesterRow {
  id: string;
  grade_id: string;
  name: string;
  display_order: number;
}

export interface SubjectRow {
  id: string;
  grade_id: string;
  name: string;
  theme_color: string;
}

export interface UnitRow {
  id: string;
  subject_id: string;
  semester_id: string;
  title: string;
  display_order: number;
}

export interface LessonRow {
  id: string;
  unit_id: string;
  title: string;
  display_order: number;
  summary: string;
  key_concepts: string[];
  examples: string[];
  misconceptions: string[];
  status: ContentStatusRow;
  source: ContentSourceRow;
}

export interface ObjectiveRow {
  id: string;
  lesson_id: string;
  text: string;
}

export interface QuestionRow {
  id: string;
  lesson_id: string;
  purpose: QuestionPurposeRow;
  type: QuestionTypeRow;
  prompt: string;
  choices: string[];
  correct_answer_index: number;
  explanation: string;
  objective_id: string;
  difficulty: QuestionDifficultyRow;
  status: ContentStatusRow;
  source: ContentSourceRow;
}

export interface GameRow {
  id: string;
  lesson_id: string;
  type: GameTypeRow;
  title: string;
  instructions: string;
  items: unknown;
  status: ContentStatusRow;
  source: ContentSourceRow;
}

export interface ExperimentRow {
  id: string;
  lesson_id: string;
  title: string;
  objective: string;
  tools: string[];
  steps: string[];
  safety_notes: string[];
  safety_level: SafetyLevelRow;
  observation_prompt: string;
  conclusion_prompt: string;
  home_alternative: string | null;
  status: ContentStatusRow;
  source: ContentSourceRow;
}

export interface ExperimentObjectiveRow {
  experiment_id: string;
  objective_id: string;
  lesson_id: string;
  position: number;
}

export interface GameObjectiveRow {
  game_id: string;
  objective_id: string;
  position: number;
}

export interface SimulationRow {
  id: string;
  lesson_id: string;
  title: string;
  instructions: string;
  engine_kind: SimulationEngineKindRow;
  config: unknown;
  status: ContentStatusRow;
  source: ContentSourceRow;
}

export interface SimulationObjectiveRow {
  simulation_id: string;
  objective_id: string;
  lesson_id: string;
  position: number;
}

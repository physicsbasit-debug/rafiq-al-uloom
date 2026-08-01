-- Phase 2-B2a: Schema Core Migration
-- Scope: enums, tables, foreign keys, constraints, and indexes only.
-- Explicitly excluded: RLS, policies, grants, seed data, and provider code.

CREATE TYPE public.content_status AS ENUM (
  'draft',
  'pending_review',
  'approved'
);

CREATE TYPE public.content_source AS ENUM (
  'ai_generated',
  'teacher_authored',
  'curriculum_seed'
);

CREATE TYPE public.safety_level AS ENUM (
  'safe_home',
  'teacher_supervised',
  'lab_only',
  'not_allowed'
);

CREATE TABLE public.grades (
  id text PRIMARY KEY,
  name text NOT NULL,
  display_order integer NOT NULL
);

CREATE TABLE public.semesters (
  id text PRIMARY KEY,
  grade_id text NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL,
  CONSTRAINT semesters_grade_id_fkey
    FOREIGN KEY (grade_id)
    REFERENCES public.grades(id)
    ON DELETE RESTRICT
);

CREATE TABLE public.subjects (
  id text PRIMARY KEY,
  grade_id text NOT NULL,
  name text NOT NULL,
  theme_color text NOT NULL,
  CONSTRAINT subjects_grade_id_fkey
    FOREIGN KEY (grade_id)
    REFERENCES public.grades(id)
    ON DELETE RESTRICT
);

CREATE TABLE public.units (
  id text PRIMARY KEY,
  subject_id text NOT NULL,
  semester_id text NOT NULL,
  title text NOT NULL,
  display_order integer NOT NULL,
  CONSTRAINT units_subject_id_fkey
    FOREIGN KEY (subject_id)
    REFERENCES public.subjects(id)
    ON DELETE RESTRICT,
  CONSTRAINT units_semester_id_fkey
    FOREIGN KEY (semester_id)
    REFERENCES public.semesters(id)
    ON DELETE RESTRICT,
  CONSTRAINT units_subject_semester_order_key
    UNIQUE (subject_id, semester_id, display_order)
);

CREATE TABLE public.lessons (
  id text PRIMARY KEY,
  unit_id text NOT NULL,
  title text NOT NULL,
  display_order integer NOT NULL,
  summary text NOT NULL,
  key_concepts text[] NOT NULL,
  examples text[] NOT NULL,
  misconceptions text[] NOT NULL,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT lessons_unit_id_fkey
    FOREIGN KEY (unit_id)
    REFERENCES public.units(id)
    ON DELETE RESTRICT,
  CONSTRAINT lessons_unit_order_key
    UNIQUE (unit_id, display_order)
);

CREATE TABLE public.objectives (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  text text NOT NULL,
  CONSTRAINT objectives_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT
);

CREATE TABLE public.questions (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  purpose text NOT NULL,
  type text NOT NULL DEFAULT 'multiple_choice',
  prompt text NOT NULL,
  choices text[] NOT NULL,
  correct_answer_index integer NOT NULL,
  explanation text NOT NULL,
  objective_id text NOT NULL,
  difficulty text NOT NULL,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT questions_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT questions_objective_id_fkey
    FOREIGN KEY (objective_id)
    REFERENCES public.objectives(id)
    ON DELETE RESTRICT,
  CONSTRAINT questions_purpose_check
    CHECK (purpose IN ('review', 'mastery')),
  CONSTRAINT questions_correct_answer_index_check
    CHECK (correct_answer_index >= 0)
);

CREATE TABLE public.games (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  type text NOT NULL DEFAULT 'matching',
  title text NOT NULL,
  instructions text NOT NULL,
  items jsonb NOT NULL,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT games_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT
);

CREATE TABLE public.experiments (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  title text NOT NULL,
  objective text NOT NULL,
  tools text[] NOT NULL,
  steps text[] NOT NULL,
  safety_notes text[] NOT NULL,
  safety_level public.safety_level NOT NULL,
  observation_prompt text NOT NULL,
  conclusion_prompt text NOT NULL,
  home_alternative text,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT experiments_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT
);

CREATE TABLE public.game_objectives (
  game_id text NOT NULL,
  objective_id text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT game_objectives_pkey
    PRIMARY KEY (game_id, objective_id),
  CONSTRAINT game_objectives_game_position_key
    UNIQUE (game_id, position),
  CONSTRAINT game_objectives_position_check
    CHECK (position >= 0),
  CONSTRAINT game_objectives_game_id_fkey
    FOREIGN KEY (game_id)
    REFERENCES public.games(id)
    ON DELETE RESTRICT,
  CONSTRAINT game_objectives_objective_id_fkey
    FOREIGN KEY (objective_id)
    REFERENCES public.objectives(id)
    ON DELETE RESTRICT
);

CREATE INDEX semesters_grade_id_idx
  ON public.semesters (grade_id);

CREATE INDEX subjects_grade_id_idx
  ON public.subjects (grade_id);

CREATE INDEX units_subject_id_semester_id_idx
  ON public.units (subject_id, semester_id);

CREATE INDEX lessons_unit_id_idx
  ON public.lessons (unit_id);

CREATE INDEX objectives_lesson_id_idx
  ON public.objectives (lesson_id);

CREATE INDEX questions_lesson_id_purpose_idx
  ON public.questions (lesson_id, purpose);

CREATE INDEX questions_objective_id_idx
  ON public.questions (objective_id);

CREATE INDEX games_lesson_id_idx
  ON public.games (lesson_id);

CREATE INDEX experiments_lesson_id_idx
  ON public.experiments (lesson_id);

CREATE INDEX game_objectives_objective_id_idx
  ON public.game_objectives (objective_id);
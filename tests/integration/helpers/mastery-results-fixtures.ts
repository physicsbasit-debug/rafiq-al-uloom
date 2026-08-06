import { randomUUID } from 'node:crypto';

import type { Question } from '@shared-types/quiz.types';
import type { AnswersByQuestionId } from '@utils/scoring';

import { psqlAdmin } from './supabase-auth-fixtures';

interface FixtureQuestionSpec {
  readonly id: string;
  readonly prompt: string;
  readonly correctAnswerIndex: number;
  readonly explanation: string;
  readonly difficulty: Question['difficulty'];
}

export interface MasteryResultsFixture {
  readonly lessonId: string;
  readonly objectiveId: string;
  readonly displayOrder: number;
  readonly questions: readonly FixtureQuestionSpec[];
}

export interface StoredMasteryAttemptSnapshot {
  readonly attemptId: string;
  readonly submissionId: string;
  readonly userId: string;
  readonly lessonId: string;
  readonly questionCount: number;
  readonly correctCount: number;
  readonly percentage: number;
  readonly scoringFingerprint: string;
  readonly answerCount: number;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlTextArray(values: readonly string[]): string {
  return `ARRAY[${values.map(sqlLiteral).join(',')}]::text[]`;
}

export function createMasteryResultsFixture(label = 'd4'): MasteryResultsFixture {
  const runId = randomUUID().replaceAll('-', '').slice(0, 16);
  const displayOrder = 970_000_000 + (Number.parseInt(runId.slice(0, 6), 16) % 20_000_000);

  return {
    lessonId: `${label}-درس-${runId}`,
    objectiveId: `${label}-objective-${runId}`,
    displayOrder,
    questions: [
      {
        id: `${label}-question-a-${runId}`,
        prompt: 'السؤال الأول',
        correctAnswerIndex: 0,
        explanation: 'الإجابة الأولى صحيحة.',
        difficulty: 'easy',
      },
      {
        id: `${label}-سؤال-ب-${runId}`,
        prompt: 'السؤال الثاني',
        correctAnswerIndex: 1,
        explanation: 'الإجابة الثانية صحيحة.',
        difficulty: 'medium',
      },
      {
        id: `${label}-ž-question-c-${runId}`,
        prompt: 'السؤال الثالث',
        correctAnswerIndex: 2,
        explanation: 'الإجابة الثالثة صحيحة.',
        difficulty: 'hard',
      },
    ],
  };
}

export function installMasteryResultsFixture(fixture: MasteryResultsFixture): void {
  const choices = ['أ', 'ب', 'ج', 'د'];
  const questionValues = fixture.questions
    .map(
      (question) => `(
        ${sqlLiteral(question.id)},
        ${sqlLiteral(fixture.lessonId)},
        'mastery',
        'multiple_choice',
        ${sqlLiteral(question.prompt)},
        ${sqlTextArray(choices)},
        ${question.correctAnswerIndex},
        ${sqlLiteral(question.explanation)},
        ${sqlLiteral(fixture.objectiveId)},
        ${sqlLiteral(question.difficulty)},
        'approved',
        'curriculum_seed'
      )`
    )
    .join(',\n');

  psqlAdmin(`
    INSERT INTO public.lessons (
      id, unit_id, title, display_order, summary, key_concepts,
      examples, misconceptions, status, source
    ) VALUES (
      ${sqlLiteral(fixture.lessonId)},
      'g10-phy-waves-unit',
      'D4 composition and parity fixture',
      ${fixture.displayOrder},
      'Dedicated approved lesson for Phase 2-D4 integration tests.',
      ARRAY['D4']::text[],
      ARRAY['D4']::text[],
      ARRAY['D4']::text[],
      'approved',
      'curriculum_seed'
    );

    INSERT INTO public.objectives (id, lesson_id, text)
    VALUES (
      ${sqlLiteral(fixture.objectiveId)},
      ${sqlLiteral(fixture.lessonId)},
      'D4 mastery objective'
    );

    INSERT INTO public.questions (
      id, lesson_id, purpose, type, prompt, choices,
      correct_answer_index, explanation, objective_id,
      difficulty, status, source
    ) VALUES
      ${questionValues};
  `);
}

export function removeMasteryResultsFixture(fixture: MasteryResultsFixture): void {
  psqlAdmin(`
    DELETE FROM public.questions
    WHERE lesson_id = ${sqlLiteral(fixture.lessonId)};

    DELETE FROM public.objectives
    WHERE id = ${sqlLiteral(fixture.objectiveId)};

    DELETE FROM public.lessons
    WHERE id = ${sqlLiteral(fixture.lessonId)};
  `);
}

export function answersForPattern(
  questions: readonly Question[],
  correctPattern: readonly boolean[]
): AnswersByQuestionId {
  if (questions.length !== correctPattern.length) {
    throw new Error('Question and answer-pattern lengths must match.');
  }

  return Object.fromEntries(
    questions.map((question, index) => [
      question.id,
      correctPattern[index]
        ? question.correctAnswerIndex
        : (question.correctAnswerIndex + 1) % question.choices.length,
    ])
  );
}

export function readQuestionIdsInDatabaseOrder(lessonId: string): string[] {
  const output = psqlAdmin(`
    SELECT id
    FROM public.questions
    WHERE lesson_id = ${sqlLiteral(lessonId)}
      AND purpose = 'mastery'
      AND status = 'approved'
    ORDER BY id ASC;
  `);

  return output ? output.split(/\r?\n/) : [];
}

export function readStoredMasteryAttempt(
  userId: string,
  submissionId: string
): StoredMasteryAttemptSnapshot {
  const output = psqlAdmin(`
    SELECT json_build_object(
      'attemptId', attempt.id,
      'submissionId', attempt.submission_id,
      'userId', attempt.user_id,
      'lessonId', attempt.lesson_id,
      'questionCount', attempt.question_count,
      'correctCount', attempt.correct_count,
      'percentage', attempt.percentage,
      'scoringFingerprint', attempt.scoring_fingerprint,
      'answerCount', (
        SELECT count(*)
        FROM public.mastery_attempt_answers AS answer
        WHERE answer.attempt_id = attempt.id
      )
    )::text
    FROM public.mastery_attempts AS attempt
    WHERE attempt.user_id = ${sqlLiteral(userId)}::uuid
      AND attempt.submission_id = ${sqlLiteral(submissionId)}::uuid;
  `);

  if (!output) {
    throw new Error(`Stored mastery attempt ${submissionId} was not found.`);
  }

  return JSON.parse(output) as StoredMasteryAttemptSnapshot;
}

export function countStoredAttempts(userId: string, submissionId: string): number {
  const output = psqlAdmin(`
    SELECT count(*)
    FROM public.mastery_attempts
    WHERE user_id = ${sqlLiteral(userId)}::uuid
      AND submission_id = ${sqlLiteral(submissionId)}::uuid;
  `);

  return Number.parseInt(output, 10);
}

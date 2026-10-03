import { execFileSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

import type { ContentRepository } from '@services/data/content.repository';
import { asyncLocalContentRepository } from '@services/data/async-local-content.repository';
import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';

function readLocalSupabaseEnvironment(): Record<string, string> {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 1) {
          throw new Error(`Invalid Supabase environment line: ${line}`);
        }

        const key = line.slice(0, separator);
        const rawValue = line.slice(separator + 1);
        return [key, rawValue.replace(/^"|"$/g, '')];
      })
  );
}

interface ParityContext {
  local: ContentRepository;
  supabase: ContentRepository;
  gradeId: string;
  semesterId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  reversedObjectiveIds: string[];
}

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('SupabaseContentRepository parity', () => {
  let context: ParityContext;

  beforeAll(async () => {
    const env = readLocalSupabaseEnvironment();
    const apiUrl = env.API_URL;
    const serviceRoleKey = env.SERVICE_ROLE_KEY;

    if (!apiUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase local API_URL/SERVICE_ROLE_KEY are unavailable. Run npx supabase start first.'
      );
    }

    const client = createClient(apiUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const supabase = createSupabaseContentRepository(client);
    const local = asyncLocalContentRepository;

    const gradeId = 'g10';
    const semesterId = 'g10-sem2';
    const subjectId = 'g10-physics';
    const unitId = 'g10-phy-waves-unit';
    const lessonId = 'g10-phy-waves-l1';

    const [grade, semester, subject, unit, lesson] = await Promise.all([
      local.getGrades().then((rows) => rows.find(({ id }) => id === gradeId)),
      local.getSemestersByGrade(gradeId).then((rows) => rows.find(({ id }) => id === semesterId)),
      local
        .getSubjectsBySemester(semesterId)
        .then((rows) => rows.find(({ id }) => id === subjectId)),
      local
        .getUnitsBySubjectAndSemester(subjectId, semesterId)
        .then((rows) => rows.find(({ id }) => id === unitId)),
      local.getLessonById(lessonId),
    ]);

    if (!grade || !semester || !subject || !unit || !lesson) {
      throw new Error('Local rich wave parity fixture is incomplete.');
    }

    const objectives = await local.getObjectivesByLesson(lessonId);

    context = {
      local,
      supabase,
      gradeId,
      semesterId,
      subjectId,
      unitId,
      lessonId,
      reversedObjectiveIds: objectives.map(({ id }) => id).reverse(),
    };
  });

  it('getGrades', async () => {
    expect(await context.supabase.getGrades()).toEqual(await context.local.getGrades());
  });

  it('getSemestersByGrade', async () => {
    expect(await context.supabase.getSemestersByGrade(context.gradeId)).toEqual(
      await context.local.getSemestersByGrade(context.gradeId)
    );
  });

  it('getSubjectsBySemester', async () => {
    expect(await context.supabase.getSubjectsBySemester(context.semesterId)).toEqual(
      await context.local.getSubjectsBySemester(context.semesterId)
    );
  });

  it('getUnitsBySubjectAndSemester', async () => {
    expect(
      await context.supabase.getUnitsBySubjectAndSemester(context.subjectId, context.semesterId)
    ).toEqual(
      await context.local.getUnitsBySubjectAndSemester(context.subjectId, context.semesterId)
    );
  });

  it('getUnitsBySubject', async () => {
    expect(await context.supabase.getUnitsBySubject(context.subjectId)).toEqual(
      await context.local.getUnitsBySubject(context.subjectId)
    );
  });

  it('getLessonsByUnit', async () => {
    expect(await context.supabase.getLessonsByUnit(context.unitId)).toEqual(
      await context.local.getLessonsByUnit(context.unitId)
    );
  });

  it('getLessonById', async () => {
    expect(await context.supabase.getLessonById(context.lessonId)).toEqual(
      await context.local.getLessonById(context.lessonId)
    );
  });

  it('getObjectivesByLesson', async () => {
    expect(await context.supabase.getObjectivesByLesson(context.lessonId)).toEqual(
      await context.local.getObjectivesByLesson(context.lessonId)
    );
  });

  it('getObjectivesByIds مع ترتيب معكوس للمدخلات', async () => {
    expect(await context.supabase.getObjectivesByIds(context.reversedObjectiveIds)).toEqual(
      await context.local.getObjectivesByIds(context.reversedObjectiveIds)
    );
  });

  it('getExperimentsByLesson يحافظ على objectiveIds ويطابق Local', async () => {
    const supabaseExperiments = await context.supabase.getExperimentsByLesson(context.lessonId);
    const localExperiments = await context.local.getExperimentsByLesson(context.lessonId);

    expect(supabaseExperiments).toEqual(localExperiments);
    expect(supabaseExperiments.length).toBeGreaterThan(0);
    for (const experiment of supabaseExperiments) {
      expect(experiment.objectiveIds.length).toBeGreaterThan(0);
    }
  });

  it('getReviewQuestionsByLesson', async () => {
    expect(await context.supabase.getReviewQuestionsByLesson(context.lessonId)).toEqual(
      await context.local.getReviewQuestionsByLesson(context.lessonId)
    );
  });

  it('getMasteryQuestionsByLesson', async () => {
    expect(await context.supabase.getMasteryQuestionsByLesson(context.lessonId)).toEqual(
      await context.local.getMasteryQuestionsByLesson(context.lessonId)
    );
  });

  it('getGamesByLesson', async () => {
    expect(await context.supabase.getGamesByLesson(context.lessonId)).toEqual(
      await context.local.getGamesByLesson(context.lessonId)
    );
  });
});

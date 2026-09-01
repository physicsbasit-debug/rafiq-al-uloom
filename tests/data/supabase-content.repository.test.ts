import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';

interface PlannedQuery {
  table: string;
  data?: unknown;
  error?: unknown;
  rejection?: unknown;
}

interface QueryCall {
  table: string;
  operations: Array<{ name: string; args: unknown[] }>;
}

class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
  constructor(
    private readonly plan: PlannedQuery,
    readonly call: QueryCall
  ) {}

  select(...args: unknown[]) {
    return this.record('select', args);
  }

  eq(...args: unknown[]) {
    return this.record('eq', args);
  }

  in(...args: unknown[]) {
    return this.record('in', args);
  }

  order(...args: unknown[]) {
    return this.record('order', args);
  }

  limit(...args: unknown[]) {
    return this.record('limit', args);
  }

  abortSignal(...args: unknown[]) {
    return this.record('abortSignal', args);
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    if ('rejection' in this.plan) {
      return Promise.reject(this.plan.rejection).then(onfulfilled, onrejected);
    }

    return Promise.resolve({
      data: 'data' in this.plan ? this.plan.data : [],
      error: this.plan.error ?? null,
    }).then(onfulfilled, onrejected);
  }

  private record(name: string, args: unknown[]) {
    this.call.operations.push({ name, args });
    return this;
  }
}

function createFakeClient(plans: PlannedQuery[]) {
  const remaining = [...plans];
  const calls: QueryCall[] = [];

  const client = {
    from(table: string) {
      const plan = remaining.shift();
      if (!plan) {
        throw new Error(`Unexpected query for table ${table}`);
      }
      if (plan.table !== table) {
        throw new Error(`Expected query for ${plan.table}, received ${table}`);
      }

      const call: QueryCall = { table, operations: [] };
      calls.push(call);
      return new FakeQueryBuilder(plan, call);
    },
  } as unknown as SupabaseClient;

  return { client, calls, remaining };
}

const lessonRow = {
  id: 'lesson-1',
  unit_id: 'unit-1',
  title: 'درس',
  display_order: 1,
  summary: 'ملخص',
  key_concepts: ['مفهوم'],
  examples: ['مثال'],
  misconceptions: ['تصور'],
  status: 'draft',
  source: 'curriculum_seed',
};

const gameRow = {
  id: 'game-1',
  lesson_id: 'lesson-1',
  type: 'matching',
  title: 'لعبة',
  instructions: 'طابق',
  items: [{ left: 'أ', right: 'ب' }],
  status: 'draft',
  source: 'curriculum_seed',
};

const experimentRow = {
  id: 'experiment-1',
  lesson_id: 'lesson-1',
  title: 'تجربة',
  objective: 'هدف وصفي',
  tools: ['أداة'],
  steps: ['خطوة'],
  safety_notes: ['ملاحظة'],
  safety_level: 'safe_home',
  observation_prompt: 'ماذا لاحظت؟',
  conclusion_prompt: 'ماذا تستنتج؟',
  home_alternative: null,
  status: 'draft',
  source: 'curriculum_seed',
};

describe('supabase content repository', () => {
  it('يجلب الدروس والأهداف باستعلامين ثابتين ويحافظ على ترتيب objectiveIds', async () => {
    const { client, calls } = createFakeClient([
      { table: 'lessons', data: [lessonRow] },
      {
        table: 'objectives',
        data: [
          { id: 'o2', lesson_id: 'lesson-1', text: 'الثاني' },
          { id: 'o1', lesson_id: 'lesson-1', text: 'الأول' },
        ],
      },
    ]);

    const repository = createSupabaseContentRepository(client);
    const result = await repository.getLessonsByUnit('unit-1');

    expect(result[0]?.objectiveIds).toEqual(['o2', 'o1']);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.table)).toEqual(['lessons', 'objectives']);
    expect(calls[1]?.operations).toContainEqual({
      name: 'in',
      args: ['lesson_id', ['lesson-1']],
    });
  });

  it('لا ينفذ استعلام أهداف عندما لا توجد دروس', async () => {
    const { client, calls } = createFakeClient([{ table: 'lessons', data: [] }]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getLessonsByUnit('missing')).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('يجلب الألعاب وعلاقاتها باستعلامين ويحافظ على ترتيب position الوارد', async () => {
    const { client, calls } = createFakeClient([
      { table: 'games', data: [gameRow] },
      {
        table: 'game_objectives',
        data: [
          { game_id: 'game-1', objective_id: 'o2', position: 0 },
          { game_id: 'game-1', objective_id: 'o1', position: 1 },
        ],
      },
    ]);
    const repository = createSupabaseContentRepository(client);

    const result = await repository.getGamesByLesson('lesson-1');

    expect(result[0]?.objectiveIds).toEqual(['o2', 'o1']);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.operations.filter((operation) => operation.name === 'order')).toEqual([
      { name: 'order', args: ['game_id'] },
      { name: 'order', args: ['position'] },
    ]);
  });

  it('يجلب التجارب وروابط أهدافها باستعلامين ويحافظ على ترتيب position', async () => {
    const { client, calls } = createFakeClient([
      { table: 'experiments', data: [experimentRow] },
      {
        table: 'experiment_objectives',
        data: [
          {
            experiment_id: 'experiment-1',
            objective_id: 'o2',
            lesson_id: 'lesson-1',
            position: 0,
          },
          {
            experiment_id: 'experiment-1',
            objective_id: 'o1',
            lesson_id: 'lesson-1',
            position: 1,
          },
        ],
      },
    ]);
    const repository = createSupabaseContentRepository(client);

    const result = await repository.getExperimentsByLesson('lesson-1');

    expect(result[0]?.objectiveIds).toEqual(['o2', 'o1']);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.table)).toEqual(['experiments', 'experiment_objectives']);
    expect(calls[1]?.operations).toContainEqual({
      name: 'in',
      args: ['experiment_id', ['experiment-1']],
    });
    expect(calls[1]?.operations.filter((operation) => operation.name === 'order')).toEqual([
      { name: 'order', args: ['experiment_id'] },
      { name: 'order', args: ['position'] },
    ]);
  });

  it('لا ينفذ استعلام روابط تجارب عندما لا توجد تجارب', async () => {
    const { client, calls } = createFakeClient([{ table: 'experiments', data: [] }]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getExperimentsByLesson('missing')).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('يرفض رابط تجربة يحمل lesson_id مختلفًا عن التجربة المطلوبة', async () => {
    const { client } = createFakeClient([
      { table: 'experiments', data: [experimentRow] },
      {
        table: 'experiment_objectives',
        data: [
          {
            experiment_id: 'experiment-1',
            objective_id: 'o1',
            lesson_id: 'lesson-2',
            position: 0,
          },
        ],
      },
    ]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getExperimentsByLesson('lesson-1')).rejects.toThrow(
      'lesson_id lesson-2 does not match experiment lesson lesson-1'
    );
  });

  it('يمرر AbortSignal إلى كل استعلام في العملية متعددة الدفعات', async () => {
    const controller = new AbortController();
    const { client, calls } = createFakeClient([
      { table: 'lessons', data: [lessonRow] },
      { table: 'objectives', data: [] },
    ]);
    const repository = createSupabaseContentRepository(client);

    await repository.getLessonsByUnit('unit-1', { signal: controller.signal });

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.operations).toContainEqual({
        name: 'abortSignal',
        args: [controller.signal],
      });
    }
  });

  it('يرفض قبل إنشاء أي استعلام عند وصول إشارة ملغاة مسبقًا', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('cancelled', 'AbortError'));
    const { client, calls } = createFakeClient([]);
    const repository = createSupabaseContentRepository(client);

    await expect(
      repository.getObjectivesByIds([], { signal: controller.signal })
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(calls).toEqual([]);
  });

  it('يعيد AbortError نفسه بلا تغليف عندما يصل ضمن response.error', async () => {
    const abortError = new DOMException('cancelled', 'AbortError');
    const { client } = createFakeClient([{ table: 'grades', error: abortError }]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getGrades()).rejects.toBe(abortError);
  });

  it('يعيد AbortError نفسه بلا تغليف عند رفض الوعد مباشرة', async () => {
    const abortError = new DOMException('cancelled', 'AbortError');
    const { client } = createFakeClient([{ table: 'grades', rejection: abortError }]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getGrades()).rejects.toBe(abortError);
  });

  it('يغلف خطأ Supabase العادي باسم العملية مرة واحدة', async () => {
    const { client } = createFakeClient([
      { table: 'grades', error: { message: 'database unavailable' } },
    ]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getGrades()).rejects.toThrow('getGrades: database unavailable');
  });

  it('يغلف رفض الوعد العادي باسم العملية', async () => {
    const { client } = createFakeClient([
      { table: 'grades', rejection: new Error('fetch failed') },
    ]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getGrades()).rejects.toThrow('getGrades: fetch failed');
  });

  it('لا يكرر اسم العملية عند تغليف خطأ منشأ داخل executeQuery', async () => {
    const { client } = createFakeClient([{ table: 'grades', data: null }]);
    const repository = createSupabaseContentRepository(client);

    const error = await repository.getGrades().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('getGrades: returned no data');
  });

  it('لا ينشئ استعلامًا عند طلب قائمة أهداف فارغة', async () => {
    const { client, calls } = createFakeClient([]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getObjectivesByIds([])).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });

  it('يفصل purpose بين أسئلة المراجعة والإتقان', async () => {
    const reviewClient = createFakeClient([{ table: 'questions', data: [] }]);
    const masteryClient = createFakeClient([{ table: 'questions', data: [] }]);

    await createSupabaseContentRepository(reviewClient.client).getReviewQuestionsByLesson('l1');
    await createSupabaseContentRepository(masteryClient.client).getMasteryQuestionsByLesson('l1');

    expect(reviewClient.calls[0]?.operations).toContainEqual({
      name: 'eq',
      args: ['purpose', 'review'],
    });
    expect(masteryClient.calls[0]?.operations).toContainEqual({
      name: 'eq',
      args: ['purpose', 'mastery'],
    });
  });

  it('لا يهيئ العميل الافتراضي عند مجرد استيراد الوحدة', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('@services/data/supabase-content.repository')).resolves.toBeDefined();
    vi.unstubAllEnvs();
  });

  it('يرتب مادتين حسب أول ظهورهما في الوحدات لا حسب ترتيب استجابة المواد', async () => {
    const physics = {
      id: 'physics',
      grade_id: 'g10',
      name: 'الفيزياء',
      theme_color: '#111111',
    };
    const chemistry = {
      id: 'chemistry',
      grade_id: 'g10',
      name: 'الكيمياء',
      theme_color: '#222222',
    };
    const { client, calls } = createFakeClient([
      {
        table: 'units',
        data: [{ subject_id: 'chemistry' }, { subject_id: 'physics' }],
      },
      { table: 'subjects', data: [physics, chemistry] },
    ]);
    const repository = createSupabaseContentRepository(client);

    const result = await repository.getSubjectsBySemester('semester-1');

    expect(result.map(({ id }) => id)).toEqual(['chemistry', 'physics']);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.operations).toContainEqual({
      name: 'in',
      args: ['id', ['chemistry', 'physics']],
    });
  });
});

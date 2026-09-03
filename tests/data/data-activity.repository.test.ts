import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { asyncLocalContentRepository } from '@services/data/async-local-content.repository';
import * as localContent from '@services/data/local-content.repository';
import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';

interface PlannedQuery {
  table: string;
  data?: unknown;
  error?: unknown;
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

  return { client, calls };
}

const config = {
  engineKind: 'data_graph_v1',
  context: 'بيانات موجة.',
  presentation: {
    mode: 'table_and_line_graph',
    xAxisLabel: 'التردد',
    yAxisLabel: 'الطول الموجي',
  },
  dataset: {
    x: { label: 'التردد', unit: 'Hz', values: [100, 200] },
    series: [
      {
        id: 'wavelength',
        label: 'الطول الموجي',
        unit: 'm',
        values: [3.4, 1.7],
      },
    ],
  },
  tasks: [
    {
      id: 'read',
      prompt: 'اقرأ.',
      unit: 'm',
      rule: { kind: 'read_value', seriesId: 'wavelength', pointIndex: 1 },
    },
  ],
};

const dataActivityRow = {
  id: 'data-1',
  lesson_id: 'lesson-1',
  title: 'نشاط بيانات',
  instructions: 'اقرأ البيانات.',
  engine_kind: 'data_graph_v1',
  config,
  status: 'draft',
  source: 'curriculum_seed',
};

describe('Phase 5-4B data activity repositories', () => {
  it('يطابق async local المستودع المحلي ويعيد seed الدرس الثاني فقط', async () => {
    const lessonId = 'g10-phy-waves-l2';

    await expect(asyncLocalContentRepository.getDataActivitiesByLesson(lessonId)).resolves.toEqual(
      localContent.getDataActivitiesByLesson(lessonId)
    );
    expect(localContent.getDataActivitiesByLesson(lessonId)).toHaveLength(1);
    expect(localContent.getDataActivitiesByLesson('g10-phy-waves-l1')).toEqual([]);
  });

  it('يحترم AbortSignal في async local قبل التفويض', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      asyncLocalContentRepository.getDataActivitiesByLesson('g10-phy-waves-l2', {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('يجلب النشاط وروابط أهدافه باستعلامين ثابتين ويحافظ على ترتيب position', async () => {
    const { client, calls } = createFakeClient([
      { table: 'data_activities', data: [dataActivityRow] },
      {
        table: 'data_activity_objectives',
        data: [
          {
            data_activity_id: 'data-1',
            objective_id: 'objective-2',
            lesson_id: 'lesson-1',
            position: 0,
          },
          {
            data_activity_id: 'data-1',
            objective_id: 'objective-1',
            lesson_id: 'lesson-1',
            position: 1,
          },
        ],
      },
    ]);
    const repository = createSupabaseContentRepository(client);

    const result = await repository.getDataActivitiesByLesson('lesson-1');

    expect(result[0]?.objectiveIds).toEqual(['objective-2', 'objective-1']);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.table)).toEqual([
      'data_activities',
      'data_activity_objectives',
    ]);
    expect(calls[1]?.operations.filter((operation) => operation.name === 'order')).toEqual([
      { name: 'order', args: ['data_activity_id'] },
      { name: 'order', args: ['position'] },
    ]);
  });

  it('لا ينفذ استعلام الروابط عندما لا توجد أنشطة بيانات', async () => {
    const { client, calls } = createFakeClient([{ table: 'data_activities', data: [] }]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getDataActivitiesByLesson('missing')).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('يرفض linkage يعيد lesson_id مختلفًا عن النشاط المطلوب', async () => {
    const { client } = createFakeClient([
      { table: 'data_activities', data: [dataActivityRow] },
      {
        table: 'data_activity_objectives',
        data: [
          {
            data_activity_id: 'data-1',
            objective_id: 'objective-1',
            lesson_id: 'lesson-2',
            position: 0,
          },
        ],
      },
    ]);
    const repository = createSupabaseContentRepository(client);

    await expect(repository.getDataActivitiesByLesson('lesson-1')).rejects.toThrow(
      'does not match data activity lesson'
    );
  });
});

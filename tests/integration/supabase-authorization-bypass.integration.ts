import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AppRole,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;
const activeRoles = ['student', 'teacher', 'reviewer'] as const;
type ActiveRole = (typeof activeRoles)[number];

interface LessonRecord {
  id: string;
  unit_id: string;
  title: string;
  display_order: number;
  summary: string;
  key_concepts: string[];
  examples: string[];
  misconceptions: string[];
  status: 'draft' | 'pending_review' | 'approved';
  source: 'ai_generated' | 'teacher_authored' | 'curriculum_seed';
}

interface DatabaseError {
  code?: string;
  message?: string;
}

function expectTablePermissionDenied(error: DatabaseError | null, table: string): void {
  expect(error).not.toBeNull();
  expect(error?.code).toBe('42501');

  const message = error?.message?.toLowerCase() ?? '';
  expect(message).toContain('permission denied');
  expect(message).toContain(table);
  expect(message).not.toContain('row-level security');
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

describeIntegration('Phase 2-C4-B direct PostgREST authorization bypass', () => {
  const seedLessonId = 'g10-phy-waves-l4';
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let fixtures: SupabaseAuthFixtures;
  let activeByRole: Record<ActiveRole, AuthIdentity>;
  let pendingStudent: AuthIdentity;
  let suspendedStudent: AuthIdentity;
  let seedLesson: LessonRecord;

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());

    const activeStudent = await fixtures.createIdentity('c4b-active-student', 'student', 'active');
    const activeTeacher = await fixtures.createIdentity('c4b-active-teacher', 'teacher', 'active');
    const activeReviewer = await fixtures.createIdentity(
      'c4b-active-reviewer',
      'reviewer',
      'active'
    );
    pendingStudent = await fixtures.createIdentity('c4b-pending-student');
    suspendedStudent = await fixtures.createIdentity(
      'c4b-suspended-student',
      'student',
      'suspended'
    );

    activeByRole = {
      student: activeStudent,
      teacher: activeTeacher,
      reviewer: activeReviewer,
    };

    const { data, error } = await fixtures.adminClient
      .from('lessons')
      .select(
        'id, unit_id, title, display_order, summary, key_concepts, examples, misconceptions, status, source'
      )
      .eq('id', seedLessonId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to read C4-B seed lesson: ${error?.message ?? 'missing lesson'}`);
    }

    seedLesson = data as LessonRecord;
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('allows every active application role to read catalog rows directly through PostgREST', async () => {
    for (const role of activeRoles) {
      const result = await activeByRole[role].client.from('grades').select('id').eq('id', 'g10');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([{ id: 'g10' }]);
    }
  });

  it('hides cloud catalog rows from a pending account through RLS', async () => {
    const result = await pendingStudent.client.from('grades').select('id').eq('id', 'g10');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('hides cloud catalog rows from a suspended account through RLS', async () => {
    const result = await suspendedStudent.client.from('grades').select('id').eq('id', 'g10');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('denies anonymous cloud catalog reads at the table privilege layer', async () => {
    const { error } = await fixtures.anonymousClient.from('grades').select('id').eq('id', 'g10');

    expectTablePermissionDenied(error, 'grades');
  });

  it('hides draft lessons from every active application role through RLS', async () => {
    for (const role of activeRoles) {
      const result = await activeByRole[role].client
        .from('lessons')
        .select('id, status')
        .eq('id', seedLessonId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }
  });

  it.each(activeRoles)(
    'denies active %s direct lesson INSERT at the table privilege layer',
    async (role: ActiveRole) => {
      const roleIndex = activeRoles.indexOf(role);
      const insertedId = `c4b-${role}-${runId}`;
      const displayOrder =
        900_000_000 + Number(String(Date.now()).slice(-6)) * 10 + Math.max(roleIndex, 0);

      const payload: LessonRecord = {
        ...seedLesson,
        id: insertedId,
        title: `C4-B denied ${role} insert`,
        display_order: displayOrder,
      };

      try {
        const { error } = await activeByRole[role].client.from('lessons').insert(payload);

        expectTablePermissionDenied(error, 'lessons');

        const after = await fixtures.adminClient.from('lessons').select('id').eq('id', insertedId);
        expect(after.error).toBeNull();
        expect(after.data).toEqual([]);
      } finally {
        psqlAdmin(`DELETE FROM public.lessons WHERE id = ${sqlLiteral(insertedId)};`);
      }
    }
  );

  it.each(activeRoles)(
    'denies active %s direct lesson UPDATE and preserves the row',
    async (role: ActiveRole) => {
      const before = await readSeedLesson();
      const changedTitle = `C4-B denied ${role} update`;

      try {
        const { error } = await activeByRole[role].client
          .from('lessons')
          .update({ title: changedTitle })
          .eq('id', seedLessonId);

        expectTablePermissionDenied(error, 'lessons');
        expect(await readSeedLesson()).toEqual(before);
      } finally {
        psqlAdmin(`
          UPDATE public.lessons
          SET title = ${sqlLiteral(before.title)}
          WHERE id = ${sqlLiteral(seedLessonId)};
        `);
      }
    }
  );

  it.each(activeRoles)(
    'denies active %s direct lesson DELETE and preserves the row',
    async (role: ActiveRole) => {
      const before = await readSeedLesson();
      const { error } = await activeByRole[role].client
        .from('lessons')
        .delete()
        .eq('id', seedLessonId);

      expectTablePermissionDenied(error, 'lessons');
      expect(await readSeedLesson()).toEqual(before);
    }
  );

  it('denies an active reviewer direct lesson approval and preserves draft status', async () => {
    const before = await readSeedLesson();

    try {
      const { error } = await activeByRole.reviewer.client
        .from('lessons')
        .update({ status: 'approved' })
        .eq('id', seedLessonId);

      expectTablePermissionDenied(error, 'lessons');
      expect(await readSeedLesson()).toEqual(before);
    } finally {
      psqlAdmin(`
        UPDATE public.lessons
        SET status = ${sqlLiteral(before.status)}
        WHERE id = ${sqlLiteral(seedLessonId)};
      `);
    }
  });

  it.each(activeRoles)(
    'denies active %s direct profile privilege escalation and preserves the profile',
    async (role: ActiveRole) => {
      const identity = activeByRole[role];
      const before = await fixtures.readProfile(identity.user.id);
      const nextRole: AppRole =
        role === 'student' ? 'teacher' : role === 'teacher' ? 'reviewer' : 'student';

      try {
        const displayNameResult = await identity.client
          .from('profiles')
          .update({ display_name: `C4-B denied ${role}` })
          .eq('id', identity.user.id);
        const roleResult = await identity.client
          .from('profiles')
          .update({ role: nextRole })
          .eq('id', identity.user.id);
        const statusResult = await identity.client
          .from('profiles')
          .update({ status: 'suspended' })
          .eq('id', identity.user.id);

        expectTablePermissionDenied(displayNameResult.error, 'profiles');
        expectTablePermissionDenied(roleResult.error, 'profiles');
        expectTablePermissionDenied(statusResult.error, 'profiles');
        expect(await fixtures.readProfile(identity.user.id)).toEqual(before);
      } finally {
        await fixtures.updateProfile(identity.user.id, {
          display_name: before.display_name,
          role: before.role,
          status: before.status,
        });
      }
    }
  );

  async function readSeedLesson(): Promise<LessonRecord> {
    const { data, error } = await fixtures.adminClient
      .from('lessons')
      .select(
        'id, unit_id, title, display_order, summary, key_concepts, examples, misconceptions, status, source'
      )
      .eq('id', seedLessonId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to read C4-B seed lesson: ${error?.message ?? 'missing lesson'}`);
    }

    return data as LessonRecord;
  }
});

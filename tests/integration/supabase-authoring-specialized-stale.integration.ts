import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  validDataActivityConfig,
  validSimulationConfig,
} from '../contracts/activity-config-parity.samples';
import {
  buildLessonRevisionPayload,
  nextDisplayOrder,
  type AuthoringRpcResult,
  type LessonRevisionPayload,
} from './helpers/authoring-fixtures';
import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function asRpc(data: unknown): AuthoringRpcResult {
  return data as AuthoringRpcResult;
}

describeIntegration(
  'Phase 5-5C2 specialized canonical stale detection',
  { concurrent: false },
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let fixtures: SupabaseAuthFixtures;
    let teacher: AuthIdentity;
    let reviewer: AuthIdentity;

    let sourcePayload: LessonRevisionPayload;
    let sourceLessonId = '';
    let sourceObjectiveA = '';
    let sourceObjectiveB = '';
    let sourceSimulationId = '';

    beforeAll(async () => {
      fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());

      teacher = await fixtures.createIdentity('p55c2-stale-teacher', 'teacher', 'active');

      reviewer = await fixtures.createIdentity('p55c2-stale-reviewer', 'reviewer', 'active');

      const base = buildLessonRevisionPayload(
        runId,
        nextDisplayOrder(96),
        `Phase 5-5C2 stale source ${runId}`
      );

      sourcePayload = {
        ...base,

        simulations: [
          {
            key: 'simulation-a',
            title: `Simulation ${runId}`,
            instructions: 'Adjust the controls and observe the wave.',
            objectiveKeys: ['objective-a'],
            config: validSimulationConfig,
          },
        ],

        inquiries: [
          {
            key: 'inquiry-a',
            title: `Inquiry ${runId}`,
            instructions: 'Investigate the evidence.',
            objectiveKeys: ['objective-a', 'objective-b'],
            context: 'A wave travels through a medium.',
            drivingQuestion: 'How does frequency affect the wave?',
            hypothesisPrompt: 'State a hypothesis.',
            observationPrompt: 'Record observations.',
            conclusionPrompt: 'State a supported conclusion.',
          },
        ],

        dataActivities: [
          {
            key: 'data-a',
            title: `Data activity ${runId}`,
            instructions: 'Interpret the scientific data.',
            objectiveKeys: ['objective-b'],
            config: validDataActivityConfig,
          },
        ],
      };

      const created = await teacher.client.rpc('create_lesson_revision', {
        p_payload: sourcePayload,
      });

      if (created.error) {
        throw created.error;
      }

      const createdData = asRpc(created.data);

      if (createdData.status !== 'created') {
        throw new Error(
          `Expected source revision creation, received ${JSON.stringify(createdData)}`
        );
      }

      const submitted = await teacher.client.rpc('submit_lesson_revision', {
        p_revision_id: createdData.revision.id,
      });

      if (submitted.error) {
        throw submitted.error;
      }

      const submittedData = asRpc(submitted.data);

      if (submittedData.status !== 'submitted') {
        throw new Error(
          `Expected source revision submission, received ${JSON.stringify(submittedData)}`
        );
      }

      const approved = await reviewer.client.rpc('review_lesson_revision', {
        p_revision_id: createdData.revision.id,
        p_decision: 'approve',
        p_note: 'Create canonical source for stale fingerprint tests.',
      });

      if (approved.error) {
        throw approved.error;
      }

      const approvedData = asRpc(approved.data);

      if (approvedData.status !== 'approved') {
        throw new Error(`Expected source publication, received ${JSON.stringify(approvedData)}`);
      }

      sourceLessonId = approvedData.publishedEntityId;

      const objectiveRows = psqlAdmin(`
        SELECT COALESCE(string_agg(id, E'\\n' ORDER BY id), '')
        FROM public.objectives
        WHERE lesson_id = ${sqlLiteral(sourceLessonId)};
      `)
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (objectiveRows.length !== 2) {
        throw new Error(`Expected two canonical objectives, received ${objectiveRows.length}`);
      }

      [sourceObjectiveA, sourceObjectiveB] = objectiveRows;

      sourceSimulationId = psqlAdmin(`
        SELECT id
        FROM public.simulations
        WHERE lesson_id = ${sqlLiteral(sourceLessonId)}
        ORDER BY id
        LIMIT 1;
      `);

      if (!sourceSimulationId) {
        throw new Error('Expected one canonical simulation.');
      }
    });

    afterAll(async () => {
      if (!fixtures) return;

      if (sourceLessonId) {
        const lesson = sqlLiteral(sourceLessonId);

        psqlAdmin(`
          DELETE FROM public.game_objectives
          WHERE game_id IN (
            SELECT id
            FROM public.games
            WHERE lesson_id = ${lesson}
          );

          DELETE FROM public.experiment_objectives
          WHERE lesson_id = ${lesson};

          DELETE FROM public.simulation_objectives
          WHERE lesson_id = ${lesson};

          DELETE FROM public.inquiry_objectives
          WHERE lesson_id = ${lesson};

          DELETE FROM public.data_activity_objectives
          WHERE lesson_id = ${lesson};

          DELETE FROM public.questions
          WHERE lesson_id = ${lesson};

          DELETE FROM public.games
          WHERE lesson_id = ${lesson};

          DELETE FROM public.experiments
          WHERE lesson_id = ${lesson};

          DELETE FROM public.simulations
          WHERE lesson_id = ${lesson};

          DELETE FROM public.inquiries
          WHERE lesson_id = ${lesson};

          DELETE FROM public.data_activities
          WHERE lesson_id = ${lesson};

          DELETE FROM public.objectives
          WHERE lesson_id = ${lesson};
        `);
      }

      if (teacher) {
        psqlAdmin(`
          DELETE FROM public.content_review_events
          WHERE revision_id IN (
            SELECT id
            FROM public.content_revisions
            WHERE author_id = ${sqlLiteral(teacher.user.id)}::uuid
          );

          DELETE FROM public.content_revisions
          WHERE author_id = ${sqlLiteral(teacher.user.id)}::uuid;
        `);
      }

      if (sourceLessonId) {
        psqlAdmin(`
          DELETE FROM public.lessons
          WHERE id = ${sqlLiteral(sourceLessonId)};
        `);
      }

      await fixtures.cleanup();
    });

    async function createPendingExistingRevision(suffix: string): Promise<{
      readonly revisionId: string;
      readonly baseFingerprint: string;
    }> {
      const payload = {
        ...sourcePayload,
        lesson: {
          ...sourcePayload.lesson,
          summary: `Pending stale candidate ${suffix} ${runId}`,
        },
      } satisfies LessonRevisionPayload;

      const created = await teacher.client.rpc('create_lesson_revision', {
        p_payload: payload,
        p_entity_id: sourceLessonId,
      });

      expect(created.error).toBeNull();

      const createdData = asRpc(created.data);
      expect(createdData.status).toBe('created');

      if (createdData.status !== 'created') {
        throw new Error('Expected existing canonical revision creation.');
      }

      expect(createdData.revision.baseFingerprint).toMatch(/^[0-9a-f]{64}$/);

      const submitted = await teacher.client.rpc('submit_lesson_revision', {
        p_revision_id: createdData.revision.id,
      });

      expect(submitted.error).toBeNull();
      expect(asRpc(submitted.data)).toEqual({
        status: 'submitted',
        revisionId: createdData.revision.id,
      });

      return {
        revisionId: createdData.revision.id,
        baseFingerprint: createdData.revision.baseFingerprint as string,
      };
    }

    async function expectStaleApproval(revisionId: string): Promise<void> {
      const reviewed = await reviewer.client.rpc('review_lesson_revision', {
        p_revision_id: revisionId,
        p_decision: 'approve',
        p_note: 'This approval must be blocked as stale.',
      });

      expect(reviewed.error).toBeNull();
      expect(asRpc(reviewed.data)).toEqual({
        status: 'rejected',
        reason: 'stale_revision',
      });

      const state = psqlAdmin(`
        SELECT
          status || '|' || COALESCE(published_entity_id, '')
        FROM public.content_revisions
        WHERE id = ${sqlLiteral(revisionId)}::uuid;
      `);

      expect(state).toBe('pending_review|');

      const eventCount = psqlAdmin(`
        SELECT count(*)
        FROM public.content_review_events
        WHERE revision_id = ${sqlLiteral(revisionId)}::uuid;
      `);

      expect(eventCount).toBe('0');
    }

    it('detects a specialized simulation config mutation as stale', async () => {
      const candidate = await createPendingExistingRevision('simulation-config');

      const beforeFingerprint = psqlAdmin(`
        SELECT public.lesson_content_fingerprint(
          ${sqlLiteral(sourceLessonId)}
        );
      `);

      expect(beforeFingerprint).toBe(candidate.baseFingerprint);

      try {
        psqlAdmin(`
          UPDATE public.simulations
          SET config = jsonb_set(
            config,
            '{mediumSpeedMps}',
            '999'::jsonb,
            false
          )
          WHERE id = ${sqlLiteral(sourceSimulationId)};
        `);

        const afterFingerprint = psqlAdmin(`
          SELECT public.lesson_content_fingerprint(
            ${sqlLiteral(sourceLessonId)}
          );
        `);

        expect(afterFingerprint).toMatch(/^[0-9a-f]{64}$/);
        expect(afterFingerprint).not.toBe(candidate.baseFingerprint);

        await expectStaleApproval(candidate.revisionId);
      } finally {
        psqlAdmin(`
          UPDATE public.simulations
          SET config = ${sqlJson(validSimulationConfig)}
          WHERE id = ${sqlLiteral(sourceSimulationId)};
        `);
      }
    });

    it('detects a specialized objective-link mutation as stale', async () => {
      const candidate = await createPendingExistingRevision('simulation-objective-link');

      const beforeFingerprint = psqlAdmin(`
        SELECT public.lesson_content_fingerprint(
          ${sqlLiteral(sourceLessonId)}
        );
      `);

      expect(beforeFingerprint).toBe(candidate.baseFingerprint);

      try {
        psqlAdmin(`
          UPDATE public.simulation_objectives
          SET objective_id = ${sqlLiteral(sourceObjectiveB)}
          WHERE simulation_id = ${sqlLiteral(sourceSimulationId)}
            AND lesson_id = ${sqlLiteral(sourceLessonId)}
            AND objective_id = ${sqlLiteral(sourceObjectiveA)};
        `);

        const afterFingerprint = psqlAdmin(`
          SELECT public.lesson_content_fingerprint(
            ${sqlLiteral(sourceLessonId)}
          );
        `);

        expect(afterFingerprint).toMatch(/^[0-9a-f]{64}$/);
        expect(afterFingerprint).not.toBe(candidate.baseFingerprint);

        await expectStaleApproval(candidate.revisionId);
      } finally {
        psqlAdmin(`
          UPDATE public.simulation_objectives
          SET objective_id = ${sqlLiteral(sourceObjectiveA)}
          WHERE simulation_id = ${sqlLiteral(sourceSimulationId)}
            AND lesson_id = ${sqlLiteral(sourceLessonId)}
            AND objective_id = ${sqlLiteral(sourceObjectiveB)};
        `);
      }
    });
  }
);

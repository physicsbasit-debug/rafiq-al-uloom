import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildLessonRevisionPayload,
  nextDisplayOrder,
  type AuthoringRpcResult,
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
  'Phase 5-5C3 historical pending revision compatibility',
  { concurrent: false },
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let fixtures: SupabaseAuthFixtures;
    let teacher: AuthIdentity;
    let reviewer: AuthIdentity;
    let historicalRevisionId = '';

    beforeAll(async () => {
      fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());

      teacher = await fixtures.createIdentity('p55c3-historical-teacher', 'teacher', 'active');

      reviewer = await fixtures.createIdentity('p55c3-historical-reviewer', 'reviewer', 'active');

      const current = buildLessonRevisionPayload(
        runId,
        nextDisplayOrder(97),
        `Historical pending ${runId}`
      );

      const legacyExperiments = current.experiments.map((experiment) => ({
        key: experiment.key,
        title: experiment.title,
        objective: experiment.objective,
        tools: experiment.tools,
        steps: experiment.steps,
        safetyNotes: experiment.safetyNotes,
        safetyLevel: experiment.safetyLevel,
        observationPrompt: experiment.observationPrompt,
        conclusionPrompt: experiment.conclusionPrompt,
        homeAlternative: experiment.homeAlternative,
      }));

      // Historical Phase 3 payload:
      // - no simulations
      // - no inquiries
      // - no dataActivities
      // - experiments have no structural objectiveKeys
      const historicalPayload = {
        lesson: current.lesson,
        objectives: current.objectives,
        questions: current.questions,
        games: current.games,
        experiments: legacyExperiments,
      };

      historicalRevisionId = psqlAdmin(`
        WITH inserted AS (
          INSERT INTO public.content_revisions (
            entity_type,
            entity_id,
            published_entity_id,
            supersedes_revision_id,
            author_id,
            status,
            payload,
            base_fingerprint,
            revision_number,
            submitted_at
          )
          VALUES (
            'lesson',
            NULL,
            NULL,
            NULL,
            ${sqlLiteral(teacher.user.id)}::uuid,
            'pending_review',
            ${sqlJson(historicalPayload)},
            NULL,
            1,
            now()
          )
          RETURNING id
        )
        SELECT id::text
        FROM inserted;
      `);

      if (!historicalRevisionId) {
        throw new Error('Expected historical pending revision fixture.');
      }
    });

    afterAll(async () => {
      if (!fixtures) return;

      if (historicalRevisionId) {
        psqlAdmin(`
          DELETE FROM public.content_review_events
          WHERE revision_id =
            ${sqlLiteral(historicalRevisionId)}::uuid;

          DELETE FROM public.content_revisions
          WHERE id =
            ${sqlLiteral(historicalRevisionId)}::uuid;
        `);
      }

      await fixtures.cleanup();
    });

    it('blocks approval of an incomplete historical payload but still allows explicit rejection', async () => {
      const approval = await reviewer.client.rpc('review_lesson_revision', {
        p_revision_id: historicalRevisionId,
        p_decision: 'approve',
        p_note: 'Historical approval attempt.',
      });

      expect(approval.error).toBeNull();

      expect(asRpc(approval.data)).toEqual({
        status: 'rejected',
        reason: 'invalid_payload',
      });

      const stateAfterApproval = psqlAdmin(`
        SELECT status
        FROM public.content_revisions
        WHERE id =
          ${sqlLiteral(historicalRevisionId)}::uuid;
      `);

      expect(stateAfterApproval).toBe('pending_review');

      const eventCountAfterApproval = psqlAdmin(`
        SELECT count(*)
        FROM public.content_review_events
        WHERE revision_id =
          ${sqlLiteral(historicalRevisionId)}::uuid;
      `);

      expect(eventCountAfterApproval).toBe('0');

      const rejectionNote = 'Historical payload cannot satisfy the current structural contract.';

      const rejection = await reviewer.client.rpc('review_lesson_revision', {
        p_revision_id: historicalRevisionId,
        p_decision: 'reject',
        p_note: rejectionNote,
      });

      expect(rejection.error).toBeNull();

      expect(asRpc(rejection.data)).toEqual({
        status: 'rejected_by_reviewer',
        revisionId: historicalRevisionId,
      });

      const finalState = psqlAdmin(`
        SELECT status
        FROM public.content_revisions
        WHERE id =
          ${sqlLiteral(historicalRevisionId)}::uuid;
      `);

      expect(finalState).toBe('rejected');

      const reviewEvent = psqlAdmin(`
        SELECT decision || '|' || note
        FROM public.content_review_events
        WHERE revision_id =
          ${sqlLiteral(historicalRevisionId)}::uuid;
      `);

      expect(reviewEvent).toBe(`reject|${rejectionNote}`);

      const publishedCount = psqlAdmin(`
        SELECT count(*)
        FROM public.content_revisions
        WHERE id =
          ${sqlLiteral(historicalRevisionId)}::uuid
          AND published_entity_id IS NOT NULL;
      `);

      expect(publishedCount).toBe('0');
    });
  }
);

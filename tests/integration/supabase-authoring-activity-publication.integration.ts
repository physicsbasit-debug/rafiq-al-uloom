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

function asRpc(data: unknown): AuthoringRpcResult {
  return data as AuthoringRpcResult;
}

describeIntegration(
  'Phase 5-5C2 complete canonical activity publication',
  { concurrent: false },
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let fixtures: SupabaseAuthFixtures;
    let teacher: AuthIdentity;
    let reviewer: AuthIdentity;
    let publishedEntityId = '';

    let payload: LessonRevisionPayload;

    beforeAll(async () => {
      fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());

      teacher = await fixtures.createIdentity('p55c2-publication-teacher', 'teacher', 'active');

      reviewer = await fixtures.createIdentity('p55c2-publication-reviewer', 'reviewer', 'active');

      const base = buildLessonRevisionPayload(
        runId,
        nextDisplayOrder(95),
        `Phase 5-5C2 publication ${runId}`
      );

      payload = {
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
            instructions: 'Investigate the pattern using the evidence.',
            objectiveKeys: ['objective-a', 'objective-b'],
            context: 'A wave travels through a medium.',
            drivingQuestion: 'How does frequency affect the observed wave?',
            hypothesisPrompt: 'State a testable hypothesis.',
            observationPrompt: 'Record the important observations.',
            conclusionPrompt: 'Write a conclusion supported by the evidence.',
          },
        ],

        dataActivities: [
          {
            key: 'data-a',
            title: `Data activity ${runId}`,
            instructions: 'Use the table and graph to answer the tasks.',
            objectiveKeys: ['objective-b'],
            config: validDataActivityConfig,
          },
        ],
      };
    });

    afterAll(async () => {
      if (!fixtures) return;

      const publishedRows = teacher
        ? psqlAdmin(`
            SELECT COALESCE(string_agg(published_entity_id, E'\\n'), '')
            FROM public.content_revisions
            WHERE author_id = ${sqlLiteral(teacher.user.id)}::uuid
              AND published_entity_id IS NOT NULL;
          `)
        : '';

      const publishedIds = publishedRows
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (publishedEntityId && !publishedIds.includes(publishedEntityId)) {
        publishedIds.push(publishedEntityId);
      }

      if (publishedIds.length > 0) {
        const publishedList = publishedIds.map(sqlLiteral).join(', ');

        psqlAdmin(`
          DELETE FROM public.game_objectives
          WHERE game_id IN (
            SELECT id
            FROM public.games
            WHERE lesson_id IN (${publishedList})
          );

          DELETE FROM public.experiment_objectives
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.simulation_objectives
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.inquiry_objectives
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.data_activity_objectives
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.questions
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.games
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.experiments
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.simulations
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.inquiries
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.data_activities
          WHERE lesson_id IN (${publishedList});

          DELETE FROM public.objectives
          WHERE lesson_id IN (${publishedList});
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

      if (publishedIds.length > 0) {
        const publishedList = publishedIds.map(sqlLiteral).join(', ');

        psqlAdmin(`
          DELETE FROM public.lessons
          WHERE id IN (${publishedList});
        `);
      }

      await fixtures.cleanup();
    });

    it('publishes all five activity families and objective links atomically', async () => {
      const created = await teacher.client.rpc('create_lesson_revision', {
        p_payload: payload,
      });

      expect(created.error).toBeNull();

      const createdData = asRpc(created.data);
      expect(createdData.status).toBe('created');

      if (createdData.status !== 'created') {
        throw new Error('Expected created revision.');
      }

      const revisionId = createdData.revision.id;

      const submitted = await teacher.client.rpc('submit_lesson_revision', {
        p_revision_id: revisionId,
      });

      expect(submitted.error).toBeNull();
      expect(asRpc(submitted.data)).toEqual({
        status: 'submitted',
        revisionId,
      });

      const approved = await reviewer.client.rpc('review_lesson_revision', {
        p_revision_id: revisionId,
        p_decision: 'approve',
        p_note: 'Phase 5-5C2 complete publication.',
      });

      expect(approved.error).toBeNull();

      const approvedData = asRpc(approved.data);
      expect(approvedData.status).toBe('approved');

      if (approvedData.status !== 'approved') {
        throw new Error('Expected approved revision.');
      }

      publishedEntityId = approvedData.publishedEntityId;

      const objectiveA = `${publishedEntityId}-objective-001`;
      const objectiveB = `${publishedEntityId}-objective-002`;

      const gameId = `${publishedEntityId}-game-001`;
      const experimentId = `${publishedEntityId}-experiment-001`;
      const simulationId = `${publishedEntityId}-simulation-001`;
      const inquiryId = `${publishedEntityId}-inquiry-001`;
      const dataActivityId = `${publishedEntityId}-data-activity-001`;

      const [
        lesson,
        objectives,
        questions,
        games,
        experiments,
        simulations,
        inquiries,
        dataActivities,
        gameLinks,
        experimentLinks,
        simulationLinks,
        inquiryLinks,
        dataLinks,
      ] = await Promise.all([
        fixtures.adminClient
          .from('lessons')
          .select('id,status,source')
          .eq('id', publishedEntityId)
          .single(),

        fixtures.adminClient
          .from('objectives')
          .select('id,text')
          .eq('lesson_id', publishedEntityId)
          .order('id'),

        fixtures.adminClient
          .from('questions')
          .select('id,objective_id,status,source')
          .eq('lesson_id', publishedEntityId)
          .order('id'),

        fixtures.adminClient
          .from('games')
          .select('id,status,source')
          .eq('lesson_id', publishedEntityId),

        fixtures.adminClient
          .from('experiments')
          .select('id,status,source')
          .eq('lesson_id', publishedEntityId),

        fixtures.adminClient
          .from('simulations')
          .select('id,engine_kind,config,status,source')
          .eq('lesson_id', publishedEntityId),

        fixtures.adminClient
          .from('inquiries')
          .select('id,status,source')
          .eq('lesson_id', publishedEntityId),

        fixtures.adminClient
          .from('data_activities')
          .select('id,engine_kind,config,status,source')
          .eq('lesson_id', publishedEntityId),

        fixtures.adminClient
          .from('game_objectives')
          .select('game_id,objective_id,position')
          .eq('game_id', gameId)
          .order('position'),

        fixtures.adminClient
          .from('experiment_objectives')
          .select('experiment_id,objective_id,lesson_id,position')
          .eq('lesson_id', publishedEntityId)
          .order('position'),

        fixtures.adminClient
          .from('simulation_objectives')
          .select('simulation_id,objective_id,lesson_id,position')
          .eq('lesson_id', publishedEntityId)
          .order('position'),

        fixtures.adminClient
          .from('inquiry_objectives')
          .select('inquiry_id,objective_id,lesson_id,position')
          .eq('lesson_id', publishedEntityId)
          .order('position'),

        fixtures.adminClient
          .from('data_activity_objectives')
          .select('data_activity_id,objective_id,lesson_id,position')
          .eq('lesson_id', publishedEntityId)
          .order('position'),
      ]);

      for (const result of [
        lesson,
        objectives,
        questions,
        games,
        experiments,
        simulations,
        inquiries,
        dataActivities,
        gameLinks,
        experimentLinks,
        simulationLinks,
        inquiryLinks,
        dataLinks,
      ]) {
        expect(result.error).toBeNull();
      }

      expect(lesson.data).toMatchObject({
        id: publishedEntityId,
        status: 'approved',
        source: 'teacher_authored',
      });

      expect(objectives.data?.map((row) => row.id)).toEqual([objectiveA, objectiveB]);

      expect(questions.data).toHaveLength(2);

      expect(games.data).toEqual([
        {
          id: gameId,
          status: 'approved',
          source: 'teacher_authored',
        },
      ]);

      expect(experiments.data).toEqual([
        {
          id: experimentId,
          status: 'approved',
          source: 'teacher_authored',
        },
      ]);

      expect(simulations.data).toEqual([
        {
          id: simulationId,
          engine_kind: 'transverse_wave_v1',
          config: validSimulationConfig,
          status: 'approved',
          source: 'teacher_authored',
        },
      ]);

      expect(inquiries.data).toEqual([
        {
          id: inquiryId,
          status: 'approved',
          source: 'teacher_authored',
        },
      ]);

      expect(dataActivities.data).toEqual([
        {
          id: dataActivityId,
          engine_kind: 'data_graph_v1',
          config: validDataActivityConfig,
          status: 'approved',
          source: 'teacher_authored',
        },
      ]);

      expect(gameLinks.data).toEqual([
        {
          game_id: gameId,
          objective_id: objectiveA,
          position: 0,
        },
        {
          game_id: gameId,
          objective_id: objectiveB,
          position: 1,
        },
      ]);

      expect(experimentLinks.data).toEqual([
        {
          experiment_id: experimentId,
          objective_id: objectiveA,
          lesson_id: publishedEntityId,
          position: 0,
        },
      ]);

      expect(simulationLinks.data).toEqual([
        {
          simulation_id: simulationId,
          objective_id: objectiveA,
          lesson_id: publishedEntityId,
          position: 0,
        },
      ]);

      expect(inquiryLinks.data).toEqual([
        {
          inquiry_id: inquiryId,
          objective_id: objectiveA,
          lesson_id: publishedEntityId,
          position: 0,
        },
        {
          inquiry_id: inquiryId,
          objective_id: objectiveB,
          lesson_id: publishedEntityId,
          position: 1,
        },
      ]);

      expect(dataLinks.data).toEqual([
        {
          data_activity_id: dataActivityId,
          objective_id: objectiveB,
          lesson_id: publishedEntityId,
          position: 0,
        },
      ]);

      const fingerprint = psqlAdmin(`
        SELECT public.lesson_content_fingerprint(
          ${sqlLiteral(publishedEntityId)}
        );
      `);

      expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);

      const revision = await fixtures.adminClient
        .from('content_revisions')
        .select('status,published_entity_id')
        .eq('id', revisionId)
        .single();

      expect(revision.error).toBeNull();
      expect(revision.data).toEqual({
        status: 'approved',
        published_entity_id: publishedEntityId,
      });
    });
  }
);

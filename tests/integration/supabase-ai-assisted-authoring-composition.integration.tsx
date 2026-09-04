// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ReviewerWorkspace } from '@features/reviewer/workspace/ReviewerWorkspace';
import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import { DeterministicAiAuthoringProvider } from '@services/ai-authoring';
import {
  createAuthoringService,
  createReviewService,
  createSupabaseAuthoringRepositories,
} from '@services/authoring';
import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';

import { nextDisplayOrder } from './helpers/authoring-fixtures';
import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

const FORBIDDEN_PROVENANCE_KEYS = new Set([
  'generationId',
  'providerFamily',
  'modelLabel',
  'generatedAt',
  'target',
]);

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function uuidLiteral(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error(`Unexpected UUID: ${id}`);
  }
  return `'${id}'::uuid`;
}

function collectForbiddenKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenKeys(item, found));
    return found;
  }

  if (typeof value !== 'object' || value === null) {
    return found;
  }

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PROVENANCE_KEYS.has(key)) {
      found.add(key);
    }
    collectForbiddenKeys(child, found);
  }

  return found;
}

function cleanupAuthoringRows(teacherId: string): void {
  const publishedRows = psqlAdmin(`
    SELECT COALESCE(string_agg(published_entity_id, E'\\n'), '')
    FROM public.content_revisions
    WHERE author_id = ${uuidLiteral(teacherId)}
      AND published_entity_id IS NOT NULL;
  `);

  const publishedIds = publishedRows
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (publishedIds.length > 0) {
    const publishedList = publishedIds.map(sqlLiteral).join(', ');

    psqlAdmin(`
      DELETE FROM public.experiment_objectives
      WHERE lesson_id IN (${publishedList});
      DELETE FROM public.simulation_objectives
      WHERE lesson_id IN (${publishedList});
      DELETE FROM public.inquiry_objectives
      WHERE lesson_id IN (${publishedList});
      DELETE FROM public.data_activity_objectives
      WHERE lesson_id IN (${publishedList});

      DELETE FROM public.game_objectives
      WHERE game_id IN (
        SELECT id FROM public.games
        WHERE lesson_id IN (${publishedList})
      );

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

  psqlAdmin(`
    DELETE FROM public.content_review_events
    WHERE revision_id IN (
      SELECT id
      FROM public.content_revisions
      WHERE author_id = ${uuidLiteral(teacherId)}
    );

    DELETE FROM public.content_revisions
    WHERE author_id = ${uuidLiteral(teacherId)};
  `);

  if (publishedIds.length > 0) {
    const publishedList = publishedIds.map(sqlLiteral).join(', ');
    psqlAdmin(`
      DELETE FROM public.lessons
      WHERE id IN (${publishedList});
    `);
  }
}

function fillLessonMetadata(title: string, displayOrder: number): void {
  fireEvent.change(screen.getByRole('textbox', { name: 'معرف الوحدة' }), {
    target: { value: 'g10-phy-waves-unit' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان الدرس' }), {
    target: { value: title },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'ترتيب العرض' }), {
    target: { value: String(displayOrder) },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'المفاهيم الأساسية' }), {
    target: { value: 'الموجة\nالسعة' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'الأمثلة' }), {
    target: { value: 'موجات الماء' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'التصورات البديلة' }), {
    target: { value: 'كل الموجات مادية' },
  });
}

async function acceptSummarySuggestion(title: string): Promise<string> {
  const requestButton = screen.getByRole('button', { name: 'اقترح ملخصًا' });
  await waitFor(() => expect(requestButton).toBeEnabled(), { timeout: 8_000 });

  fireEvent.click(requestButton);
  fireEvent.click(await screen.findByRole('button', { name: 'استخدام الاقتراح' }));

  const expected = `ملخص مقترح لدرس ${title}.`;

  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'ملخص الدرس' })).toHaveValue(expected)
  );

  return expected;
}

async function acceptObjectiveSuggestion(title: string): Promise<string> {
  fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));

  const requestButton = screen.getByRole('button', { name: 'اقترح هدفًا' });
  await waitFor(() => expect(requestButton).toBeEnabled(), { timeout: 8_000 });

  fireEvent.click(requestButton);
  fireEvent.click(await screen.findByRole('button', { name: 'استخدام الاقتراح' }));

  const expected = `أن يشرح المتعلم الفكرة الأساسية في درس ${title}.`;

  expect(screen.getByRole('textbox', { name: 'نص هدف التعلم' })).toHaveValue(expected);

  fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

  const objectivesRegion = screen.getByRole('region', { name: 'أهداف التعلم' });
  expect(within(objectivesRegion).getByText(expected)).toBeInTheDocument();

  return expected;
}

async function acceptMasteryQuestionSuggestion(objectiveText: string) {
  fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));

  fireEvent.change(screen.getByLabelText('غرض السؤال'), {
    target: { value: 'mastery' },
  });

  const requestButton = screen.getByRole('button', { name: 'اقترح سؤالًا' });
  await waitFor(() => expect(requestButton).toBeEnabled(), { timeout: 8_000 });

  fireEvent.click(requestButton);
  fireEvent.click(await screen.findByRole('button', { name: 'استخدام الاقتراح' }));

  const expected = {
    prompt: `أي العبارات الآتية ترتبط بالهدف: ${objectiveText}؟`,
    choices: ['العبارة الأولى', 'العبارة الثانية', 'العبارة الثالثة'],
    correctAnswerIndex: 0,
    explanation: 'العبارة الأولى هي الإجابة المحددة في المزود الحتمي للاختبار.',
    difficulty: 'medium',
  } as const;

  expect(screen.getByRole('textbox', { name: 'نص السؤال' })).toHaveValue(expected.prompt);

  expected.choices.forEach((choice, index) => {
    expect(screen.getByRole('textbox', { name: `الاختيار ${index + 1}` })).toHaveValue(choice);
  });

  expect(screen.getByLabelText('الإجابة الصحيحة')).toHaveValue('0');
  expect(screen.getByRole('textbox', { name: 'شرح الإجابة' })).toHaveValue(expected.explanation);
  expect(screen.getByLabelText('صعوبة السؤال')).toHaveValue(expected.difficulty);
  expect(screen.getByLabelText('الهدف المرتبط بالسؤال')).not.toHaveValue('');

  fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

  const questionsRegion = screen.getByRole('region', { name: 'أسئلة الدرس' });
  expect(within(questionsRegion).getByText(expected.prompt)).toBeInTheDocument();

  return expected;
}

describeIntegration(
  'Phase 4-6 V2 canonical deterministic AI-assisted authoring composition',
  { concurrent: false },
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let fixtures: SupabaseAuthFixtures;
    let teacher: AuthIdentity;
    let reviewer: AuthIdentity;

    beforeAll(async () => {
      fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
      teacher = await fixtures.createIdentity('p46r-v2-teacher', 'teacher', 'active');
      reviewer = await fixtures.createIdentity('p46r-v2-reviewer', 'reviewer', 'active');
    }, 30_000);

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      if (!fixtures) return;

      if (teacher?.user.id) {
        cleanupAuthoringRows(teacher.user.id);
      }

      await fixtures.cleanup();
    }, 30_000);

    it('يثبت V2 كاملًا: AI محلي قبل أول Save ثم Reviewer يرى المحتوى قبل الاعتماد والنشر', async () => {
      const teacherRepositories = createSupabaseAuthoringRepositories(teacher.client);
      const reviewerRepositories = createSupabaseAuthoringRepositories(reviewer.client);

      const authoring = createAuthoringService(teacherRepositories.authoring);
      const review = createReviewService(reviewerRepositories.review);
      const contentRepository = createSupabaseContentRepository(teacher.client);
      const aiProvider = new DeterministicAiAuthoringProvider();

      const title = `Phase 4-6R V2 ${runId}`;
      const displayOrder = nextDisplayOrder(76);

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const initially = await authoring.listOwnRevisions();
      expect(initially.status).toBe('success');

      if (initially.status !== 'success') {
        throw new Error('Expected initial revision list.');
      }

      expect(initially.revisions).toHaveLength(0);

      expect(
        psqlAdmin(`
          SELECT count(*)::text
          FROM public.content_revisions
          WHERE author_id = ${uuidLiteral(teacher.user.id)};
        `)
      ).toBe('0');

      const teacherView = render(
        <TeacherWorkspace
          aiProvider={aiProvider}
          service={authoring}
          contentRepository={contentRepository}
        />
      );

      expect(
        await screen.findByText(
          'لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.',
          {},
          { timeout: 8_000 }
        )
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'إنشاء درس جديد' }));
      fillLessonMetadata(title, displayOrder);

      const expectedSummary = await acceptSummarySuggestion(title);
      const expectedObjective = await acceptObjectiveSuggestion(title);
      const expectedQuestion = await acceptMasteryQuestionSuggestion(expectedObjective);

      const beforeSave = await authoring.listOwnRevisions();
      expect(beforeSave.status).toBe('success');

      if (beforeSave.status !== 'success') {
        throw new Error('Expected pre-save revision list.');
      }

      expect(beforeSave.revisions).toHaveLength(0);

      expect(
        psqlAdmin(`
          SELECT count(*)::text
          FROM public.content_revisions
          WHERE author_id = ${uuidLiteral(teacher.user.id)};
        `)
      ).toBe('0');

      fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));

      await waitFor(
        () => expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeEnabled(),
        { timeout: 8_000 }
      );

      const afterSave = await authoring.listOwnRevisions();
      expect(afterSave.status).toBe('success');

      if (afterSave.status !== 'success') {
        throw new Error('Expected saved revision list.');
      }

      expect(afterSave.revisions).toHaveLength(1);

      const saved = afterSave.revisions[0];

      if (!saved) {
        throw new Error('Expected first manual Save to create exactly one revision.');
      }

      expect(saved.payload.lesson.summary).toBe(expectedSummary);
      expect(saved.payload.objectives).toHaveLength(1);
      expect(saved.payload.objectives[0]?.text).toBe(expectedObjective);
      expect(saved.payload.questions).toHaveLength(1);

      expect(saved.payload.questions[0]).toMatchObject({
        purpose: 'mastery',
        prompt: expectedQuestion.prompt,
        choices: expectedQuestion.choices,
        correctAnswerIndex: expectedQuestion.correctAnswerIndex,
        explanation: expectedQuestion.explanation,
        difficulty: expectedQuestion.difficulty,
      });

      expect(saved.payload.questions[0]?.objectiveKey).toBe(saved.payload.objectives[0]?.key);

      const storedPayloadText = psqlAdmin(`
        SELECT payload::text
        FROM public.content_revisions
        WHERE id = ${uuidLiteral(saved.id)};
      `);

      const storedPayload: unknown = JSON.parse(storedPayloadText);
      expect([...collectForbiddenKeys(storedPayload)]).toEqual([]);

      fireEvent.click(screen.getByRole('button', { name: 'إرسال للمراجعة' }));

      expect(
        await screen.findByText(
          'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.',
          {},
          { timeout: 8_000 }
        )
      ).toBeInTheDocument();

      teacherView.unmount();

      const reviewerView = render(<ReviewerWorkspace service={review} />);

      fireEvent.click(
        await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
      );

      expect(await screen.findByText(expectedSummary)).toBeInTheDocument();

      const objectivesRegion = screen.getByRole('region', { name: 'أهداف التعلم' });
      expect(within(objectivesRegion).getByText(expectedObjective)).toBeInTheDocument();

      const questionDetails = screen.getByRole('article', { name: 'تفاصيل السؤال 1' });

      expect(questionDetails).toHaveTextContent('الغرض: إتقان');
      expect(questionDetails).toHaveTextContent(`نص السؤال: ${expectedQuestion.prompt}`);
      expect(questionDetails).toHaveTextContent(`${expectedQuestion.choices[0]} — الإجابة الصحيحة`);
      expect(questionDetails).toHaveTextContent(expectedQuestion.choices[1]);
      expect(questionDetails).toHaveTextContent(expectedQuestion.choices[2]);
      expect(questionDetails).toHaveTextContent(`الإجابة الصحيحة: ${expectedQuestion.choices[0]}`);
      expect(questionDetails).toHaveTextContent(`شرح الإجابة: ${expectedQuestion.explanation}`);
      expect(questionDetails).toHaveTextContent('الصعوبة: متوسط');
      expect(questionDetails).toHaveTextContent(`الهدف المرتبط: ${expectedObjective}`);
      expect(questionDetails).toHaveTextContent(
        `مفتاح الهدف المرتبط: ${saved.payload.objectives[0]?.key}`
      );

      fireEvent.click(screen.getByRole('button', { name: 'اعتماد النسخة' }));

      expect(
        await screen.findByText('تم اعتماد النسخة بنجاح.', {}, { timeout: 8_000 })
      ).toBeInTheDocument();

      reviewerView.unmount();

      const finalRevisions = await authoring.listOwnRevisions();
      expect(finalRevisions.status).toBe('success');

      if (finalRevisions.status !== 'success') {
        throw new Error('Expected final revision list.');
      }

      const finalRevision = finalRevisions.revisions.find((revision) => revision.id === saved.id);

      expect(finalRevision?.status).toBe('approved');
      expect(finalRevision?.publishedEntityId).toBeTruthy();

      const publishedEntityId = finalRevision?.publishedEntityId;

      if (!publishedEntityId) {
        throw new Error('Expected approved revision to publish a lesson.');
      }

      const lessonResult = await teacher.client
        .from('lessons')
        .select('id, summary, status, source')
        .eq('id', publishedEntityId);

      expect(lessonResult.error).toBeNull();
      expect(lessonResult.data).toEqual([
        expect.objectContaining({
          id: publishedEntityId,
          summary: expectedSummary,
          status: 'approved',
          source: 'teacher_authored',
        }),
      ]);

      const objectivesResult = await teacher.client
        .from('objectives')
        .select('id, text')
        .eq('lesson_id', publishedEntityId);

      expect(objectivesResult.error).toBeNull();
      expect(objectivesResult.data).toHaveLength(1);
      expect(objectivesResult.data?.[0]?.text).toBe(expectedObjective);

      const questionsResult = await teacher.client
        .from('questions')
        .select(
          'purpose, prompt, choices, correct_answer_index, explanation, objective_id, difficulty, status, source'
        )
        .eq('lesson_id', publishedEntityId);

      expect(questionsResult.error).toBeNull();
      expect(questionsResult.data).toHaveLength(1);

      const publishedQuestion = questionsResult.data?.[0];

      expect(publishedQuestion).toMatchObject({
        purpose: 'mastery',
        prompt: expectedQuestion.prompt,
        choices: [...expectedQuestion.choices],
        correct_answer_index: expectedQuestion.correctAnswerIndex,
        explanation: expectedQuestion.explanation,
        difficulty: expectedQuestion.difficulty,
        status: 'approved',
        source: 'teacher_authored',
      });

      expect(publishedQuestion?.objective_id).toBe(objectivesResult.data?.[0]?.id);
    }, 60_000);
  }
);

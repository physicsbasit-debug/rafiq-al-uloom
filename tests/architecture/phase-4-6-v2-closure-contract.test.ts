import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const REVIEWER_PATH = 'src/features/reviewer/workspace/ReviewerRevisionReview.tsx';
const REVIEWER_TEST_PATH = 'tests/features/reviewer/ReviewerRevisionReview.test.tsx';
const CANONICAL_PATH =
  'tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx';
const CLOSURE_SCRIPT_PATH = 'scripts/verify-phase-4-closure.sh';

describe('architecture: Phase 4-6 V2 permanent closure contract', () => {
  it('يبقي Reviewer على عرض المحتوى التفصيلي لا العدادات فقط', () => {
    const reviewer = read(REVIEWER_PATH);

    for (const required of [
      'أهداف التعلم',
      'أسئلة الدرس',
      'الغرض:',
      'نص السؤال:',
      'الاختيارات:',
      'الإجابة الصحيحة:',
      'شرح الإجابة:',
      'الصعوبة:',
      'الهدف المرتبط:',
      'مفتاح الهدف المرتبط:',
    ]) {
      expect(reviewer).toContain(required);
    }

    expect(reviewer).toContain('revision.payload.objectives.map');
    expect(reviewer).toContain('revision.payload.questions.map');
    expect(reviewer).toContain('question.choices.map');
    expect(reviewer).toContain('question.correctAnswerIndex');
    expect(reviewer).toContain('question.explanation');
    expect(reviewer).toContain('question.objectiveKey');
    expect(reviewer).toContain('question.difficulty');
  });

  it('يبقي اختبار Reviewer إثباتًا صريحًا للرؤية قبل القرار', () => {
    const reviewerTest = read(REVIEWER_TEST_PATH);

    expect(reviewerTest).toContain('يعرض للمراجع تفاصيل الهدف والسؤال كاملة قبل اتخاذ القرار');
    expect(reviewerTest).toContain("screen.getByRole('article', { name: 'تفاصيل السؤال 1' })");
    expect(reviewerTest).toContain('الإجابة الصحيحة: ارتداد الموجة');
    expect(reviewerTest).toContain('شرح الإجابة: الانعكاس هو ارتداد الموجة');
    expect(reviewerTest).toContain('الصعوبة: متوسط');
    expect(reviewerTest).toContain('الهدف المرتبط: يفسر انعكاس الموجات');
    expect(reviewerTest).toContain('مفتاح الهدف المرتبط: objective-wave');
  });

  it('يبقي الاختبار canonical حتميًا ولا يستبدله Gateway أو Live Gemini', () => {
    const canonical = read(CANONICAL_PATH);

    expect(canonical).toContain('DeterministicAiAuthoringProvider');
    expect(canonical).toContain('new DeterministicAiAuthoringProvider()');
    expect(canonical).not.toContain('GatewayAiAuthoringProvider');
    expect(canonical).not.toContain('RUN_LIVE_GEMINI_TESTS');
    expect(canonical).not.toContain('GEMINI_API_KEY');
  });

  it('يبقي targets الثلاثة داخل المسار الحتمي', () => {
    const canonical = read(CANONICAL_PATH);

    expect(canonical).toContain("name: 'اقترح ملخصًا'");
    expect(canonical).toContain("name: 'اقترح هدفًا'");
    expect(canonical).toContain("name: 'اقترح سؤالًا'");
    expect(canonical).toContain("target: { value: 'mastery' }");
  });

  it('يثبت أن AI المحلي يسبق أول server revision وأن Manual Save هو أول كتابة', () => {
    const canonical = read(CANONICAL_PATH);

    expect(canonical).not.toContain('authoring.createLessonRevision(');
    expect(canonical).toContain('expect(initially.revisions).toHaveLength(0)');
    expect(canonical).toContain('expect(beforeSave.revisions).toHaveLength(0)');
    expect(canonical).toContain("name: 'حفظ المسودة'");
    expect(canonical).toContain('expect(afterSave.revisions).toHaveLength(1)');

    const beforeSaveIndex = canonical.indexOf('expect(beforeSave.revisions).toHaveLength(0)');
    const manualSaveIndex = canonical.indexOf("name: 'حفظ المسودة'");
    const afterSaveIndex = canonical.indexOf('expect(afterSave.revisions).toHaveLength(1)');

    expect(beforeSaveIndex).toBeGreaterThanOrEqual(0);
    expect(manualSaveIndex).toBeGreaterThan(beforeSaveIndex);
    expect(afterSaveIndex).toBeGreaterThan(manualSaveIndex);
  });

  it('يبقي فحص provenance الخام داخل persisted JSON', () => {
    const canonical = read(CANONICAL_PATH);

    for (const required of [
      'generationId',
      'providerFamily',
      'modelLabel',
      'generatedAt',
      'target',
      'SELECT payload::text',
      'collectForbiddenKeys',
      'expect([...collectForbiddenKeys(storedPayload)]).toEqual([])',
    ]) {
      expect(canonical).toContain(required);
    }
  });

  it('يبقي إثبات Reviewer DOM قبل approve ثم publication canonical', () => {
    const canonical = read(CANONICAL_PATH);

    const reviewerRenderIndex = canonical.indexOf('render(<ReviewerWorkspace service={review} />)');
    const reviewerQuestionIndex = canonical.indexOf(
      "screen.getByRole('article', { name: 'تفاصيل السؤال 1' })"
    );
    const approveIndex = canonical.indexOf("screen.getByRole('button', { name: 'اعتماد النسخة' })");

    expect(reviewerRenderIndex).toBeGreaterThanOrEqual(0);
    expect(reviewerQuestionIndex).toBeGreaterThan(reviewerRenderIndex);
    expect(approveIndex).toBeGreaterThan(reviewerQuestionIndex);

    for (const required of [
      "expect(finalRevision?.status).toBe('approved')",
      'publishedEntityId',
      ".from('lessons')",
      ".from('objectives')",
      ".from('questions')",
      "source: 'teacher_authored'",
      'objective_id',
    ]) {
      expect(canonical).toContain(required);
    }
  });

  it('يجبر سكربت الإغلاق على canonical V2 وعلى Browser→Edge→Gemini كإثبات مستقل', () => {
    const closure = read(CLOSURE_SCRIPT_PATH);

    expect(closure).toContain('tests/architecture/phase-4-6-v2-closure-contract.test.ts');
    expect(closure).toContain(
      'tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx'
    );
    expect(closure).toContain(
      'tests/integration/supabase-ai-authoring-browser-gateway-live.integration.ts'
    );

    const canonicalIndex = closure.indexOf(
      'tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx'
    );
    const liveGatewayIndex = closure.indexOf(
      'tests/integration/supabase-ai-authoring-browser-gateway-live.integration.ts'
    );

    expect(canonicalIndex).toBeGreaterThanOrEqual(0);
    expect(liveGatewayIndex).toBeGreaterThan(canonicalIndex);
  });

  it('يبقي الاختبار الحي القديم supplemental smoke لا canonical closure proof', () => {
    const closure = read(CLOSURE_SCRIPT_PATH);

    expect(closure).toContain('Phase 4 supplemental live AI composition smoke');
    expect(closure).toContain(
      'tests/integration/supabase-ai-authoring-real-composition-live.integration.tsx'
    );
  });
});

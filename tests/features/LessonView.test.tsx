// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonView } from '@features/student/lesson-view/LessonView';
import {
  useLesson,
  useLessonExperiments,
  useLessonObjectives,
} from '@services/queries/content-query.hooks';
import type { Lesson, Objective } from '@shared-types/content.types';
import type { Experiment } from '@shared-types/experiment.types';

vi.mock('@services/queries/content-query.hooks', () => ({
  useLesson: vi.fn(),
  useLessonObjectives: vi.fn(),
  useLessonExperiments: vi.fn(),
}));

vi.mock('@features/lesson/objectives/LessonObjectives', () => ({
  LessonObjectives: ({ objectives }: { objectives: Objective[] }) => (
    <section data-testid="lesson-objectives">
      {objectives.map((item) => item.text).join('|')}
    </section>
  ),
}));

vi.mock('@features/lesson/summary/LessonSummary', () => ({
  LessonSummary: ({ summary }: { summary: string }) => (
    <section data-testid="lesson-summary">{summary}</section>
  ),
}));

vi.mock('@features/lesson/concepts/LessonConcepts', () => ({
  LessonConcepts: ({ concepts }: { concepts: string[] }) => (
    <section data-testid="lesson-concepts">{concepts.join('|')}</section>
  ),
}));

vi.mock('@features/lesson/examples/LessonExamples', () => ({
  LessonExamples: ({ examples }: { examples: string[] }) => (
    <section data-testid="lesson-examples">{examples.join('|')}</section>
  ),
}));

vi.mock('@features/lesson/misconceptions/LessonMisconceptions', () => ({
  LessonMisconceptions: ({ misconceptions }: { misconceptions: string[] }) => (
    <section data-testid="lesson-misconceptions">{misconceptions.join('|')}</section>
  ),
}));

vi.mock('@features/lesson/experiments/LessonExperiments', () => ({
  LessonExperiments: ({ experiments }: { experiments: Experiment[] }) => (
    <section data-testid="lesson-experiments">
      {experiments.map((item) => item.title).join('|')}
    </section>
  ),
}));

const mockedUseLesson = vi.mocked(useLesson);
const mockedUseLessonObjectives = vi.mocked(useLessonObjectives);
const mockedUseLessonExperiments = vi.mocked(useLessonExperiments);

const lesson: Lesson = {
  id: 'lesson-one',
  unitId: 'unit-one',
  title: 'خصائص الموجات',
  order: 1,
  objectiveIds: ['objective-one'],
  summary: 'ملخص خصائص الموجات.',
  keyConcepts: ['التردد', 'الطول الموجي'],
  examples: ['موجات الماء'],
  misconceptions: ['السرعة والتردد شيء واحد'],
  status: 'approved',
  source: 'curriculum_seed',
};

const objectives: Objective[] = [
  {
    id: 'objective-one',
    lessonId: 'lesson-one',
    text: 'يعرّف التردد والطول الموجي.',
  },
];

const experiments: Experiment[] = [
  {
    id: 'experiment-one',
    lessonId: 'lesson-one',
    title: 'ملاحظة موجات الماء',
    objective: 'ملاحظة انتشار الموجة.',
    tools: ['وعاء ماء'],
    steps: ['حرّك سطح الماء بلطف.'],
    safetyNotes: ['تجنب سكب الماء.'],
    safetyLevel: 'safe_home',
    observationPrompt: 'ماذا تلاحظ؟',
    conclusionPrompt: 'كيف انتشرت الموجة؟',
    homeAlternative: null,
    status: 'approved',
    source: 'curriculum_seed',
  },
];

const defaultProps = {
  lessonId: 'lesson-one',
  onBackToLessons: vi.fn(),
  onOpenReviewQuestions: vi.fn(),
  onOpenMatchingGame: vi.fn(),
  onOpenMasteryTest: vi.fn(),
};

function mockQueriesSuccess(options?: {
  lessonData?: Lesson | undefined;
  objectivesData?: Objective[];
  experimentsData?: Experiment[];
}) {
  mockedUseLesson.mockReturnValue({
    data:
      options?.lessonData === undefined && !('lessonData' in (options ?? {}))
        ? lesson
        : options?.lessonData,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  mockedUseLessonObjectives.mockReturnValue({
    data: options?.objectivesData ?? objectives,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  mockedUseLessonExperiments.mockReturnValue({
    data: options?.experimentsData ?? experiments,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

beforeEach(() => {
  mockedUseLesson.mockReset();
  mockedUseLessonObjectives.mockReset();
  mockedUseLessonExperiments.mockReset();
  Object.values(defaultProps).forEach((value) => {
    if (typeof value === 'function' && 'mockClear' in value) value.mockClear();
  });
});

afterEach(() => {
  cleanup();
});

describe('LessonView', () => {
  it('يستدعي useLesson بالـlessonId الصحيح', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(mockedUseLesson).toHaveBeenCalledWith('lesson-one');
  });

  it('يستدعي useLessonObjectives بالـlessonId الصحيح', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(mockedUseLessonObjectives).toHaveBeenCalledWith('lesson-one');
  });

  it('يستدعي useLessonExperiments بالـlessonId الصحيح', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(mockedUseLessonExperiments).toHaveBeenCalledWith('lesson-one');
  });

  it('يعرض حالة التحميل إذا كان استعلام الدرس قيد التحميل', () => {
    mockQueriesSuccess();
    mockedUseLesson.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة التحميل إذا كان استعلام الأهداف قيد التحميل', () => {
    mockQueriesSuccess();
    mockedUseLessonObjectives.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة التحميل إذا كان استعلام التجارب قيد التحميل', () => {
    mockQueriesSuccess();
    mockedUseLessonExperiments.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض خطأ استعلام الدرس', () => {
    mockQueriesSuccess();
    mockedUseLesson.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'تعذر تحميل الدرس.' },
      reload: vi.fn(),
    });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الدرس.');
  });

  it('يعرض خطأ استعلام الأهداف', () => {
    mockQueriesSuccess();
    mockedUseLessonObjectives.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الأهداف.' },
      reload: vi.fn(),
    });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الأهداف.');
  });

  it('يعرض خطأ استعلام التجارب', () => {
    mockQueriesSuccess();
    mockedUseLessonExperiments.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل التجارب.' },
      reload: vi.fn(),
    });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل التجارب.');
  });

  it('يعيد تحميل الاستعلامات الثلاثة عند إعادة المحاولة', () => {
    const lessonReload = vi.fn();
    const objectivesReload = vi.fn();
    const experimentsReload = vi.fn();
    mockedUseLesson.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'تعذر تحميل الدرس.' },
      reload: lessonReload,
    });
    mockedUseLessonObjectives.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: objectivesReload,
    });
    mockedUseLessonExperiments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: experimentsReload,
    });

    render(<LessonView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(lessonReload).toHaveBeenCalledTimes(1);
    expect(objectivesReload).toHaveBeenCalledTimes(1);
    expect(experimentsReload).toHaveBeenCalledTimes(1);
  });

  it('يعرض حالة عدم العثور عند نجاح الاستعلامات دون درس', () => {
    mockQueriesSuccess({ lessonData: undefined });
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'لم يتم العثور على الدرس' })).toBeInTheDocument();
  });

  it('زر العودة في حالة عدم العثور يستدعي onBackToLessons', () => {
    const onBackToLessons = vi.fn();
    mockQueriesSuccess({ lessonData: undefined });
    render(<LessonView {...defaultProps} onBackToLessons={onBackToLessons} />);
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدروس' }));
    expect(onBackToLessons).toHaveBeenCalledTimes(1);
  });

  it('يعرض عنوان الدرس', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'خصائص الموجات' })).toBeInTheDocument();
  });

  it('يمرر بيانات الأهداف القادمة من hook إلى LessonObjectives', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByTestId('lesson-objectives')).toHaveTextContent(
      'يعرّف التردد والطول الموجي.'
    );
  });

  it('يعرض LessonSummary بملخص الدرس', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByTestId('lesson-summary')).toHaveTextContent('ملخص خصائص الموجات.');
  });

  it('يعرض LessonConcepts بمفاهيم الدرس', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByTestId('lesson-concepts')).toHaveTextContent('التردد|الطول الموجي');
  });

  it('يعرض LessonExamples بأمثلة الدرس', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByTestId('lesson-examples')).toHaveTextContent('موجات الماء');
  });

  it('يعرض LessonMisconceptions بالتصورات الخاطئة', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByTestId('lesson-misconceptions')).toHaveTextContent(
      'السرعة والتردد شيء واحد'
    );
  });

  it('يمرر بيانات التجارب القادمة من hook إلى LessonExperiments', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);
    expect(screen.getByTestId('lesson-experiments')).toHaveTextContent('ملاحظة موجات الماء');
  });

  it('يحافظ على ترتيب مكونات الدرس الستة', () => {
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} />);

    const order = [
      'lesson-objectives',
      'lesson-summary',
      'lesson-concepts',
      'lesson-examples',
      'lesson-misconceptions',
      'lesson-experiments',
    ].map((testId) => screen.getByTestId(testId));

    order.slice(0, -1).forEach((element, index) => {
      expect(
        element.compareDocumentPosition(order[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  it('زر أسئلة المراجعة يستدعي onOpenReviewQuestions', () => {
    const onOpenReviewQuestions = vi.fn();
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} onOpenReviewQuestions={onOpenReviewQuestions} />);
    fireEvent.click(screen.getByRole('button', { name: 'أسئلة المراجعة' }));
    expect(onOpenReviewQuestions).toHaveBeenCalledTimes(1);
  });

  it('زر لعبة تعليمية يستدعي onOpenMatchingGame', () => {
    const onOpenMatchingGame = vi.fn();
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} onOpenMatchingGame={onOpenMatchingGame} />);
    fireEvent.click(screen.getByRole('button', { name: 'لعبة تعليمية' }));
    expect(onOpenMatchingGame).toHaveBeenCalledTimes(1);
  });

  it('زر اختبار الإتقان يستدعي onOpenMasteryTest', () => {
    const onOpenMasteryTest = vi.fn();
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} onOpenMasteryTest={onOpenMasteryTest} />);
    fireEvent.click(screen.getByRole('button', { name: 'اختبار الإتقان' }));
    expect(onOpenMasteryTest).toHaveBeenCalledTimes(1);
  });

  it('زر العودة إلى الدروس يستدعي onBackToLessons', () => {
    const onBackToLessons = vi.fn();
    mockQueriesSuccess();
    render(<LessonView {...defaultProps} onBackToLessons={onBackToLessons} />);
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدروس' }));
    expect(onBackToLessons).toHaveBeenCalledTimes(1);
  });

  it('لا يستورد LessonView المستودع المحلي المتزامن مباشرة', () => {
    const sourcePath = resolve(process.cwd(), 'src/features/student/lesson-view/LessonView.tsx');
    const source = readFileSync(sourcePath, 'utf8');
    expect(source).not.toContain('local-content.repository');
  });
});

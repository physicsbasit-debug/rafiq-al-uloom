// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { useReviewQuestions } from '@services/queries/content-query.hooks';
import type { Question } from '@shared-types/quiz.types';

vi.mock('@services/queries/content-query.hooks', () => ({
  useReviewQuestions: vi.fn(),
}));

const mockedUseReviewQuestions = vi.mocked(useReviewQuestions);

const questions: Question[] = [
  {
    id: 'question-one',
    lessonId: 'lesson-one',
    type: 'multiple_choice',
    prompt: 'ما وحدة قياس التردد؟',
    choices: ['هرتز', 'ثانية'],
    correctAnswerIndex: 0,
    explanation: 'يقاس التردد بوحدة الهرتز.',
    objectiveId: 'objective-one',
    difficulty: 'easy',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'question-two',
    lessonId: 'lesson-one',
    type: 'multiple_choice',
    prompt: 'ما العلاقة بين التردد والزمن الدوري؟',
    choices: ['عكسية', 'طردية'],
    correctAnswerIndex: 0,
    explanation: 'التردد يساوي مقلوب الزمن الدوري.',
    objectiveId: 'objective-two',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
];

function mockQuestionsSuccess(data: Question[] = questions) {
  mockedUseReviewQuestions.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

function getQuestionArticle(prompt: string) {
  const article = screen.getByRole('heading', { level: 3, name: prompt }).closest('article');
  expect(article).not.toBeNull();
  return article as HTMLElement;
}

beforeEach(() => {
  mockedUseReviewQuestions.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ReviewQuestionsView', () => {
  it('يستدعي useReviewQuestions بالـlessonId الصحيح', () => {
    mockQuestionsSuccess([]);
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseReviewQuestions).toHaveBeenCalledWith('lesson-one');
  });

  it('يعرض حالة التحميل', () => {
    mockedUseReviewQuestions.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة الخطأ', () => {
    mockedUseReviewQuestions.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل أسئلة المراجعة.' },
      reload: vi.fn(),
    });

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل أسئلة المراجعة.');
  });

  it('يربط زر إعادة المحاولة بدالة reload مرة واحدة', () => {
    const reload = vi.fn();
    mockedUseReviewQuestions.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل أسئلة المراجعة.' },
      reload,
    });

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض عنوان الشاشة والنص التمهيدي الحاليين', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByText('تدريب قصير')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'أسئلة المراجعة' })).toBeInTheDocument();
  });

  it('يعرض جميع الأسئلة بالترتيب الذي يعيده hook', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    ).toEqual(['ما وحدة قياس التردد؟', 'ما العلاقة بين التردد والزمن الدوري؟']);
  });

  it('يعرض أرقام الأسئلة بالترتيب الحالي', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(
      screen.getAllByText(/^سؤال/, { selector: 'p' })
    ).toHaveLength(2);
  });

  it('يعرض خيارات السؤال الأول بترتيبها', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const article = getQuestionArticle('ما وحدة قياس التردد؟');

    expect(
      within(article)
        .getAllByRole('button')
        .map((button) => button.textContent?.replace('(اختيارك)', '').trim())
    ).toEqual(['Aهرتز', 'Bثانية']);
  });

  it('يعرض زر العودة إلى الدرس', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'العودة إلى الدرس' })).toBeInTheDocument();
  });

  it('زر العودة يستدعي onBackToLesson مرة واحدة', () => {
    const onBackToLesson = vi.fn();
    mockQuestionsSuccess();

    render(
      <ReviewQuestionsView lessonId="lesson-one" onBackToLesson={onBackToLesson} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));

    expect(onBackToLesson).toHaveBeenCalledTimes(1);
  });

  it('يسجل أول اختيار للسؤال', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const article = getQuestionArticle('ما وحدة قياس التردد؟');
    fireEvent.click(within(article).getByRole('button', { name: 'هرتز' }));

    expect(within(article).getByRole('button', { name: /هرتز/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('يعرض التغذية الراجعة الصحيحة عند اختيار الإجابة الصحيحة', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'هرتز' }));

    expect(screen.getByText('✓ إجابة صحيحة')).toBeInTheDocument();
    expect(screen.getByText(/يقاس التردد بوحدة الهرتز/)).toBeInTheDocument();
  });

  it('يعرض التغذية الراجعة الخاطئة والإجابة الصحيحة عند الاختيار الخاطئ', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'ثانية' }));

    expect(screen.getByText('✕ إجابة خاطئة')).toBeInTheDocument();
    const article = getQuestionArticle('ما وحدة قياس التردد؟');

    expect(
      within(article).getByText(/الإجابة الصحيحة:/)
    ).toBeInTheDocument();

    expect(
      within(article).getByText('هرتز')
    ).toBeInTheDocument();
  });

  it('يعطل خيارات السؤال بعد تسجيل الإجابة', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const article = getQuestionArticle('ما وحدة قياس التردد؟');
    fireEvent.click(within(article).getByRole('button', { name: 'هرتز' }));

    expect(within(article).getByRole('button', { name: /هرتز/ })).toBeDisabled();
    expect(within(article).getByRole('button', { name: 'ثانية' })).toBeDisabled();
  });

  it('يمنع تغيير الإجابة بعد تسجيلها', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const article = getQuestionArticle('ما وحدة قياس التردد؟');
    fireEvent.click(within(article).getByRole('button', { name: 'هرتز' }));
    fireEvent.click(within(article).getByRole('button', { name: 'ثانية' }));

    expect(within(article).getByRole('button', { name: /هرتز/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(article).getByRole('button', { name: 'ثانية' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('لا يؤثر قفل السؤال الأول على السؤال الثاني', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const firstArticle = getQuestionArticle('ما وحدة قياس التردد؟');
    const secondArticle = getQuestionArticle('ما العلاقة بين التردد والزمن الدوري؟');
    fireEvent.click(within(firstArticle).getByRole('button', { name: 'هرتز' }));

    expect(within(secondArticle).getByRole('button', { name: 'عكسية' })).toBeEnabled();
    expect(within(secondArticle).getByRole('button', { name: 'طردية' })).toBeEnabled();
  });

  it('يسمح بالإجابة عن الأسئلة بأي ترتيب', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const secondArticle = getQuestionArticle('ما العلاقة بين التردد والزمن الدوري؟');
    fireEvent.click(within(secondArticle).getByRole('button', { name: 'عكسية' }));

    expect(within(secondArticle).getByRole('button', { name: /عكسية/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('يحتفظ بإجابة السؤال السابق عند الإجابة عن سؤال جديد', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    const firstArticle = getQuestionArticle('ما وحدة قياس التردد؟');
    const secondArticle = getQuestionArticle('ما العلاقة بين التردد والزمن الدوري؟');
    fireEvent.click(within(firstArticle).getByRole('button', { name: 'هرتز' }));
    fireEvent.click(within(secondArticle).getByRole('button', { name: 'عكسية' }));

    expect(within(firstArticle).getByRole('button', { name: /هرتز/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(secondArticle).getByRole('button', { name: /عكسية/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('يعرض بنية الشاشة المعتادة دون أسئلة عند نجاح الاستعلام بمصفوفة فارغة', () => {
    mockQuestionsSuccess([]);

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'أسئلة المراجعة' })).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('لا يضيف رسالة فراغ جديدة عند عدم وجود أسئلة', () => {
    mockQuestionsSuccess([]);

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.queryByText(/لا توجد أسئلة/)).not.toBeInTheDocument();
  });

  it('يبقي زر العودة متاحًا عند عدم وجود أسئلة', () => {
    mockQuestionsSuccess([]);

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'العودة إلى الدرس' })).toBeEnabled();
  });

  it('لا يعرض زر إنهاء أو نتيجة نهائية أو تصنيف إتقان', () => {
    mockQuestionsSuccess();

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /إنهاء/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/نتيجة اختبار الإتقان/)).not.toBeInTheDocument();
    expect(screen.queryByText(/التوصية:/)).not.toBeInTheDocument();
  });

  it('لا يستورد المستودع المحلي المتزامن مباشرة', () => {
    const sourcePath = resolve(
      process.cwd(),
      'src/features/student/review-questions/ReviewQuestionsView.tsx'
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('local-content.repository');
    expect(source).toContain('useReviewQuestions');
  });

  it('يبقي حالة الإجابات داخل ReviewQuestionsContent لا داخل غلاف الاستعلام', () => {
    const sourcePath = resolve(
      process.cwd(),
      'src/features/student/review-questions/ReviewQuestionsView.tsx'
    );
    const source = readFileSync(sourcePath, 'utf8');
    const contentStart = source.indexOf('function ReviewQuestionsContent');
    const stateStart = source.indexOf('useState<Record<string, number>>({})');

    expect(contentStart).toBeGreaterThan(-1);
    expect(stateStart).toBeGreaterThan(contentStart);
    expect(source.slice(0, contentStart)).not.toContain(
      'useState<Record<string, number>>({})'
    );
  });

  it('يحافظ على منطق قفل الإجابة المعتمد داخل تحديث الحالة الوظيفي', () => {
    const sourcePath = resolve(
      process.cwd(),
      'src/features/student/review-questions/ReviewQuestionsView.tsx'
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toMatch(
      /setAnswers\(\(current\)\s*=>\s*current\[questionId\]\s*!==\s*undefined\s*\?\s*current\s*:\s*\{\s*\.\.\.current,\s*\[questionId\]:\s*choiceIndex\s*\}\s*\)/
    );
  });
});

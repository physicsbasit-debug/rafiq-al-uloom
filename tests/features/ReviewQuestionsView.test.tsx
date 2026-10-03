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
    id: 'g9-s1-u1-l1-rq1',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'ما وحدة SI الأساسية لقياس الطول؟',
    choices: ['المتر (m)', 'اللتر (L)', 'الثانية (s)', 'الكيلوغرام (kg)'],
    correctAnswerIndex: 0,
    explanation: 'المتر (m) هو وحدة النظام الدولي الأساسية للطول.',
    objectiveId: 'objective-one',
    difficulty: 'easy',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq2',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'قاس طالب مسافة مقدارها 3000 m. ما القيمة المكافئة؟',
    choices: ['3 km', '30 km', '300 km', '0.3 km'],
    correctAnswerIndex: 0,
    explanation: 'كل 1000 m تساوي 1 km، لذلك 3000 m تساوي 3 km.',
    objectiveId: 'objective-two',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq3',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'انظر إلى سجل القياس المصور: طول قلم = 25 من دون وحدة. أي وحدة تكمل التسجيل؟',
    choices: ['cm', 'L', 's', 'kg'],
    correctAnswerIndex: 0,
    explanation: 'تسجيل الطول يحتاج قيمة عددية ووحدة طول مناسبة.',
    objectiveId: 'objective-three',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq4',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'قال طالب إن الأداة الرقمية أدق دائمًا. أي حكم أدق؟',
    choices: [
      'لا يمكن الحكم على الدقة من شكل العرض وحده',
      'الأداة الرقمية أدق دائمًا',
      'الأداة التناظرية أدق دائمًا',
    ],
    correctAnswerIndex: 0,
    explanation: 'تعتمد الدقة على خصائص الأداة وطريقة القياس، لا على كون العرض رقميًا فقط.',
    objectiveId: 'objective-four',
    difficulty: 'hard',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq5',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'قبل مقارنة قياسين للجسم نفسه بوحدتين مختلفتين، ماذا يجب فعلُه؟',
    choices: ['تحويلهما إلى وحدة مشتركة', 'جمع الرقمين مباشرة', 'إهمال الوحدات'],
    correctAnswerIndex: 0,
    explanation: 'توحيد الوحدة يجعل القياسين قابلين للمقارنة.',
    objectiveId: 'objective-five',
    difficulty: 'hard',
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

function currentQuestionCard() {
  const heading = screen.getByRole('heading', { level: 3 });
  const article = heading.closest('article');
  expect(article).not.toBeNull();
  return article as HTMLElement;
}

function answerCurrentCorrectlyAndAdvance() {
  const article = currentQuestionCard();
  const firstChoice = within(article).getAllByRole('button').find((button) =>
    button.getAttribute('aria-pressed') !== null
  );
  expect(firstChoice).toBeDefined();
  fireEvent.click(firstChoice as HTMLElement);

  const nextButton = within(article).getByRole('button', {
    name: /السؤال التالي|إنهاء المراجعة/,
  });
  expect(nextButton).toBeEnabled();
  fireEvent.click(nextButton);
}

beforeEach(() => {
  mockedUseReviewQuestions.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('ReviewQuestionsView — 6-7C4h approved review flow', () => {
  it('يستدعي useReviewQuestions بالـlessonId الصحيح', () => {
    mockQuestionsSuccess([]);
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseReviewQuestions).toHaveBeenCalledWith('lesson-one');
  });

  it('يعرض حالة التحميل والخطأ وإعادة المحاولة عبر QueryBoundary', () => {
    const reload = vi.fn();
    mockedUseReviewQuestions.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل أسئلة المراجعة.' },
      reload,
    });

    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل أسئلة المراجعة.');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض سؤالًا واحدًا فقط في كل شاشة مع تقدم واضح', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('ما وحدة SI الأساسية');
    expect(screen.getByLabelText('السؤال 1 من 5')).toHaveTextContent('السؤال 1 من 5');
    expect(screen.getByText('استرجاع الفكرة')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'تقدم أسئلة المراجعة' })).toHaveAttribute(
      'aria-valuenow',
      '20'
    );
  });

  it('لا يسمح بالانتقال قبل معالجة السؤال الحالي', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeDisabled();
  });

  it('يعرض تغذية راجعة فورية بعد الإجابة الصحيحة', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'المتر (m)' }));

    expect(screen.getByText('✓ صحيح')).toBeInTheDocument();
    expect(screen.getByText(/المتر.*وحدة النظام الدولي الأساسية للطول/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeEnabled();
  });

  it('يسمح بمحاولة ثانية بعد الخطأ الأول من دون كشف الإجابة الصحيحة مباشرة', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'اللتر (L)' }));

    expect(screen.getByText('تحتاج مراجعة هذه الفكرة')).toBeInTheDocument();
    expect(screen.getByText(/حدد أولًا نوع الكمية/)).toBeInTheDocument();
    expect(screen.queryByText(/المتر.*وحدة النظام الدولي الأساسية للطول/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    expect(screen.getByRole('button', { name: 'المتر (m)' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'المتر (m)' }));
    expect(screen.getByText('✓ صحيح')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeEnabled();
  });

  it('بعد خطأين ينهي السؤال ويعرض الشرح التعليمي بدل إنشاء حلقة محاولات', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'اللتر (L)' }));
    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    fireEvent.click(screen.getByRole('button', { name: 'الثانية (s)' }));

    expect(screen.getByText('تحتاج مراجعة هذه الفكرة')).toBeInTheDocument();
    expect(screen.getByText(/المتر.*وحدة النظام الدولي الأساسية للطول/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حاول مرة أخرى' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeEnabled();
  });

  it('ينتقل بالتسلسل المعتمد من الاسترجاع إلى التطبيق ثم القراءة المرئية', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerCurrentCorrectlyAndAdvance();
    expect(screen.getByText('تطبيق قصير')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('3000 m');

    answerCurrentCorrectlyAndAdvance();
    expect(screen.getByText('قراءة مرئية')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/lesson-visuals/g9-review-lab-record.svg'
    );
  });

  it('لا يكرر مرئيًا في السؤال الخامس المخصص لربط المفهوم', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    for (let index = 0; index < 4; index += 1) {
      answerCurrentCorrectlyAndAdvance();
    }

    expect(screen.getByText('ربط المفهوم')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('يعرض تقرير مراجعة تشخيصيًا بعد الأسئلة بدل الاكتفاء بدرجة رقمية', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    for (let index = 0; index < questions.length; index += 1) {
      answerCurrentCorrectlyAndAdvance();
    }

    expect(screen.getByRole('heading', { name: 'مراجعة فهمك' })).toBeInTheDocument();
    expect(screen.getByText('النظام الدولي والوحدات')).toBeInTheDocument();
    expect(screen.getByText('المقارنة والتحويل')).toBeInTheDocument();
    expect(screen.getByText('الدقة وأهمية القياس')).toBeInTheDocument();
    expect(screen.getAllByText('أتقنت')).toHaveLength(3);
    expect(screen.queryByText(/^5\s*\/\s*5$/)).not.toBeInTheDocument();
  });

  it('يوجه الطالب إلى مراجعة الفكرة عند بقاء جانب يحتاج مراجعة', () => {
    const onBackToLesson = vi.fn();
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={onBackToLesson} />);

    fireEvent.click(screen.getByRole('button', { name: 'اللتر (L)' }));
    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    fireEvent.click(screen.getByRole('button', { name: 'الثانية (s)' }));
    fireEvent.click(screen.getByRole('button', { name: 'السؤال التالي' }));

    for (let index = 1; index < questions.length; index += 1) {
      answerCurrentCorrectlyAndAdvance();
    }

    expect(screen.getByText('يحتاج مراجعة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'راجع الفكرة التي تحتاجها' }));
    expect(onBackToLesson).toHaveBeenCalledTimes(1);
  });

  it('لا يعرض حروف A/B/C/D التي تزاحم العربية في واجهة المراجعة', () => {
    mockQuestionsSuccess();
    render(<ReviewQuestionsView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    const article = currentQuestionCard();
    expect(within(article).queryByText(/^A$/)).not.toBeInTheDocument();
    expect(within(article).queryByText(/^B$/)).not.toBeInTheDocument();
  });

  it('يبقي جلب البيانات عبر hook ولا يعيد استخدام بطاقة الاختبار العامة', () => {
    const sourcePath = resolve(
      process.cwd(),
      'src/features/student/review-questions/ReviewQuestionsView.tsx'
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('useReviewQuestions');
    expect(source).not.toContain('local-content.repository');
    expect(source).not.toContain('MultipleChoiceQuestionCard');
  });
});

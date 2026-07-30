// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MasteryTestView } from '@features/mastery/MasteryTestView';
import { useMasteryQuestions } from '@services/queries/content-query.hooks';
import type { Question } from '@shared-types/quiz.types';

vi.mock('@services/queries/content-query.hooks', () => ({
  useMasteryQuestions: vi.fn(),
}));

const mockedUseMasteryQuestions = vi.mocked(useMasteryQuestions);

const questions: Question[] = [
  {
    id: 'question-one',
    lessonId: 'lesson-one',
    prompt: 'ما وحدة قياس التردد؟',
    choices: ['هرتز', 'ثانية'],
    correctAnswerIndex: 0,
    explanation: 'يقاس التردد بوحدة الهرتز.',
  },
  {
    id: 'question-two',
    lessonId: 'lesson-one',
    prompt: 'ما العلاقة بين التردد والزمن الدوري؟',
    choices: ['عكسية', 'طردية'],
    correctAnswerIndex: 0,
    explanation: 'التردد يساوي مقلوب الزمن الدوري.',
  },
];

function mockQuestionsSuccess(data: Question[] = questions) {
  mockedUseMasteryQuestions.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

function answerAllQuestions() {
  fireEvent.click(screen.getByRole('button', { name: 'هرتز' }));
  fireEvent.click(screen.getByRole('button', { name: 'عكسية' }));
}

beforeEach(() => {
  mockedUseMasteryQuestions.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('MasteryTestView', () => {
  it('يستدعي useMasteryQuestions بالـlessonId الصحيح', () => {
    mockQuestionsSuccess([]);
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    expect(mockedUseMasteryQuestions).toHaveBeenCalledWith('lesson-one');
  });

  it('يعرض حالة تحميل أسئلة الإتقان', () => {
    mockedUseMasteryQuestions.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة خطأ أسئلة الإتقان', () => {
    mockedUseMasteryQuestions.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل أسئلة الإتقان.' },
      reload: vi.fn(),
    });

    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل أسئلة الإتقان.');
  });

  it('يربط إعادة المحاولة بدالة reload', () => {
    const reload = vi.fn();

    mockedUseMasteryQuestions.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل أسئلة الإتقان.' },
      reload,
    });

    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض الأسئلة بالترتيب الذي يعيده hook', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    ).toEqual(['ما وحدة قياس التردد؟', 'ما العلاقة بين التردد والزمن الدوري؟']);
  });

  it('يعرض عداد التقدم بالقيمة الابتدائية', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);
    expect(screen.getByText(/تمت الإجابة عن/)).toHaveTextContent('تمت الإجابة عن 0 من 2 أسئلة.');
  });

  it('يعطل زر الإنهاء قبل اكتمال جميع الإجابات', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'إنهاء الاختبار' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'أكمل الإجابة عن جميع الأسئلة لتفعيل زر إنهاء الاختبار.'
    );
  });

  it('يسجل الاختيار الأول ويمنع تغييره', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    const firstQuestion = screen
      .getByRole('heading', { name: 'ما وحدة قياس التردد؟' })
      .closest('article');

    expect(firstQuestion).not.toBeNull();

    fireEvent.click(within(firstQuestion as HTMLElement).getByRole('button', { name: 'هرتز' }));

    expect(
      within(firstQuestion as HTMLElement).getByRole('button', { name: /هرتز/ })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(firstQuestion as HTMLElement).getByRole('button', { name: 'ثانية' })
    ).toBeDisabled();
  });

  it('يحدث عداد التقدم بعد كل إجابة', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'هرتز' }));

    expect(screen.getByText(/تمت الإجابة عن/)).toHaveTextContent('تمت الإجابة عن 1 من 2 أسئلة.');
  });

  it('يفعل زر الإنهاء بعد اكتمال جميع الإجابات', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAllQuestions();

    expect(screen.getByRole('button', { name: 'إنهاء الاختبار' })).toBeEnabled();
    expect(
      screen.queryByText('أكمل الإجابة عن جميع الأسئلة لتفعيل زر إنهاء الاختبار.')
    ).not.toBeInTheDocument();
  });

  it('لا يركب النتيجة أو المراجعة قبل إنهاء الاختبار', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAllQuestions();

    expect(screen.queryByRole('heading', { name: 'نتيجة اختبار الإتقان' })).not.toBeInTheDocument();
    expect(screen.queryByText(/الدرجة:/)).not.toBeInTheDocument();
    expect(screen.queryByText('متقن')).not.toBeInTheDocument();
    expect(screen.queryByText(/التوصية:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/الإجابة الصحيحة:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/الشرح:/)).not.toBeInTheDocument();
  });

  it('يحسب الدرجة ويعرض التصنيف والتوصية بعد الإنهاء', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAllQuestions();
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));

    expect(screen.getByRole('heading', { name: 'نتيجة اختبار الإتقان' })).toBeInTheDocument();
    expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 100 من 100');
    expect(screen.getByText('متقن')).toBeInTheDocument();
    expect(screen.getByText(/واصل التعلم بأنشطة إثرائية/)).toBeInTheDocument();
  });

  it('يبقي شبكة الأسئلة ظاهرة بعد ظهور النتيجة', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAllQuestions();
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'ما وحدة قياس التردد؟',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'ما العلاقة بين التردد والزمن الدوري؟',
      })
    ).toBeInTheDocument();
  });

  it('يبقي جميع الاختيارات معطلة بعد ظهور النتيجة', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAllQuestions();
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));

    expect(screen.getByRole('button', { name: /هرتز/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ثانية' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /عكسية/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'طردية' })).toBeDisabled();
  });

  it('يعرض ReviewItem لكل سؤال بعد الإنهاء فقط', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAllQuestions();
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));

    expect(screen.getAllByText(/الإجابة الصحيحة:/)).toHaveLength(2);
    expect(screen.getAllByText(/الشرح:/)).toHaveLength(2);
    expect(screen.getAllByText('✓ إجابة صحيحة')).toHaveLength(2);
  });

  it('يعرض مراجعة الإجابة الخاطئة بعد الإنهاء', () => {
    mockQuestionsSuccess();
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'ثانية' }));
    fireEvent.click(screen.getByRole('button', { name: 'عكسية' }));
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));

    expect(screen.getByText('✕ إجابة خاطئة')).toBeInTheDocument();
    expect(screen.getByText('يحتاج مراجعة')).toBeInTheDocument();
    expect(
      screen.getByText(/ارجع إلى شرح الدرس والأمثلة الأساسية، ثم حل أسئلة المراجعة/)
    ).toBeInTheDocument();
  });

  it('زر العودة يستدعي onBackToLesson', () => {
    const onBackToLesson = vi.fn();
    mockQuestionsSuccess();

    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={onBackToLesson} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));
    expect(onBackToLesson).toHaveBeenCalledTimes(1);
  });
});

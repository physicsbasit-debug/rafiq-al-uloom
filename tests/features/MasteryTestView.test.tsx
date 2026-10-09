// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MasteryTestView } from '@features/mastery/MasteryTestView';
import { useMasteryQuestions } from '@services/queries/content-query.hooks';
import { semester1ReferenceMasteryQuestions } from '@content/seed/semester1-reference-lessons.seed';
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

describe('MasteryTestView — Grade 9 lesson 1-1 approved mastery transfer flow', () => {
  const grade9MasteryQuestions: Question[] = [
    {
      id: 'g9-s1-u1-l1-mq1',
      lessonId: 'g9-phy-s1-u1-l1',
      prompt:
        'أُرسل إلى مصنع آخر مخطط لقطعة معدنية كتب فيه الفني: «طول القطعة = 25» من دون وحدة. ما المشكلة في هذا التسجيل؟',
      choices: [
        'لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل',
        'العدد 25 كبير جدًا ولا يصلح لقياس قطعة معدنية',
        'يجب أن يكون القياس مأخوذًا بأداة رقمية فقط',
        'يجب تغيير مادة القطعة قبل تسجيل القياس',
      ],
      correctAnswerIndex: 0,
      explanation: 'القياس المكتمل يحتاج قيمة ووحدة.',
    },
    {
      id: 'g9-s1-u1-l1-mq2',
      lessonId: 'g9-phy-s1-u1-l1',
      prompt:
        'فريقان في بلدين مختلفين يصنعان جزأين سيُركبان معًا. لماذا يساعد استخدام نظام وحدات متفق عليه؟',
      choices: [
        'لضمان أن القياسات تُفهم ويمكن مطابقتها بين الفريقين',
        'لأن القياس يصبح أسرع دائمًا مهما كانت الأداة',
        'لأن النظام المشترك يلغي الحاجة إلى أدوات القياس',
        'لأن كل فريق يستطيع عندها إهمال كتابة الوحدة',
      ],
      correctAnswerIndex: 0,
      explanation: 'الوحدات المشتركة تسهّل التواصل والمقارنة.',
    },
    {
      id: 'g9-s1-u1-l1-mq3',
      lessonId: 'g9-phy-s1-u1-l1',
      prompt: 'قال طالب: «الأداة الرقمية هي الأدق دائمًا». أي استنتاج علمي أكثر صحة؟',
      choices: [
        'الدقة تعتمد على خصائص الأداة وتدرجها وطريقة القياس، لا على كونها رقمية فقط',
        'الأداة الرقمية أدق دائمًا لأنها تعرض أرقامًا على شاشة',
        'الأداة التناظرية أدق دائمًا مهما كان تدريجها',
        'لا يمكن مقارنة دقة أداتين تقيسان الكمية نفسها',
      ],
      correctAnswerIndex: 0,
      explanation: 'شكل العرض لا يكفي للحكم على الدقة.',
    },
    {
      id: 'g9-s1-u1-l1-mq4',
      lessonId: 'g9-phy-s1-u1-l1',
      prompt:
        'سجّل فريق أ طول سلك بأنه 0.8 m، وسجّل فريق ب للسلك نفسه 800 mm. ماذا تستنتج بعد توحيد الوحدة؟',
      choices: [
        'القياسان متساويان',
        'قياس الفريق أ أكبر',
        'قياس الفريق ب أكبر',
        'لا يمكن المقارنة بين القياسين',
      ],
      correctAnswerIndex: 0,
      explanation: '0.8 m تساوي 800 mm.',
    },
    {
      id: 'g9-s1-u1-l1-mq5',
      lessonId: 'g9-phy-s1-u1-l1',
      prompt:
        'شركة تصنع جزءًا لطائرة وأرسلت قياسًا مقداره 12 من دون وحدة. ما المشكلة والممارسة التي تمنعها؟',
      choices: [
        'قد يُصنع الجزء بحجم غير مطابق؛ وتمنع ذلك كتابة القيمة مع وحدة مشتركة واضحة',
        'لن تحدث مشكلة لأن الرقم وحده يكفي إذا كان واضحًا',
        'المشكلة الوحيدة هي بطء التصنيع؛ وتمنعها زيادة سرعة القياس',
        'تمنع المشكلة باستخدام أداة رقمية مهما كانت الوحدة المسجلة',
      ],
      correctAnswerIndex: 0,
      explanation: 'القياس بلا وحدة قد يفسر بمقادير مختلفة.',
    },
  ];

  function renderGrade9Mastery() {
    mockQuestionsSuccess(grade9MasteryQuestions);
    render(<MasteryTestView lessonId="g9-phy-s1-u1-l1" onBackToLesson={vi.fn()} />);
  }

  function startGrade9Mastery() {
    renderGrade9Mastery();
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ اختبار الإتقان' }));
  }

  function answerCurrentAndAdvance(choiceName: string) {
    fireEvent.click(screen.getByRole('button', { name: choiceName }));
    const next = screen.queryByRole('button', { name: 'السؤال التالي' });
    if (next) fireEvent.click(next);
  }

  it('يبدأ بصفحة تعريفية تشرح أن الإتقان خمس مواقف جديدة بلا تلميحات', () => {
    renderGrade9Mastery();
    expect(screen.getByRole('heading', { name: 'إتقان مرحلي: أهمية القياس' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('مواقف جديدة')).toBeInTheDocument();
    expect(screen.getByText('لا توجد')).toBeInTheDocument();
    expect(screen.getByText('تلميحات أثناء الحل')).toBeInTheDocument();
    expect(screen.queryByText(/طول القطعة/)).not.toBeInTheDocument();
  });

  it('يعرض موقفًا واحدًا في الشاشة مع تقدم واضح وبدون A/B/C/D', () => {
    startGrade9Mastery();
    expect(screen.getByLabelText('السؤال 1 من 5')).toHaveTextContent('السؤال 1 من 5');
    expect(screen.getByText('موقف جديد')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'تقدم اختبار الإتقان' })).toHaveAttribute(
      'aria-valuenow',
      '20'
    );
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.queryByText(/^A$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^B$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^C$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^D$/)).not.toBeInTheDocument();
  });

  it('لا يكشف صحة الإجابة أو الشرح أثناء الحل ويسمح بتغيير الاختيار قبل الانتقال', () => {
    startGrade9Mastery();
    fireEvent.click(
      screen.getByRole('button', { name: 'العدد 25 كبير جدًا ولا يصلح لقياس قطعة معدنية' })
    );
    expect(screen.queryByText('✓ إجابة صحيحة')).not.toBeInTheDocument();
    expect(screen.queryByText('✕ إجابة خاطئة')).not.toBeInTheDocument();
    expect(screen.queryByText(/الإجابة الصحيحة/)).not.toBeInTheDocument();
    expect(screen.getByText('لن تظهر صحة الإجابة أثناء الاختبار.')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل' })
    );
    expect(
      screen.getByRole('button', { name: 'لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('ينتقل بين خمسة أنواع مواقف دون تغذية راجعة بينية', () => {
    startGrade9Mastery();
    answerCurrentAndAdvance('لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل');
    expect(screen.getByText('موقف من الحياة الواقعية')).toBeInTheDocument();
    answerCurrentAndAdvance('لضمان أن القياسات تُفهم ويمكن مطابقتها بين الفريقين');
    expect(screen.getByText('موقف تحليلي')).toBeInTheDocument();
    answerCurrentAndAdvance(
      'الدقة تعتمد على خصائص الأداة وتدرجها وطريقة القياس، لا على كونها رقمية فقط'
    );
    expect(screen.getByText('موقف كمي جديد')).toBeInTheDocument();
    answerCurrentAndAdvance('القياسان متساويان');
    expect(screen.getByText('موقف تطبيقي جديد')).toBeInTheDocument();
    expect(screen.queryByText(/صحيح|خاطئ/)).not.toBeInTheDocument();
  });

  it('يعرض تقرير إتقان تشخيصيًا حسب المهارات بعد إنهاء الخمسة', () => {
    startGrade9Mastery();
    answerCurrentAndAdvance('لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل');
    answerCurrentAndAdvance('لضمان أن القياسات تُفهم ويمكن مطابقتها بين الفريقين');
    answerCurrentAndAdvance(
      'الدقة تعتمد على خصائص الأداة وتدرجها وطريقة القياس، لا على كونها رقمية فقط'
    );
    answerCurrentAndAdvance('القياسان متساويان');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'قد يُصنع الجزء بحجم غير مطابق؛ وتمنع ذلك كتابة القيمة مع وحدة مشتركة واضحة',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));

    expect(screen.getByText('تقرير إتقانك')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'إتقان مرحلي متقدم' })).toBeInTheDocument();
    expect(screen.getByLabelText('النتيجة 5 من 5')).toBeInTheDocument();
    expect(screen.getByText('فهم القياس المكتمل')).toBeInTheDocument();
    expect(screen.getByText('استخدام الوحدات المشتركة والتواصل العلمي')).toBeInTheDocument();
    expect(screen.getByText('الدقة والموثوقية في القياس')).toBeInTheDocument();
    expect(screen.getByText('تطبيق المفهوم في موقف جديد')).toBeInTheDocument();
  });

  it('عند الإعادة يغير الموقف والرقم ولا يعيد السؤال نفسه حرفيًا', () => {
    startGrade9Mastery();
    answerCurrentAndAdvance('لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل');
    answerCurrentAndAdvance('لضمان أن القياسات تُفهم ويمكن مطابقتها بين الفريقين');
    answerCurrentAndAdvance(
      'الدقة تعتمد على خصائص الأداة وتدرجها وطريقة القياس، لا على كونها رقمية فقط'
    );
    answerCurrentAndAdvance('القياسان متساويان');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'قد يُصنع الجزء بحجم غير مطابق؛ وتمنع ذلك كتابة القيمة مع وحدة مشتركة واضحة',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));
    fireEvent.click(screen.getByRole('button', { name: 'إعادة التحقق بمواقف جديدة' }));

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('قطر الفتحة = 12');
    expect(screen.queryByText(/طول القطعة = 25/)).not.toBeInTheDocument();
  });
});

describe('MasteryTestView — Grade 9 lesson 1-2 approved mastery transfer flow', () => {
  const lesson12MasteryQuestions = semester1ReferenceMasteryQuestions.filter(
    ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l2'
  );

  function renderLesson12Mastery() {
    mockQuestionsSuccess(lesson12MasteryQuestions);
    render(<MasteryTestView lessonId="g9-phy-s1-u1-l2" onBackToLesson={vi.fn()} />);
  }

  function startLesson12Mastery() {
    renderLesson12Mastery();
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ اختبار الإتقان' }));
  }

  function answerCurrentAndAdvance(choiceName: string) {
    fireEvent.click(screen.getByRole('button', { name: choiceName }));
    const next = screen.queryByRole('button', { name: 'السؤال التالي' });
    if (next) fireEvent.click(next);
  }

  it('يبدأ بخمس مواقف جديدة بلا تلميحات ويخفي السؤال قبل البدء', () => {
    renderLesson12Mastery();
    expect(
      screen.getByRole('heading', { name: 'إتقان مرحلي: قياس الطول والحجم' })
    ).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('مواقف جديدة')).toBeInTheDocument();
    expect(screen.getByText('لا توجد')).toBeInTheDocument();
    expect(screen.queryByText(/طرفها عند الصفر متآكل/)).not.toBeInTheDocument();
  });

  it('يعرض موقفًا واحدًا ويمنع كشف صحة الإجابة أثناء الحل', () => {
    startLesson12Mastery();
    expect(screen.getByLabelText('السؤال 1 من 5')).toHaveTextContent('السؤال 1 من 5');
    expect(screen.getByText('موقف قياس جديد')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'تقدم اختبار الإتقان' })).toHaveAttribute(
      'aria-valuenow',
      '20'
    );
    fireEvent.click(screen.getByRole('button', { name: '11.8 cm' }));
    expect(screen.queryByText('✓ إجابة صحيحة')).not.toBeInTheDocument();
    expect(screen.queryByText('✕ إجابة خاطئة')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '9.4 cm' }));
    expect(screen.getByRole('button', { name: '9.4 cm' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ينتقل عبر مهارات الدرس الخمس ثم يعرض تقريرًا تشخيصيًا', () => {
    startLesson12Mastery();
    answerCurrentAndAdvance('9.4 cm');
    expect(screen.getByText('استدلال غير مباشر')).toBeInTheDocument();
    answerCurrentAndAdvance('0.60 mm');
    expect(screen.getByText('قراءة أداة جديدة')).toBeInTheDocument();
    answerCurrentAndAdvance('4.73 mm');
    expect(screen.getByText('استدلال إزاحة مركب')).toBeInTheDocument();
    answerCurrentAndAdvance('2 mL');
    expect(screen.getByText('استدلال هندسي عكسي')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3 cm' }));
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));
    expect(screen.getByText('تقرير إتقانك')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'إتقان مرحلي متقدم' })).toBeInTheDocument();
    expect(screen.getByLabelText('النتيجة 5 من 5')).toBeInTheDocument();
    expect(screen.getByText('القياس بالمسطرة وتصحيح نقطة البداية')).toBeInTheDocument();
    expect(screen.getByText('القياس غير المباشر للأبعاد الصغيرة')).toBeInTheDocument();
    expect(screen.getByText('قراءة الميكرومتر')).toBeInTheDocument();
    expect(screen.getByText('استنتاج حجم مجهول من الإزاحة الكلية')).toBeInTheDocument();
    expect(screen.getByText('استنتاج بعد مجهول من حجم معلوم')).toBeInTheDocument();
  });

  it('يغير سياق وأرقام الإعادة ولا يعيد الموقف الأول حرفيًا', () => {
    startLesson12Mastery();
    answerCurrentAndAdvance('9.4 cm');
    answerCurrentAndAdvance('0.60 mm');
    answerCurrentAndAdvance('4.73 mm');
    answerCurrentAndAdvance('2 mL');
    fireEvent.click(screen.getByRole('button', { name: '3 cm' }));
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));
    fireEvent.click(screen.getByRole('button', { name: 'إعادة التحقق بمواقف جديدة' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('1.7 cm');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('11.1 cm');
    expect(screen.queryByText(/2.4 cm/)).not.toBeInTheDocument();
  });

  it('يعرض MQ4-B وMQ5-B بسياق ومرئيات جديدة مع الحفاظ على الوظيفة المعرفية', () => {
    startLesson12Mastery();
    answerCurrentAndAdvance('9.4 cm');
    answerCurrentAndAdvance('0.60 mm');
    answerCurrentAndAdvance('4.73 mm');
    answerCurrentAndAdvance('2 mL');
    fireEvent.click(screen.getByRole('button', { name: '3 cm' }));
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));
    fireEvent.click(screen.getByRole('button', { name: 'إعادة التحقق بمواقف جديدة' }));

    answerCurrentAndAdvance('9.4 cm');
    answerCurrentAndAdvance('0.60 mm');
    answerCurrentAndAdvance('3.67 mm');

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('قطعة من سبيكة معدنية');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('28 mL');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('36 mL');
    expect(screen.getByAltText(/مكعب معدني معياري وقطعة سبيكة/)).toBeInTheDocument();

    answerCurrentAndAdvance('6 mL');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('قالب صابون');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('180 cm³');
    expect(screen.getByAltText(/مخطط إنتاج مسطح لقالب صابون/)).toBeInTheDocument();
  });
});

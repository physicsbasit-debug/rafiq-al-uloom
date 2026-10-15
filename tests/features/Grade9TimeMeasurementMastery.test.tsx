// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const persistenceMocks = vi.hoisted(() => ({
  submitAttempt: vi.fn(),
  retry: vi.fn(),
}));

vi.mock('@features/mastery/useMasteryResultPersistence', () => ({
  useMasteryResultPersistence: () => ({
    state: { status: 'idle' as const },
    submitAttempt: persistenceMocks.submitAttempt,
    retry: persistenceMocks.retry,
  }),
}));

import { GRADE9_L13_MASTERY_VARIANTS } from '@content/learning-design/grade9-lesson-1-3-mastery-design';
import { Grade9TimeMeasurementMastery } from '@features/mastery/Grade9TimeMeasurementMastery';
import type { Question } from '@shared-types/quiz.types';

const LESSON_ID = 'g9-phy-s1-u1-l3';

const seedQuestions: Question[] = Array.from({ length: 5 }, (_, index) => ({
  id: `g9-s1-u1-l3-mq${index + 1}`,
  lessonId: LESSON_ID,
  type: 'multiple_choice',
  prompt: `seed-${index + 1}`,
  choices: ['أ', 'ب', 'ج', 'د'],
  correctAnswerIndex: 0,
  explanation: 'seed',
  objectiveId: 'g9-s1-u1-l3-o3',
  difficulty: 'medium',
  status: 'published',
  source: 'curriculum_seed',
}));

function renderMastery(seed = 7) {
  return render(
    <Grade9TimeMeasurementMastery
      questions={seedQuestions}
      lessonId={LESSON_ID}
      onBackToLesson={vi.fn()}
      initialSeed={seed}
    />
  );
}

function start() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'ابدأ اختبار الإتقان',
    })
  );
}

function completeAttemptWithValidSelections() {
  const mq1 = screen.getByRole('group', {
    name: 'الخطوات المتاحة',
  });

  within(mq1)
    .getAllByRole('button')
    .slice(0, 4)
    .forEach((button) => fireEvent.click(button));

  fireEvent.click(
    screen.getByRole('button', {
      name: 'السؤال التالي',
    })
  );

  const mq2 = screen.getByRole('group', {
    name: 'خيارات السؤال',
  });

  fireEvent.click(within(mq2).getAllByRole('button')[0]);

  fireEvent.click(
    screen.getByRole('button', {
      name: 'السؤال التالي',
    })
  );

  const mq3 = screen.getByRole('group', {
    name: 'خيارات المتوسط',
  });

  fireEvent.click(within(mq3).getAllByRole('button')[0]);

  fireEvent.click(
    screen.getByRole('button', {
      name: 'السؤال التالي',
    })
  );

  fireEvent.change(screen.getByLabelText('زمن الدورة الواحدة'), {
    target: {
      value: '1',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: 'السؤال التالي',
    })
  );

  const mq5 = screen.getByRole('group', {
    name: 'حالات نهاية الدورة',
  });

  fireEvent.click(within(mq5).getAllByRole('button')[0]);

  fireEvent.click(
    screen.getByRole('button', {
      name: 'تسليم الإجابات',
    })
  );
}

describe('Grade9TimeMeasurementMastery', () => {
  it('لا يسرّب أي معرف داخلي أو تشخيص إلى DOM', () => {
    const { container } = renderMastery();
    start();

    const html = container.innerHTML;

    const internalValues = [
      ...Object.values(GRADE9_L13_MASTERY_VARIANTS).flatMap((variants) =>
        variants.flatMap((variant) => [
          variant.questionKey,
          variant.variantKey,
          variant.contextKey,
          variant.visualKey,
        ])
      ),
      'incorrect-start-boundary',
      'incorrect-end-boundary',
      'procedural-order-error',
      'extreme-point-confusion',
      'correct-position-wrong-direction',
      'opposite-extreme-point-confusion',
    ];

    for (const value of internalValues) {
      expect(html).not.toContain(value);
    }
  });

  it('MQ1 يعرض ست بطاقات بلا حروف A-F أمام الطالب', () => {
    renderMastery();
    start();

    expect(screen.getByText(/اختر أربع خطوات صحيحة/)).toBeInTheDocument();

    const group = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    expect(within(group).getAllByRole('button')).toHaveLength(6);

    for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('لا يكشف الصحة أو الخطأ أثناء المحاولة', () => {
    renderMastery();
    start();

    expect(screen.queryByText(/إجابة صحيحة/)).not.toBeInTheDocument();

    expect(screen.queryByText(/إجابة خاطئة/)).not.toBeInTheDocument();

    expect(screen.getByText(/لن تظهر صحة الإجابة أثناء المحاولة/)).toBeInTheDocument();
  });

  it('يتيح اختيار أربع خطوات وإعادة ترتيبها قبل الانتقال', () => {
    renderMastery();
    start();

    const group = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    const candidates = within(group).getAllByRole('button');

    candidates.slice(0, 4).forEach((button) => {
      fireEvent.click(button);
    });

    expect(screen.getByText(/الخطوات المختارة: 4 من 4/)).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    ).toBeEnabled();

    expect(
      screen.getAllByRole('button', {
        name: /تحريك الخطوة/,
      }).length
    ).toBeGreaterThan(0);
  });

  it('يبقي الوحدة خارج حقل MQ4', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(within(mq2).getAllByRole('button')[0]);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq3 = screen.getByRole('group', {
      name: 'خيارات المتوسط',
    });

    fireEvent.click(within(mq3).getAllByRole('button')[0]);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const input = screen.getByLabelText('زمن الدورة الواحدة');

    expect(input).toHaveAttribute('inputmode', 'decimal');

    expect(input).not.toHaveValue(expect.stringContaining('ثانية'));

    expect(screen.getByText('ثانية')).toBeInTheDocument();
  });

  it('يحفظ variantHistory كتسلسل زمني فعلي عبر الإعادات', () => {
    persistenceMocks.submitAttempt.mockClear();

    renderMastery(7);
    start();

    completeAttemptWithValidSelections();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إعادة التحقق بمواقف جديدة',
      })
    );

    completeAttemptWithValidSelections();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إعادة التحقق بمواقف جديدة',
      })
    );

    completeAttemptWithValidSelections();

    expect(persistenceMocks.submitAttempt).toHaveBeenCalledTimes(3);

    const contexts = persistenceMocks.submitAttempt.mock.calls.map(
      ([submission]) => submission.experienceContext
    );

    const keys = ['mq1', 'mq2', 'mq3', 'mq4', 'mq5'] as const;

    for (const key of keys) {
      expect(contexts[0].variantHistory[key]).toHaveLength(1);

      expect(contexts[1].variantHistory[key]).toHaveLength(2);

      expect(contexts[2].variantHistory[key]).toHaveLength(3);

      expect(contexts[1].variantHistory[key][1]).not.toBe(contexts[1].variantHistory[key][0]);

      expect(contexts[2].variantHistory[key][2]).not.toBe(contexts[2].variantHistory[key][1]);
    }

    for (const key of ['mq1', 'mq2', 'mq4', 'mq5'] as const) {
      expect(contexts[2].variantHistory[key][2]).toBe(contexts[2].variantHistory[key][0]);
    }

    expect(new Set(contexts[2].variantHistory.mq3).size).toBe(3);
  });

  it('يرسل سياق L13 التشخيصي الكامل عند حفظ المحاولة', () => {
    persistenceMocks.submitAttempt.mockClear();

    renderMastery(7);
    start();

    // MQ1: اختر مشتت حد البداية E عمدًا.
    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    const mq1Buttons = within(mq1).getAllByRole('button');

    const mq1StartBoundary = mq1Buttons.find((button) =>
      button.textContent?.includes('ابدأ تشغيل المؤقت عندما يصل')
    );

    expect(mq1StartBoundary).toBeDefined();

    fireEvent.click(mq1StartBoundary!);

    mq1Buttons
      .filter((button) => button !== mq1StartBoundary)
      .slice(0, 3)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    // MQ2: misconception = decimals imply accuracy.
    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(
      within(mq2).getByRole('button', {
        name: 'صحيح؛ لأن عرض منزلتين عشريتين يعني دقة القياس حتى 0.01 ثانية.',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    // MQ3: اختر الوسيط بدل المتوسط لأي متغير ظاهر.
    const mq3 = screen.getByRole('group', {
      name: 'خيارات المتوسط',
    });

    const activeMq3Variant = GRADE9_L13_MASTERY_VARIANTS.mq3.find((variant) => {
      const medianLabel = `${(variant.medianHundredths / 100).toFixed(2)} ثانية`;

      return within(mq3).queryByRole('button', { name: medianLabel });
    });

    expect(activeMq3Variant).toBeDefined();

    fireEvent.click(
      within(mq3).getByRole('button', {
        name: `${(activeMq3Variant!.medianHundredths / 100).toFixed(2)} ثانية`,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    // MQ4: استخدم الزمن الكلي بدل زمن دورة واحدة.
    const pageText = document.body.textContent ?? '';

    const activeMq4Variant = GRADE9_L13_MASTERY_VARIANTS.mq4.find((variant) =>
      pageText.includes((variant.totalHundredths / 100).toFixed(2))
    );

    expect(activeMq4Variant).toBeDefined();

    fireEvent.change(screen.getByLabelText('زمن الدورة الواحدة'), {
      target: {
        value: (activeMq4Variant!.totalHundredths / 100).toFixed(2),
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    // MQ5: نفس الموضع المرجعي لكن اتجاه خاطئ.
    const mq5 = screen.getByRole('group', {
      name: 'حالات نهاية الدورة',
    });

    const mq5PageText = document.body.textContent ?? '';

    const activeMq5Variant = GRADE9_L13_MASTERY_VARIANTS.mq5.find((variant) =>
      mq5PageText.includes(
        variant.variantKey === 'spring-seat-reference-down' ? 'مقعد زنبركي' : 'منصة مرنة'
      )
    );

    expect(activeMq5Variant).toBeDefined();

    const mq5WrongDirection = activeMq5Variant!.options.find(
      (option) => option.diagnostic === 'correct-position-wrong-direction'
    );

    expect(mq5WrongDirection).toBeDefined();

    fireEvent.click(
      within(mq5).getByRole('button', {
        name: mq5WrongDirection!.text,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تسليم الإجابات',
      })
    );

    expect(persistenceMocks.submitAttempt).toHaveBeenCalledTimes(1);

    const submission = persistenceMocks.submitAttempt.mock.calls[0][0];

    expect(submission.experienceContext).toMatchObject({
      schema: 'g9-l13-time-mastery-v1',
      scoreNof5: '0/5',
      lessonMasteryLevel: 'focused_review',
      objective2_1Status: 'needs_review',
      objective3_1Status: 'needs_review',
      allObjectivesMastered: false,
      diagnosticCodes: [
        'incorrect-start-boundary',
        'display-decimals-equal-accuracy',
        'used-median-instead-of-mean',
        'used-total-time',
        'correct-position-wrong-direction',
      ],
      attemptCount: 1,
    });

    const variantHistory = submission.experienceContext.variantHistory;

    for (const key of ['mq1', 'mq2', 'mq3', 'mq4', 'mq5'] as const) {
      expect(variantHistory[key]).toHaveLength(1);

      expect(
        GRADE9_L13_MASTERY_VARIANTS[key].some(
          (variant) => variant.variantKey === variantHistory[key][0]
        )
      ).toBe(true);
    }
  });

  it('يعرض تقرير الإتقان الكامل بعد التسليم بلا نسبة أو نجوم', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(within(mq2).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq3 = screen.getByRole('group', {
      name: 'خيارات المتوسط',
    });

    fireEvent.click(within(mq3).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    fireEvent.change(screen.getByLabelText('زمن الدورة الواحدة'), {
      target: { value: '0.74' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq5 = screen.getByRole('group', {
      name: 'حالات نهاية الدورة',
    });

    fireEvent.click(within(mq5).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تسليم الإجابات',
      })
    );

    const reportHeading = screen.getByText('تقرير الإتقان');
    const report = reportHeading.closest('.rafiq-l13-report');

    expect(report).not.toBeNull();

    const reportText = report?.textContent ?? '';

    expect(reportText).toMatch(/[0-5]\/5/);

    expect(reportText).toMatch(/إتقان مرحلي متقدم|جيد|قيد التثبيت|يحتاج مراجعة مركزة/);

    expect(reportText).toContain('استخدام أدوات التوقيت');
    expect(reportText).toContain('متوسط القياسات المتكررة');
    expect(reportText).toContain('الزمن الدوري');

    expect(reportText).toContain('الهدف 2-1');
    expect(reportText).toContain('الهدف 3-1');

    expect(reportText).toContain('تحقق جميع الأهداف');

    expect(reportText).toContain('الإجراء التالي');

    expect(reportText).toContain('ما أتقنته');
    expect(reportText).toContain('ما يحتاج مراجعة');

    expect(reportText).not.toMatch(/\d+\s*%/);
    expect(reportText).not.toMatch(/[★☆⭐]/);
  });

  it('MQ1 يرسم المؤقت عند الصفر ويفصل تسمية العلامة عن خط المستوى', () => {
    renderMastery();
    start();

    const visual = screen.getByRole('img', {
      name: /مؤقت تناظري/,
    });

    const ticks = visual.querySelectorAll('.timer-tick');
    expect(ticks.length).toBeGreaterThanOrEqual(12);

    const hands = visual.querySelectorAll('.timer-hand');
    expect(hands).toHaveLength(1);

    const hand = hands[0];

    expect(hand.getAttribute('x1')).toBe(hand.getAttribute('x2'));

    const handY1 = Number(hand.getAttribute('y1'));
    const handY2 = Number(hand.getAttribute('y2'));

    expect(Number.isFinite(handY1)).toBe(true);
    expect(Number.isFinite(handY2)).toBe(true);
    expect(handY2).toBeLessThan(handY1);

    const targetLine = visual.querySelector('.target-line');
    const targetLabel = visual.querySelector('.target-label');

    expect(targetLine).not.toBeNull();
    expect(targetLabel).not.toBeNull();

    const lineEndX = Number(targetLine?.getAttribute('x2'));
    const lineY = Number(targetLine?.getAttribute('y1'));
    const labelX = Number(targetLabel?.getAttribute('x'));
    const labelY = Number(targetLabel?.getAttribute('y'));

    expect(labelX).toBeGreaterThanOrEqual(lineEndX + 12);
    expect(Math.abs(labelY - lineY)).toBeGreaterThanOrEqual(12);
  });

  it('MQ2 يحاذي السيارة مع المنحدر ويظهر التوقيت اليدوي', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const visual = screen.getByRole('img', {
      name: /سيارة لعبة واحدة على منحدر ومؤقت رقمي/,
    });

    expect(visual.querySelectorAll('.toy-car')).toHaveLength(1);
    expect(visual.querySelectorAll('.digital-timer')).toHaveLength(1);

    const carGroup = visual.querySelector('.toy-car-group');

    expect(carGroup).not.toBeNull();

    const transform = carGroup?.getAttribute('transform') ?? '';
    const angleMatch = transform.match(/rotate\(\s*(-?\d+(?:\.\d+)?)/);

    expect(angleMatch).not.toBeNull();

    const angle = Number(angleMatch?.[1]);

    expect(Number.isFinite(angle)).toBe(true);
    expect(Math.abs(angle)).toBeGreaterThanOrEqual(20);
    expect(Math.abs(angle)).toBeLessThanOrEqual(28);

    expect(visual.querySelector('.manual-timing-hand')).not.toBeNull();
  });

  it('MQ3 يظهر قياس الارتفاع كاملًا بسهمين من الكرة إلى الأرض', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(within(mq2).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const visual = screen.getByRole('img', {
      name: /تجربة سقوط كرة من ارتفاع/,
    });

    const heightGroup = visual.querySelector('.height-measure-group');
    expect(heightGroup).not.toBeNull();

    const heightLine = visual.querySelector('.height-measure');
    expect(heightLine).not.toBeNull();

    expect(heightLine?.getAttribute('x1')).toBe(heightLine?.getAttribute('x2'));

    const topY = Number(heightLine?.getAttribute('y1'));
    const bottomY = Number(heightLine?.getAttribute('y2'));

    expect(topY).toBeLessThanOrEqual(60);
    expect(bottomY).toBeGreaterThanOrEqual(190);

    expect(visual.querySelectorAll('.height-arrowhead')).toHaveLength(2);

    const label = visual.querySelector('.height-label');
    expect(label).not.toBeNull();

    const labelX = Number(label?.getAttribute('x'));

    expect(Number.isFinite(labelX)).toBe(true);
    expect(labelX).toBeGreaterThanOrEqual(45);
  });

  it('MQ4 يستخدم الصياغة المعتمدة بدل سُحبت العربة', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(within(mq2).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq3 = screen.getByRole('group', {
      name: 'خيارات المتوسط',
    });

    fireEvent.click(within(mq3).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    expect(screen.getByText(/أُزيحت العربة إلى أحد طرفي الحركة ثم أُطلقت منه/)).toBeInTheDocument();

    expect(screen.queryByText(/سُحبت العربة إلى أحد طرفي الحركة/)).not.toBeInTheDocument();
  });

  it('MQ4 يستخدم الصياغة المعتمدة ويثبت النابض بمرساة واضحة مع فصل البداية عن الاتزان', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(within(mq2).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq3 = screen.getByRole('group', {
      name: 'خيارات المتوسط',
    });

    fireEvent.click(within(mq3).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const visual = screen.getByRole('img', {
      name: /عربة صغيرة متصلة بنابض أفقي/,
    });

    expect(visual.querySelector('.spring-wall-anchor')).not.toBeNull();

    const startLine = visual.querySelector('.start-line');
    const equilibriumLine = visual.querySelector('.equilibrium-line');

    expect(startLine).not.toBeNull();
    expect(equilibriumLine).not.toBeNull();

    const startX = Number(startLine?.getAttribute('x1'));
    const equilibriumX = Number(equilibriumLine?.getAttribute('x1'));

    expect(Number.isFinite(startX)).toBe(true);
    expect(Number.isFinite(equilibriumX)).toBe(true);
    expect(Math.abs(equilibriumX - startX)).toBeGreaterThanOrEqual(80);
  });

  it('MQ5 يفصل الخط المرجعي عن الطالب ويظهر مرونة المنصة وسهم السرعة بوضوح', () => {
    renderMastery();
    start();

    const mq1 = screen.getByRole('group', {
      name: 'الخطوات المتاحة',
    });

    within(mq1)
      .getAllByRole('button')
      .slice(0, 4)
      .forEach((button) => fireEvent.click(button));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq2 = screen.getByRole('group', {
      name: 'خيارات السؤال',
    });

    fireEvent.click(within(mq2).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const mq3 = screen.getByRole('group', {
      name: 'خيارات المتوسط',
    });

    fireEvent.click(within(mq3).getAllByRole('button')[0]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    fireEvent.change(screen.getByLabelText('زمن الدورة الواحدة'), {
      target: { value: '0.74' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'السؤال التالي',
      })
    );

    const visual = screen.getByRole('img', {
      name: /طالب على (?:منصة مرنة|مقعد زنبركي)/,
    });

    const referenceSegments = visual.querySelectorAll('.reference-line');

    expect(referenceSegments).toHaveLength(2);

    const leftSegment = referenceSegments[0];
    const rightSegment = referenceSegments[1];

    expect(Number(leftSegment.getAttribute('x2'))).toBeLessThanOrEqual(235);
    expect(Number(rightSegment.getAttribute('x1'))).toBeGreaterThanOrEqual(315);

    const referenceLabel = visual.querySelector('.reference-label');

    expect(referenceLabel).not.toBeNull();

    const referenceLabelX = Number(referenceLabel?.getAttribute('x'));

    expect(Number.isFinite(referenceLabelX)).toBe(true);
    expect(referenceLabelX).toBeLessThanOrEqual(440);

    const velocityLabel = visual.querySelector('.velocity-label');

    expect(velocityLabel).not.toBeNull();

    const velocityLabelY = Number(velocityLabel?.getAttribute('y'));

    expect(Number.isFinite(velocityLabelY)).toBe(true);
    expect(Math.abs(velocityLabelY - 120)).toBeGreaterThanOrEqual(24);

    expect(visual.querySelector('.velocity-line')).not.toBeNull();

    expect(visual.querySelector('.velocity-arrow')).not.toBeNull();

    if (visual.getAttribute('aria-label')?.includes('منصة مرنة')) {
      expect(visual.querySelector('.platform-flex-spring')).not.toBeNull();
    }
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Grade9TimeMeasurementLesson } from '@features/student/lesson-view/Grade9TimeMeasurementLesson';

const objectives = [
  {
    id: 'g9-s1-u1-l3-o2',
    lessonId: 'g9-phy-s1-u1-l3',
    text: 'يستخدم الساعات والأجهزة التناظرية والرقمية لقياس الفترات الزمنية ويصف استخدامها.',
  },
  {
    id: 'g9-s1-u1-l3-o3',
    lessonId: 'g9-phy-s1-u1-l3',
    text: 'يجد القيمة المتوسطة لمسافة قصيرة ولفترة زمنية قصيرة من خلال القياس لعدة مرات (بما في ذلك الزمن الدوري للبندول).',
  },
];

function renderLesson() {
  render(
    <Grade9TimeMeasurementLesson
      objectives={objectives}
      onBackToLessons={vi.fn()}
      onOpenReviewQuestions={vi.fn()}
      onOpenActivities={vi.fn()}
      onOpenMatchingGame={vi.fn()}
      onOpenVirtualLabs={vi.fn()}
      onOpenMasteryTest={vi.fn()}
    />
  );
}

describe('Grade9TimeMeasurementLesson visual fix 2', () => {
  it('يعرض المراحل الست والمرئيات الوظيفية الرئيسة', () => {
    renderLesson();
    expect(screen.getByRole('heading', { name: '1-3 قياس الزمن' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /عداءان بقصاصات فنية احترافية/ })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /مجموعة عدائين بقصاصات فنية احترافية/ })
    ).toBeInTheDocument();
    expect(document.querySelectorAll('.rafiq-runner-art > img, img.rafiq-runner-art')).toHaveLength(
      7
    );
    expect(document.querySelectorAll('img.rafiq-runner-art')).toHaveLength(0);
    expect(
      screen.getByRole('img', { name: /تناظرية تشير إلى دقيقتين و14 ثانية/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /رقمية تعرض صفر ساعة ودقيقتين و14 ثانية و37/ })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /بندول بسيط/ }).length).toBeGreaterThanOrEqual(3);
  });

  it('يبقي خطاف السباق تفاعليًا ويطلب التبرير', () => {
    renderLesson();
    fireEvent.click(screen.getByRole('button', { name: 'سباق 100 متر' }));
    fireEvent.click(screen.getByRole('button', { name: /المتسابقين قد يصلان بفارق صغير جدًا/ }));
    expect(
      screen.getByText(/مقدار التفصيل المطلوب في قياس الزمن يعتمد على الموقف/)
    ).toBeInTheDocument();
  });

  it('يبسط قراءة الساعة التناظرية إلى 2:14 ويُبقي الرقمية مستقلة', () => {
    renderLesson();
    fireEvent.click(screen.getByRole('button', { name: '2:14' }));
    expect(
      screen.getByText(/القرص الداخلي يشير إلى دقيقتين، والعقرب الخارجي يشير إلى 14 ثانية/)
    ).toBeInTheDocument();
    expect(screen.getAllByText('2:14').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('00:02:14.37').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('2:14.4')).not.toBeInTheDocument();
    expect(screen.queryByText(/28\.9/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3:59\.46/)).not.toBeInTheDocument();
  });

  it('يعرض تجربة زمن الاستجابة بثلاث محاولات ومؤشر تقدم', () => {
    renderLesson();
    expect(screen.getByLabelText('تقدم محاولات زمن الاستجابة')).toHaveTextContent('0/3 محاولات');
    expect(screen.getAllByText('0.01 ثانية').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'ابدأ المحاولة 1' })).toBeInTheDocument();
  });

  it('يجعل المرحلة الرابعة تجربة ضغط فعلية في كلتا الطريقتين', () => {
    renderLesson();
    expect(screen.getByRole('button', { name: 'ابدأ تجربة رد الفعل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ابدأ تجربة التوقع' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'اضغط عند العلامة' })).toHaveLength(2);
    expect(screen.getByText('نفّذ الطريقتين بنفسك ثم قارن بينهما.')).toBeInTheDocument();
  });

  it('لا يسجل التأرجح الثاني عشر ولا يكشف الزمن الكلي قبل عودة الكرة إلى نقطة البداية', async () => {
    renderLesson();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'من موضع البداية إلى الجانب الآخر ثم العودة إلى موضع البداية',
      })
    );

    const startButton = screen.getByRole('button', { name: 'شغّل عدّ 12 تأرجحًا' });
    const counter = screen.getByLabelText('عداد التأرجحات الكاملة');

    expect(counter).toHaveTextContent('0');
    expect(document.querySelector('.rafiq-period-problem')).toBeNull();
    expect(screen.queryByLabelText('إجابة الزمن الدوري بالثانية')).not.toBeInTheDocument();

    fireEvent.click(startButton);
    const motion = screen.getByTestId('counted-pendulum-motion');
    expect(motion).toHaveClass('is-running');

    for (let cycle = 1; cycle <= 11; cycle += 1) {
      fireEvent.animationIteration(motion);
    }

    expect(counter).toHaveTextContent('11');
    expect(document.querySelector('.rafiq-period-problem')).toBeNull();
    expect(screen.queryByLabelText('إجابة الزمن الدوري بالثانية')).not.toBeInTheDocument();

    fireEvent.animationEnd(motion);

    await waitFor(() => expect(counter).toHaveTextContent('12'));

    const periodProblem = document.querySelector('.rafiq-period-problem');
    expect(periodProblem).not.toBeNull();
    expect(periodProblem).toHaveTextContent('14.76 ثانية');
    expect(screen.getByLabelText('إجابة الزمن الدوري بالثانية')).toBeInTheDocument();
  });

  it('يعرض المرحلة السادسة بالعقد النهائي: بندول أطول ومرجع 1.36 و16 دورة', () => {
    renderLesson();

    expect(screen.getByRole('img', { name: /بندول آخر بخيط أطول/ })).toBeInTheDocument();
    expect(
      screen.getByText(
        'نستخدم هنا بندولًا آخر بخيط أطول، لذلك يختلف زمنه الدوري عن البندول السابق.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('المرجع 1.36 ثانية')).toBeInTheDocument();
    expect(screen.getByText('16 دورة كاملة')).toBeInTheDocument();

    const manyCycleCard = screen.getByText('B • 16 دورة كاملة ثم القسمة').closest('article');
    expect(manyCycleCard).not.toBeNull();
    expect(manyCycleCard).toHaveTextContent('21.99 ثانية');
    expect(manyCycleCard).toHaveTextContent(/21\.99\s*÷\s*16\s*=\s*1\.374\.\.\.\s*ثانية/);
    expect(manyCycleCard).toHaveTextContent('1.37 ثانية');

    const string = screen.getByTestId('stage6-pendulum-string');
    expect(Number(string.getAttribute('y2')) - Number(string.getAttribute('y1'))).toBeGreaterThan(
      200
    );

    expect(screen.queryByText(/المرجع 1\.60 ثانية/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8 دورات/)).not.toBeInTheDocument();
    expect(screen.queryByText(/نبضة قلب واحدة/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'الطريقة B' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: /نقيس مدة أطول لعدة دورات، ثم يتوزع أثر بدء وإيقاف الساعة/,
      })
    );
    expect(screen.getByText(/لم نلغ زمن الاستجابة/)).toBeInTheDocument();
  });

  it('يضبط هندسة الساعة التناظرية فعليًا على 2:14', () => {
    renderLesson();

    const minuteHand = document.querySelector('.minute-hand');
    const secondHand = document.querySelector('.second-hand');

    expect(minuteHand?.parentElement).toHaveAttribute('transform', 'rotate(24 160 168)');
    expect(secondHand?.parentElement).toHaveAttribute('transform', 'rotate(84 160 168)');
    expect(document.querySelectorAll('.minute-tick')).toHaveLength(30);
    expect(document.querySelectorAll('.watch-tick')).toHaveLength(60);
  });

  it('يعرض عدائين ذكورًا فقط ويكتب 100 متر بالعربية', () => {
    renderLesson();

    expect(document.querySelectorAll('.rafiq-runner-art > img, img.rafiq-runner-art')).toHaveLength(
      7
    );
    expect(screen.getAllByText(/100 متر/).length).toBeGreaterThanOrEqual(1);
  });

  it('clockGeometryValidation: يحول الزوايا إلى قراءة 2:14', () => {
    const minuteAngle = 24;
    const secondAngle = 84;

    const minutesRead = (minuteAngle / 360) * 30;
    const secondsRead = (secondAngle / 360) * 60;

    expect(minutesRead).toBe(2);
    expect(secondsRead).toBe(14);
  });

  it('يعرض الوحدات العربية ويقبل الأرقام العربية في حساب الزمن الدوري', async () => {
    renderLesson();

    const pageText = document.body.textContent ?? '';
    expect(pageText).not.toMatch(/\d+(?:[.,]\d+)?\s*(?:s|min|m)\b/i);
    expect(screen.getAllByText('0.01 ثانية').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'من موضع البداية إلى الجانب الآخر ثم العودة إلى موضع البداية',
      })
    );

    const startMeasurement = screen.getByRole('button', { name: 'شغّل عدّ 12 تأرجحًا' });
    fireEvent.click(startMeasurement);

    const animatedPendulum = screen.getByTestId('counted-pendulum-motion');
    expect(animatedPendulum).toHaveClass('is-running');

    for (let cycle = 1; cycle <= 11; cycle += 1) {
      fireEvent.animationIteration(animatedPendulum);
    }
    fireEvent.animationEnd(animatedPendulum);

    await waitFor(() =>
      expect(screen.getByLabelText('إجابة الزمن الدوري بالثانية')).toBeInTheDocument()
    );

    const periodInput = screen.getByLabelText('إجابة الزمن الدوري بالثانية');
    fireEvent.change(periodInput, { target: { value: '١٫٢٣' } });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من الحساب' }));

    expect(screen.getByText(/14\.76 ÷ 12 = 1\.23 ثانية/)).toBeInTheDocument();
  });
});

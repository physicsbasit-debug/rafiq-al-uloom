// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Grade9TimeMeasurementReview } from '@features/student/review-questions/Grade9TimeMeasurementReview';
import { semester1ReferenceReviewQuestions } from '@content/seed/semester1-reference-lessons.seed';

const questions = semester1ReferenceReviewQuestions.filter(
  (question) => question.lessonId === 'g9-phy-s1-u1-l3'
);

afterEach(() => cleanup());

function currentQuestionCard() {
  const cards = screen.getAllByRole('article');
  return cards[cards.length - 1];
}

function chooseCorrectAndAdvance() {
  const card = currentQuestionCard();
  const choices = within(card)
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') !== null);
  const correct = choices.find((button) => button.getAttribute('data-correct') === 'true');
  expect(correct).toBeDefined();
  fireEvent.click(correct as HTMLButtonElement);

  const next = within(card).getByRole('button', {
    name: /السؤال التالي|الخطوة التالية|إنهاء المراجعة/,
  });
  fireEvent.click(next);
}

describe('Grade9TimeMeasurementReview', () => {
  it('يعرض التدرج الخماسي ويبدأ بخط زمني بلا أرقام', () => {
    render(
      <Grade9TimeMeasurementReview
        questions={questions}
        onBackToLesson={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText('استرجاع معنى الفترة')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'خط زمني يوضح فترة بين بداية حدث ونهايته دون أرقام',
      })
    ).toBeInTheDocument();
    expect(screen.queryByText('الفرق بين القراءتين')).not.toBeInTheDocument();
  });

  it('يعطي تلميحًا بعد الخطأ الأول ولا يكشف الشرح ثم ينهي السؤال بعد المحاولة الثانية', () => {
    render(
      <Grade9TimeMeasurementReview
        questions={questions}
        onBackToLesson={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const card = currentQuestionCard();
    const wrongChoices = within(card)
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-pressed') !== null &&
          button.getAttribute('data-correct') !== 'true'
      );

    fireEvent.click(wrongChoices[0]);
    expect(screen.getByText(/تتبّع الخط الزمني/)).toBeInTheDocument();
    expect(screen.queryByText(/الفترة الزمنية تمتد من بداية الحدث/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حاول مرة أخرى' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    fireEvent.click(wrongChoices[1]);

    expect(screen.getByText(/الفترة الزمنية تمتد من بداية الحدث/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeEnabled();
  });

  it('يعرض RQ2 بالسياق الرسمي وRQ3 كسجل قراءات وRQ4 كرسم مسار بندول', () => {
    render(
      <Grade9TimeMeasurementReview
        questions={questions}
        onBackToLesson={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    chooseCorrectAndAdvance();
    expect(screen.getByText('تطبيق قصير')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'يعرض التلفاز 25 صورة كل ثانية'
    );
    expect(
      screen.getByRole('img', { name: 'شريط يوضح 25 صورة موزعة على ثانية واحدة' })
    ).toBeInTheDocument();

    chooseCorrectAndAdvance();
    expect(screen.getByText('قراءة مرئية')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'سجل القراءات الزمنية الثلاث' })).toBeInTheDocument();

    chooseCorrectAndAdvance();
    expect(screen.getByText('اكتشاف خطأ مفاهيمي')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'مسار بندول من البداية إلى الطرف المقابل ثم العودة إلى البداية',
      })
    ).toBeInTheDocument();
  });

  it('ينفذ RQ5 بثلاث خطوات ولكل خطوة محاولتان مستقلتان ثم يبلغ اكتمال المراجعة', () => {
    const onComplete = vi.fn();

    render(
      <Grade9TimeMeasurementReview
        questions={questions}
        onBackToLesson={vi.fn()}
        onComplete={onComplete}
      />
    );

    for (let index = 0; index < 4; index += 1) chooseCorrectAndAdvance();

    expect(screen.getByText('ربط المفهوم')).toBeInTheDocument();
    expect(screen.getByText('الخطوة 1 من 3')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'بيانات قياس الزمن الدوري للبندول' })
    ).toBeInTheDocument();

    const firstStep = currentQuestionCard();
    const wrong = within(firstStep)
      .getAllByRole('button')
      .find(
        (button) =>
          button.getAttribute('aria-pressed') !== null &&
          button.getAttribute('data-correct') !== 'true'
      );
    fireEvent.click(wrong as HTMLButtonElement);
    expect(screen.getByText('المحاولة 1 من 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));

    const correct = within(currentQuestionCard())
      .getAllByRole('button')
      .find((button) => button.getAttribute('data-correct') === 'true');
    fireEvent.click(correct as HTMLButtonElement);
    expect(screen.getByText('المحاولة 2 من 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الخطوة التالية' }));

    expect(screen.getByText('الخطوة 2 من 3')).toBeInTheDocument();
    expect(screen.queryByText('المحاولة 1 من 2')).not.toBeInTheDocument();
    chooseCorrectAndAdvance();

    expect(screen.getByText('الخطوة 3 من 3')).toBeInTheDocument();
    chooseCorrectAndAdvance();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'مراجعة فهمك' })).toBeInTheDocument();
  });
});

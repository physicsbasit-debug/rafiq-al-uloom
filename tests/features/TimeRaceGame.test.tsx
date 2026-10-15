// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeRaceGame } from '@features/games/time-race/TimeRaceGame';
import { selectTimeRaceAttempt } from '@features/games/time-race/time-race-bank';
import type { RaceClock } from '@features/games/time-race/time-race-engine';

const SEED = 1;

function createFakeClock(): RaceClock & { step(ms: number): void } {
  let now = 0;
  let nextId = 1;
  const callbacks = new Map<number, (time: number) => void>();

  return {
    now: () => now,
    requestFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      callbacks.delete(id);
    },
    step(ms) {
      now += ms;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(now));
    },
  };
}

function firstPair() {
  const pair = selectTimeRaceAttempt({ seed: SEED })[0];
  if (!pair) throw new Error('missing first race pair');
  return pair;
}

function winnerLabel() {
  return firstPair().winner === 'nissan' ? 'السيارة 1' : 'السيارة 2';
}

function loserLabel() {
  return firstPair().winner === 'nissan' ? 'السيارة 2' : 'السيارة 1';
}

function finishRace(clock: ReturnType<typeof createFakeClock>) {
  fireEvent.click(screen.getByRole('button', { name: 'ابدأ السباق' }));

  act(() => {
    for (let index = 0; index < 160; index += 1) {
      clock.step(100);
    }
  });
}

function reachDifferenceQuestion(clock: ReturnType<typeof createFakeClock>) {
  finishRace(clock);
  fireEvent.click(screen.getByRole('button', { name: winnerLabel() }));
  expect(screen.getByLabelText('الفرق الزمني')).toBeInTheDocument();
}

afterEach(() => cleanup());

describe('TimeRaceGame — سباق أجزاء الثانية', () => {
  it('يدخل مباشرة ويعرض بروتوكول التفكير وحالة ما قبل السباق', () => {
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} />);

    expect(screen.getByRole('heading', { name: 'سباق أجزاء الثانية' })).toBeInTheDocument();
    expect(screen.getByText('ما الزمنان؟')).toBeInTheDocument();
    expect(screen.getByText('أيهما الأصغر؟')).toBeInTheDocument();
    expect(screen.getByText('اطرح الأصغر من الأكبر.')).toBeInTheDocument();
    expect(screen.getByText('اعتمد')).toBeInTheDocument();

    expect(screen.getByText('أزمنة افتراضية معدّة للنشاط.')).toBeInTheDocument();
    expect(
      screen.getByText('الأزمنة غير حقيقية، والهدف التدريب على المقارنة وحساب الفرق.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('0.00 ث')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'ابدأ السباق' })).toBeEnabled();
    expect(screen.queryByLabelText('الفرق الزمني')).not.toBeInTheDocument();
  });

  it('يعطل البدء أثناء الحركة ولا يكشف الإجابة قبل وصول السيارتين', () => {
    const clock = createFakeClock();
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} clock={clock} />);

    const start = screen.getByRole('button', { name: 'ابدأ السباق' });
    fireEvent.click(start);

    expect(start).toBeDisabled();
    expect(screen.queryByText('وصل أولًا')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('الفرق الزمني')).not.toBeInTheDocument();
  });

  it('المؤقت الجاري LTR وبأرقام متساوية العرض ومن دون aria-live', () => {
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} />);

    for (const timer of screen.getAllByTestId('time-race-timer')) {
      expect(timer).toHaveAttribute('dir', 'ltr');
      expect(timer).not.toHaveAttribute('aria-live');
      expect(timer).toHaveStyle({ fontVariantNumeric: 'tabular-nums' });
    }
  });

  it('حقل الفرق نصي مع inputMode decimal ويقبل السالب للتشخيص', () => {
    const clock = createFakeClock();
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} clock={clock} />);
    reachDifferenceQuestion(clock);

    const input = screen.getByLabelText('الفرق الزمني');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'decimal');

    fireEvent.change(input, { target: { value: '-1.84' } });
    expect(input).toHaveValue('-1.84');
  });

  it('الإدخال الفارغ لا يحسب محاولة ولا يكشف التلميح', () => {
    const clock = createFakeClock();
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} clock={clock} />);
    reachDifferenceQuestion(clock);

    fireEvent.click(screen.getByRole('button', { name: 'تحقق من الفرق' }));
    expect(
      screen.queryByText('اطرح الأصغر من الأكبر، وانتبه إلى مواضع الفاصلة')
    ).not.toBeInTheDocument();
  });

  it('بعد الخطأ الثاني تبقى الخطوات حتى يكتب الطالب الناتج الصحيح بنفسه', () => {
    const clock = createFakeClock();
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} clock={clock} />);
    reachDifferenceQuestion(clock);

    const input = screen.getByLabelText('الفرق الزمني');
    const verify = screen.getByRole('button', { name: 'تحقق من الفرق' });

    fireEvent.change(input, { target: { value: '9.99' } });
    fireEvent.click(verify);
    expect(screen.getByText('اطرح الأصغر من الأكبر، وانتبه إلى مواضع الفاصلة')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '8.88' } });
    fireEvent.click(verify);
    expect(screen.getByTestId('time-race-vertical-subtraction')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'التالي' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '7.77' } });
    fireEvent.click(verify);
    expect(screen.getByTestId('time-race-vertical-subtraction')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'التالي' })).not.toBeInTheDocument();
  });

  it('خطآن في سؤال الفائز يبرزان الصحيح ثم ينتقلان لسؤال الفرق', () => {
    const clock = createFakeClock();
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} clock={clock} />);
    finishRace(clock);

    const wrong = screen.getByRole('button', { name: loserLabel() });
    fireEvent.click(wrong);
    fireEvent.click(screen.getByRole('button', { name: loserLabel() }));

    expect(screen.getByText('وصل أولًا')).toBeInTheDocument();
    expect(screen.getByLabelText('الفرق الزمني')).toBeInTheDocument();
  });

  it('الإجابة الصحيحة بعد الخطوات هي وحدها التي تكشف زر التالي', () => {
    const clock = createFakeClock();
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} clock={clock} />);
    reachDifferenceQuestion(clock);

    const input = screen.getByLabelText('الفرق الزمني');
    const verify = screen.getByRole('button', { name: 'تحقق من الفرق' });
    fireEvent.change(input, { target: { value: '9.99' } });
    fireEvent.click(verify);
    fireEvent.change(input, { target: { value: '8.88' } });
    fireEvent.click(verify);

    const correct = (firstPair().differenceCs / 100).toFixed(2);
    fireEvent.change(input, { target: { value: correct } });
    fireEvent.click(verify);

    expect(screen.getByRole('button', { name: 'التالي' })).toBeInTheDocument();
  });

  it('DOM لا يكشف pairId أو مفاتيح داخلية أو kebab-case', () => {
    const { container } = render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} />);
    const text = container.textContent ?? '';

    expect(text).not.toMatch(/\bB\d{2}\b/);
    expect(text).not.toContain('pairId');
    expect(text).not.toContain('differenceOutcome');
    expect(text).not.toContain('winnerIdentification');
    expect(text).not.toMatch(/\b[a-z]+(?:-[a-z0-9]+){2,}\b/);
  });

  it('لا يستخدم رسم fallback عام', () => {
    const { container } = render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} />);
    expect(container.querySelector('[data-visual="generic"]')).not.toBeInTheDocument();
    expect(screen.getByTestId('time-race-track')).toBeInTheDocument();
  });

  it('النص RTL والمضمار LTR والفائز لا يعتمد على اللون وحده', () => {
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} />);
    expect(screen.getByTestId('time-race-shell')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('time-race-track')).toHaveAttribute('dir', 'ltr');
  });

  it('لا يعرض ملاحظة التمييز والدقة أثناء السباقات', () => {
    render(<TimeRaceGame onBack={vi.fn()} initialSeed={SEED} />);
    expect(
      screen.queryByText(
        'تذكّر: عدد المنازل العشرية في شاشة القياس يصف تمييز العرض، ولا يحدد وحده دقة القياس.'
      )
    ).not.toBeInTheDocument();
  });
});

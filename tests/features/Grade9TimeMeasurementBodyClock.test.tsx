// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Grade9TimeMeasurementActivities } from '@features/activities/time-measurement/Grade9TimeMeasurementActivities';

function openInquiry() {
  render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاستقصاء' }));
}

function choosePrediction() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'قياس 50 نبضة قد يقلل أثر تشغيل وإيقاف الساعة على تقدير زمن النبضة الواحدة',
    })
  );
  fireEvent.click(screen.getByRole('button', { name: 'ثبّت توقعي وابدأ القياس' }));
}

function recordMeasurement(seconds: number, pulseCount: 10 | 50) {
  fireEvent.click(screen.getByRole('button', { name: 'ابدأ القياس' }));
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
  fireEvent.click(screen.getByRole('button', { name: `أوقف بعد ${pulseCount} نبضات` }));
}

describe('Grade 9 lesson 1-3 body clock inquiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('يطلب تنبؤًا بثلاثة خيارات قبل القياس ثم يعود إليه في النهاية', () => {
    openInquiry();

    expect(screen.getByText('توقّع قبل أن تقيس')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'قياس 10 نبضات أفضل دائمًا لأنه يستغرق وقتًا أقصر',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'لا يختلف أثر تشغيل وإيقاف الساعة بين 10 و50 نبضة',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'قياس 50 نبضة قد يقلل أثر تشغيل وإيقاف الساعة على تقدير زمن النبضة الواحدة',
      })
    ).toBeInTheDocument();

    choosePrediction();
    recordMeasurement(8, 10);
    fireEvent.click(screen.getByRole('button', { name: 'انتقل إلى المحاولة الثانية' }));

    recordMeasurement(9, 10);
    fireEvent.click(screen.getByRole('button', { name: 'احسب متوسط القياسين' }));

    fireEvent.change(screen.getByLabelText('متوسط زمن 10 نبضات'), {
      target: { value: '8.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المتوسط' }));
    fireEvent.click(screen.getByRole('button', { name: 'انتقل إلى قياس 50 نبضة' }));

    recordMeasurement(42, 50);
    fireEvent.click(screen.getByRole('button', { name: 'قارن الطريقتين' }));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'يتوزع أثر تشغيل وإيقاف الساعة على عدد أكبر من النبضات عند قياس 50 نبضة',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'ارجع إلى توقعي' }));

    expect(screen.getByText('ارجع إلى توقعك الأول')).toBeInTheDocument();
    expect(
      screen.getByText('قياس 50 نبضة قد يقلل أثر تشغيل وإيقاف الساعة على تقدير زمن النبضة الواحدة')
    ).toBeInTheDocument();
  });

  it('يقبل مدة 10 نبضات خارج 6–12 ثانية مع تحذير فقط', () => {
    openInquiry();
    choosePrediction();

    recordMeasurement(5, 10);

    expect(screen.getByText(/خارج المدى المقترح 6–12 ثانية.*تنبيه فقط/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'انتقل إلى المحاولة الثانية' })).toBeEnabled();
  });

  it('يعطي تلميحًا بعد خطأ المتوسط الأول ويكشف الإجابة بعد الثاني', () => {
    openInquiry();
    choosePrediction();

    recordMeasurement(8, 10);
    fireEvent.click(screen.getByRole('button', { name: 'انتقل إلى المحاولة الثانية' }));
    recordMeasurement(10, 10);
    fireEvent.click(screen.getByRole('button', { name: 'احسب متوسط القياسين' }));

    const input = screen.getByLabelText('متوسط زمن 10 نبضات');

    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المتوسط' }));
    expect(screen.getByText(/اجمع الزمنين ثم اقسم على 2/)).toBeInTheDocument();
    expect(screen.queryByText(/المتوسط الصحيح هو/)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '7.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المتوسط' }));
    expect(screen.getByText(/المتوسط الصحيح هو 9.00 ثانية/)).toBeInTheDocument();
  });

  it('لا يرسل القياسات الخام إلى الخادم ويحفظها داخل حالة المكوّن فقط', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    openInquiry();
    choosePrediction();
    recordMeasurement(8, 10);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Grade9TimeMeasurementActivities } from '@features/activities/time-measurement/Grade9TimeMeasurementActivities';

function openExperiment() {
  render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'ابدأ التجربة الموجهة' }));
}

function selectControlledVariables() {
  fireEvent.click(screen.getByRole('button', { name: 'طول الخيط' }));
  fireEvent.click(screen.getByRole('button', { name: 'الكرة المستخدمة' }));
  fireEvent.click(screen.getByRole('button', { name: 'زاوية الإزاحة الابتدائية' }));
  fireEvent.click(screen.getByRole('button', { name: 'تحقق من المتغيرات المضبوطة' }));
}

function tryBothTimersAndChooseDigital() {
  fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة التناظرية' }));
  fireEvent.click(screen.getByRole('button', { name: 'أوقف الساعة التناظرية' }));

  fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة الرقمية' }));
  fireEvent.click(screen.getByRole('button', { name: 'أوقف الساعة الرقمية' }));

  fireEvent.click(screen.getByRole('button', { name: 'أختار الساعة الرقمية' }));
}

function enterTenMeasurements() {
  const values = ['1.21', '1.24', '1.22', '1.25', '1.20', '1.23', '1.26', '1.22', '1.24', '1.21'];

  values.forEach((value, index) => {
    fireEvent.change(screen.getByLabelText(`زمن القياس ${index + 1}`), {
      target: { value },
    });
  });

  fireEvent.click(screen.getByRole('button', { name: 'اعتمد القياسات العشرة' }));
}

describe('Grade 9 lesson 1-3 guided pendulum experiment', () => {
  it('يرفع الجاهزية إلى 3/3 ويجعل التجربة متوفرة', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    const summary = screen.getByLabelText('جاهزية الأنشطة العلمية');
    expect(within(summary).getByText('3/3')).toBeInTheDocument();

    const experiment = screen.getByRole('article', { name: 'التجربة الموجهة' });
    expect(within(experiment).getByText('متوفر')).toBeInTheDocument();
    expect(within(experiment).getByRole('button', { name: 'ابدأ التجربة الموجهة' })).toBeEnabled();
  });

  it('يطلب تحديد المتغيرات المضبوطة قبل القياس', () => {
    openExperiment();

    expect(screen.getByText('1. ثبّت شروط المقارنة')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'طول الخيط' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الكرة المستخدمة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'زاوية الإزاحة الابتدائية' })).toBeInTheDocument();
  });

  it('يلزم تجربة الساعة التناظرية والرقمية قبل اختيار الأداة', () => {
    openExperiment();
    selectControlledVariables();

    expect(screen.getByText('2. جرّب أداتي قياس الزمن')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'أختار الساعة الرقمية' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة التناظرية' }));
    fireEvent.click(screen.getByRole('button', { name: 'أوقف الساعة التناظرية' }));

    expect(screen.getByRole('button', { name: 'أختار الساعة الرقمية' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة الرقمية' }));
    fireEvent.click(screen.getByRole('button', { name: 'أوقف الساعة الرقمية' }));

    expect(screen.getByRole('button', { name: 'أختار الساعة الرقمية' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'أختار الساعة التناظرية' })).toBeEnabled();
  });

  it('يجمع عشر قياسات فعلية دون قيمة مرجعية أو حذف تلقائي', () => {
    openExperiment();
    selectControlledVariables();
    tryBothTimersAndChooseDigital();

    expect(
      screen.getByText(/ابدأ وأوقف القياس عند النقطة نفسها وفي الاتجاه نفسه/)
    ).toBeInTheDocument();

    expect(screen.getAllByLabelText(/زمن القياس/)).toHaveLength(10);
    expect(screen.getByText('لن تُحذف أي قراءة تلقائيًا.')).toBeInTheDocument();

    expect(screen.queryByText(/القيمة المرجعية/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /حذف.*قراءة/ })).not.toBeInTheDocument();
  });

  it('يجعل الطالب يحدد الأقل والأكبر والمدى ويعطي تلميحًا ثم كشفًا', () => {
    openExperiment();
    selectControlledVariables();
    tryBothTimersAndChooseDigital();
    enterTenMeasurements();

    expect(screen.getByText('4. استخرج المدى من قياساتك')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('أقل زمن'), {
      target: { value: '1.10' },
    });
    fireEvent.change(screen.getByLabelText('أكبر زمن'), {
      target: { value: '1.30' },
    });
    fireEvent.change(screen.getByLabelText('المدى'), {
      target: { value: '0.20' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المدى' }));

    expect(screen.getByText(/ارجع إلى قياساتك العشرة نفسها/)).toBeInTheDocument();
    expect(screen.queryByText(/القيم الصحيحة من قياساتك/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المدى' }));

    expect(screen.getByText(/القيم الصحيحة من قياساتك/)).toBeInTheDocument();
  });

  it('ينتقل إلى قياس 20 اهتزازة ثم الحكم على الطريقة', () => {
    openExperiment();
    selectControlledVariables();
    tryBothTimersAndChooseDigital();
    enterTenMeasurements();

    fireEvent.change(screen.getByLabelText('أقل زمن'), {
      target: { value: '1.20' },
    });
    fireEvent.change(screen.getByLabelText('أكبر زمن'), {
      target: { value: '1.26' },
    });
    fireEvent.change(screen.getByLabelText('المدى'), {
      target: { value: '0.06' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المدى' }));

    expect(screen.getByText('5. قِس زمن 20 اهتزازة')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('الزمن الكلي لعشرين اهتزازة'), {
      target: { value: '24.7' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'سجّل زمن 20 اهتزازة' }));

    expect(screen.getByText('6. احكم على طريقة القياس')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'قياس 20 اهتزازة ثم قسمة الزمن على 20',
      })
    );

    expect(screen.getByText('حكم علمي صحيح')).toBeInTheDocument();
  });

  it('لا يعرض قيمة مرجعية مصطنعة ولا يحذف قراءة شاذة تلقائيًا', () => {
    const source = Grade9TimeMeasurementActivities.toString();

    expect(source).not.toContain('1.36');
    expect(source).not.toContain('1.23');
    expect(source).not.toMatch(/removeOutlier|deleteOutlier|filterOutlier/);
  });

  it('يجعل اختيار المتغيرات متعددًا وواضحًا وثابتًا وقابلًا للإلغاء', () => {
    openExperiment();

    const verify = screen.getByRole('button', {
      name: 'تحقق من المتغيرات المضبوطة',
    });

    expect(verify).toBeDisabled();

    const length = screen.getByRole('button', {
      name: 'طول الخيط',
    });

    const ball = screen.getByRole('button', {
      name: 'الكرة المستخدمة',
    });

    fireEvent.click(length);

    expect(length).toHaveAttribute('aria-pressed', 'true');
    expect(length).toHaveClass('is-selected');
    expect(verify).toBeEnabled();

    fireEvent.click(ball);

    expect(length).toHaveAttribute('aria-pressed', 'true');
    expect(ball).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(length);

    expect(length).toHaveAttribute('aria-pressed', 'false');
    expect(length).not.toHaveClass('is-selected');
    expect(ball).toHaveAttribute('aria-pressed', 'true');
  });

  it('يبقي التشخيص مرتبطًا بمعرف الخيار بعد الخلط', () => {
    openExperiment();

    const changed = screen.getByRole('button', {
      name: 'عدد الاهتزازات المقاسة',
    });

    expect(changed).toHaveAttribute('data-choice-id', 'oscillation-count');

    expect(changed).toHaveAttribute('data-diagnosis', 'changed-variable');

    const length = screen.getByRole('button', {
      name: 'طول الخيط',
    });

    expect(length).toHaveAttribute('data-choice-id', 'string-length');

    expect(length).toHaveAttribute('data-diagnosis', 'fixed-comparison-condition');
  });

  it('يفرق بين اختيار المتغير المتغير ونسيان متغير مضبوط', () => {
    const first = render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'ابدأ التجربة الموجهة',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'عدد الاهتزازات المقاسة',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تحقق من المتغيرات المضبوطة',
      })
    );

    expect(screen.getByText(/عدد الاهتزازات المقاسة هو المتغير الذي نغيّره/)).toBeInTheDocument();

    first.unmount();

    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'ابدأ التجربة الموجهة',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'طول الخيط',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تحقق من المتغيرات المضبوطة',
      })
    );

    expect(screen.getByText(/نسيت متغيرًا يجب إبقاؤه ثابتًا/)).toBeInTheDocument();
  });

  it('يقيم صحة المجموعة كاملة لا وجود اختيار صحيح واحد فقط', () => {
    openExperiment();

    for (const name of ['طول الخيط', 'الكرة المستخدمة', 'زاوية الإزاحة الابتدائية', 'لون الكرة']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تحقق من المتغيرات المضبوطة',
      })
    );

    expect(screen.queryByText('2. جرّب أداتي قياس الزمن')).not.toBeInTheDocument();

    expect(screen.getByText(/اختر فقط الشروط التي يجب تثبيتها/)).toBeInTheDocument();
  });

  it('يفصل قراءة الساعتين فلا تتحرك الرقمية عند تشغيل التناظرية', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T06:00:00Z'));

    try {
      openExperiment();
      selectControlledVariables();

      fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة التناظرية' }));

      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(
        Number.parseFloat(screen.getByTestId('analog-stopwatch-readout').textContent ?? '0')
      ).toBeGreaterThan(1);

      expect(screen.getByTestId('digital-trial-readout')).toHaveTextContent('0.00 s');

      expect(screen.getByLabelText('واجهة الساعة التناظرية')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('يظهر البندول بعد اختيار الأداة ويؤكد الاختيار بصريًا', () => {
    openExperiment();
    selectControlledVariables();
    tryBothTimersAndChooseDigital();

    expect(screen.getByText('تم اختيار الساعة الرقمية')).toBeInTheDocument();

    expect(screen.getByLabelText('بندول القياس للمحاولات العشر')).toBeInTheDocument();

    expect(screen.getByText('أداتك: الساعة الرقمية')).toBeInTheDocument();
  });

  it('يسجل قراءة المحاولة من الساعة المختارة عند إيقافها', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T06:00:00Z'));

    try {
      openExperiment();
      selectControlledVariables();
      tryBothTimersAndChooseDigital();

      fireEvent.click(
        screen.getByRole('button', {
          name: 'شغّل البندول للمحاولة 1',
        })
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: 'ابدأ الساعة الرقمية للقياس',
        })
      );

      act(() => {
        vi.advanceTimersByTime(1250);
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'أوقف الساعة وسجّل القياس 1',
        })
      );

      const input = screen.getByLabelText('زمن القياس 1') as HTMLInputElement;

      expect(Number.parseFloat(input.value)).toBeGreaterThan(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('تعرض التناظرية وتسجل إلى 0.1 ثانية بينما الرقمية تحتفظ بمنزلتين', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T06:00:00Z'));

    try {
      openExperiment();
      selectControlledVariables();

      fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة التناظرية' }));

      act(() => {
        vi.advanceTimersByTime(5170);
      });

      fireEvent.click(screen.getByRole('button', { name: 'أوقف الساعة التناظرية' }));

      expect(screen.getByTestId('analog-stopwatch-readout')).toHaveTextContent('5.2 s');

      expect(screen.getByText('أقل تقسيم: 0.1 ث')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'ابدأ الساعة الرقمية' }));

      act(() => {
        vi.advanceTimersByTime(5170);
      });

      fireEvent.click(screen.getByRole('button', { name: 'أوقف الساعة الرقمية' }));

      expect(screen.getByTestId('digital-trial-readout')).toHaveTextContent('5.17 s');

      fireEvent.click(screen.getByRole('button', { name: 'أختار الساعة التناظرية' }));

      fireEvent.click(
        screen.getByRole('button', {
          name: 'شغّل البندول للمحاولة 1',
        })
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: 'ابدأ الساعة التناظرية للقياس',
        })
      );

      act(() => {
        vi.advanceTimersByTime(5170);
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'أوقف الساعة وسجّل القياس 1',
        })
      );

      expect((screen.getByLabelText('زمن القياس 1') as HTMLInputElement).value).toBe('5.2');
    } finally {
      vi.useRealTimers();
    }
  });

  it('يحسب min/max/range من القيم المسجلة بخطوة 0.1 دون تقريب مسبق للناتج', () => {
    openExperiment();
    selectControlledVariables();
    tryBothTimersAndChooseDigital();

    const values = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '2.0'];

    values.forEach((value, index) => {
      fireEvent.change(screen.getByLabelText(`زمن القياس ${index + 1}`), {
        target: { value },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'اعتمد القياسات العشرة' }));

    fireEvent.change(screen.getByLabelText('أقل زمن'), {
      target: { value: '1.1' },
    });

    fireEvent.change(screen.getByLabelText('أكبر زمن'), {
      target: { value: '2.0' },
    });

    fireEvent.change(screen.getByLabelText('المدى'), {
      target: { value: '0.9' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'تحقق من المدى' }));

    expect(screen.getByText('حسبت المدى من بياناتك')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MeasurementMissionGame } from '@features/games/measurement-mission/MeasurementMissionGame';

function solveRoundOne() {
  fireEvent.click(screen.getByRole('button', { name: /الوحدة kg/ }));
  fireEvent.click(screen.getByRole('button', { name: 'الجولة التالية' }));
}

function solveRoundTwo() {
  const expectedDecisions = ['سليم', 'يحتاج إصلاحًا', 'سليم', 'يحتاج إصلاحًا'];
  expectedDecisions.forEach((decision, index) => {
    fireEvent.click(screen.getByRole('button', { name: decision }));
    fireEvent.click(
      screen.getByRole('button', {
        name: index === expectedDecisions.length - 1 ? 'انتقل إلى الجولة الثالثة' : 'البطاقة التالية',
      }),
    );
  });
}

function solveRoundThree() {
  fireEvent.click(screen.getByRole('button', { name: 'اختر الوحدة m' }));
  fireEvent.click(screen.getByRole('button', { name: 'الجولة الأخيرة' }));
}

function solveRoundFour() {
  fireEvent.click(screen.getByRole('button', { name: /طول الطاولة 2 kg/ }));
  fireEvent.click(screen.getByRole('button', { name: 'عرض تقريرك' }));
}

describe('MeasurementMissionGame — مفتش القياس', () => {
  it('يعرض الهوية المعتمدة وأربع جولات مختلفة بدل لعبة مطابقة عامة', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'مفتش القياس' })).toBeInTheDocument();
    expect(screen.getAllByText('اكتشف الخطأ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('سليم أم يحتاج إصلاحًا؟')).toBeInTheDocument();
    expect(screen.getByText('أصلح البطاقة')).toBeInTheDocument();
    expect(screen.getByText('تقرير المختبر')).toBeInTheDocument();
    expect(screen.getByLabelText('الجولة 1 من 4')).toBeInTheDocument();
  });

  it('الجولة الأولى تجعل الطالب يضغط الجزء الخاطئ ولا تكشفه من الصورة', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);

    expect(screen.getByAltText('قلم موضوع بجوار تدريج قياس')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'القيمة 18' }));
    expect(screen.getByRole('status')).toHaveTextContent('القيمة ليست موضع الخلل');
    expect(screen.queryByRole('button', { name: 'الجولة التالية' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'الوحدة kg' }));
    expect(screen.getByRole('status')).toHaveTextContent('تم رصد الخلل وإصلاح السجل');
    expect(screen.getByRole('button', { name: 'الوحدة cm' })).toHaveTextContent('cm');
    expect(screen.getByRole('button', { name: 'الجولة التالية' })).toBeInTheDocument();
  });

  it('الجولة الثانية تستخدم قرار سليم/يحتاج إصلاحًا مع تغذية راجعة فورية', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);
    solveRoundOne();

    expect(screen.getByRole('heading', { name: 'سليم أم يحتاج إصلاحًا؟' })).toBeInTheDocument();
    expect(screen.getByText('24 cm')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'يحتاج إصلاحًا' }));
    expect(screen.getByRole('status')).toHaveTextContent('هذا السجل متسق');

    fireEvent.click(screen.getByRole('button', { name: 'سليم' }));
    expect(screen.getByRole('status')).toHaveTextContent('قرار صحيح');
    expect(screen.getByRole('button', { name: 'البطاقة التالية' })).toBeInTheDocument();
  });

  it('الجولة الثالثة تستبدل الوحدة الخاطئة باختيار وحدة مناسبة', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);
    solveRoundOne();
    solveRoundTwo();

    expect(screen.getByRole('heading', { name: 'أصلح البطاقة' })).toBeInTheDocument();
    expect(screen.getAllByText('mL').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole('button', { name: 'اختر الوحدة kg' }));
    expect(screen.getByRole('status')).toHaveTextContent('هذه الوحدة من نوع مختلف');

    fireEvent.click(screen.getByRole('button', { name: 'اختر الوحدة m' }));
    expect(screen.getByRole('status')).toHaveTextContent('تم تركيب الوحدة الصحيحة');
    expect(screen.getByText('بعد الإصلاح').parentElement).toHaveTextContent('3 m');
    expect(screen.getByRole('button', { name: 'الجولة الأخيرة' })).toBeInTheDocument();
  });

  it('يرسخ بروتوكول التفكير بدل الاكتفاء بتغذية راجعة صح وخطأ', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);

    expect(screen.getByLabelText('بروتوكول فحص القياس')).toHaveTextContent('حدّد الكمية');
    expect(screen.getByLabelText('بروتوكول فحص القياس')).toHaveTextContent('افحص الوحدة');
    expect(screen.getByText('قاعدة المفتش')).toBeInTheDocument();
  });

  it('الجولة الرابعة تعرض تقريرًا متعدد السطور ويطلب اكتشاف السطر الخاطئ', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);
    solveRoundOne();
    solveRoundTwo();
    solveRoundThree();

    expect(screen.getByRole('heading', { name: 'تقرير المختبر' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /كتلة الحجر 250 g/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /طول الطاولة 2 kg/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /كتلة الحجر 250 g/ }));
    expect(screen.getByRole('status')).toHaveTextContent('هذا السطر اجتاز الفحص');
    expect(screen.getByRole('button', { name: /كتلة الحجر 250 g/ })).toHaveTextContent('✓');

    fireEvent.click(screen.getByRole('button', { name: /طول الطاولة 2 kg/ }));
    expect(screen.getByRole('status')).toHaveTextContent('تم اكتشاف الخلل قبل اعتماد التقرير');
    expect(screen.getByRole('button', { name: /طول الطاولة 2 kg/ })).toHaveTextContent('2 m');
  });

  it('يعرض تقريرًا تشخيصيًا بدل الاكتفاء بدرجة رقمية', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);
    solveRoundOne();
    solveRoundTwo();
    solveRoundThree();
    solveRoundFour();

    expect(screen.getByRole('heading', { name: 'تقرير مفتش القياس' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'أتقنت' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'راجع' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /أعد تحدي الأخطاء/ })).toBeInTheDocument();
  });

  it('يغير المواقف عند إعادة التحدي حتى لا يحفظ الطالب البطاقات', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);
    solveRoundOne();
    solveRoundTwo();
    solveRoundThree();
    solveRoundFour();

    fireEvent.click(screen.getByRole('button', { name: /أعد تحدي الأخطاء/ }));

    expect(screen.getByText('زمن السباق')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الوحدة cm' })).toBeInTheDocument();
    expect(screen.queryByText('طول القلم')).not.toBeInTheDocument();
  });

  it('لا يعيد مرئيات أو أمثلة الأنشطة العلمية داخل اللعبة', () => {
    render(<MeasurementMissionGame onBack={vi.fn()} />);

    expect(screen.queryByText(/GPS/i)).not.toBeInTheDocument();
    expect(screen.queryByText('25 cm')).not.toBeInTheDocument();
    expect(screen.queryByText('0.40 m')).not.toBeInTheDocument();
    expect(screen.queryByText('320 mm')).not.toBeInTheDocument();
  });

  it('زر العودة يستدعي onBack مرة واحدة', () => {
    const onBack = vi.fn();
    render(<MeasurementMissionGame onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

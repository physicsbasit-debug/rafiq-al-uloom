// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MeasurementTrustMission } from '@features/activities/measurement-trust/MeasurementTrustMission';

describe('MeasurementTrustMission — 6-7C4h scientific activities', () => {
  it('يعرض الأنواع الأربعة ثابتة ويصرح بأن التجربة الموجهة غير متوفرة في هذا الدرس', () => {
    render(<MeasurementTrustMission />);

    expect(screen.getByRole('heading', { name: 'الأنشطة العلمية' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'الاستقصاء العلمي' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'المحاكاة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'نشاط البيانات' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'التجربة الموجهة' })).toBeInTheDocument();
    expect(screen.getByText('غير متوفر في هذا الدرس')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ابدأ التجربة/ })).not.toBeInTheDocument();
  });

  it('يجعل الاستقصاء مبنيا على اختيار الأدلة ثم المقارنة لا على سؤال اختيار من متعدد عادي', () => {
    render(<MeasurementTrustMission />);

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاستقصاء' }));
    expect(screen.getByRole('heading', { name: 'أي طريقة تجعل القياس أكثر موثوقية؟' })).toBeInTheDocument();
    expect(screen.getByText('قياس جسم رقيق جدًا')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'وضوح القراءة بالنسبة لتدرّج الأداة' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'هل يمكن تكرار الطريقة والحصول على نتيجة متقاربة؟' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'قارن الأدلة' }));

    expect(screen.getByText('قياس ورقة واحدة')).toBeInTheDocument();
    expect(screen.getByText('قياس رزمة ثم القسمة')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'كوّن الاستنتاج العلمي' }));
    expect(screen.getByRole('status')).toHaveTextContent('استنتاجك العلمي');
  });

  it('يغير متغير الزمن فعليا ويحدث مقدار انزياح الموقع في المحاكاة', () => {
    render(<MeasurementTrustMission />);

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ المحاكاة' }));
    const slider = screen.getByRole('slider', { name: 'خطأ قياس الزمن بالنانوثانية' });

    expect(screen.getByText('0.0 m')).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '50' } });
    expect(screen.getByText('15.0 m')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'سجّل ملاحظتي' }));
    expect(screen.getByRole('status')).toHaveTextContent('كلما زاد خطأ قياس الزمن');
  });

  it('يجعل نشاط البيانات يطلب تحويل القيم ثم ترتيبها قبل اتخاذ القرار', () => {
    render(<MeasurementTrustMission />);

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ نشاط البيانات' }));

    const values = [
      ['قيمة الجسم أ بالمتر', '0.25'],
      ['قيمة الجسم ب بالمتر', '0.40'],
      ['قيمة الجسم ج بالمتر', '0.32'],
      ['قيمة الجسم د بالمتر', '0.8'],
    ] as const;

    for (const [name, value] of values) {
      fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
    }

    fireEvent.click(screen.getByRole('button', { name: 'تحقق من التحويلات' }));
    expect(screen.getByText('الخطوة 2: رتّب الأجسام من الأقصر إلى الأطول')).toBeInTheDocument();

    for (const label of ['الجسم أ', 'الجسم ج', 'الجسم ب', 'الجسم د']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من الترتيب' }));

    expect(screen.getByText(/أي جسم طوله أقرب إلى/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الجسم ج' }));
    expect(screen.getByRole('status')).toHaveTextContent('استخدمت البيانات بصورة صحيحة');
  });
});

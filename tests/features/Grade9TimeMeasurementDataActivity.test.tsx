// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Grade9TimeMeasurementActivities } from '@features/activities/time-measurement/Grade9TimeMeasurementActivities';

function openDataActivity() {
  render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'ابدأ نشاط البيانات' }));
}

describe('Grade 9 lesson 1-3 pulse data activity', () => {
  it('يبقي نشاط البيانات متوفرًا بعد اكتمال جاهزية الأنشطة 3/3', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    const summary = screen.getByLabelText('جاهزية الأنشطة العلمية');
    expect(within(summary).getByText('3/3')).toBeInTheDocument();

    const dataCard = screen.getByRole('article', { name: 'نشاط البيانات' });
    expect(within(dataCard).getByText('متوفر')).toBeInTheDocument();
    expect(within(dataCard).getByRole('button', { name: 'ابدأ نشاط البيانات' })).toBeEnabled();

    const experiment = screen.getByRole('article', { name: 'التجربة الموجهة' });
    expect(within(experiment).getByText('متوفر')).toBeInTheDocument();
    expect(within(experiment).getByRole('button', { name: 'ابدأ التجربة الموجهة' })).toBeEnabled();
  });

  it('يعرض الوسم الحرفي ومجموعتي البيانات دون طلب حساب متوسط', () => {
    openDataActivity();

    expect(screen.getByText('بيانات توضيحية معدّة للنشاط')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'في الراحة' })).toBeInTheDocument();

    expect(screen.getByRole('rowheader', { name: 'بعد نشاط خفيف' })).toBeInTheDocument();

    expect(screen.getByText('8.4')).toBeInTheDocument();
    expect(screen.getByText('6.3')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /احسب.*متوسط|تحقق من المتوسط/ })
    ).not.toBeInTheDocument();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('يقود الطالب من المقارنة إلى الاستنتاج ثم الدليل', () => {
    openDataActivity();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'بعد النشاط الخفيف',
      })
    );

    expect(
      screen.getByText('البيانات بعد النشاط الخفيف تعرض زمنًا أقصر لنفس العدد من النبضات.')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'النبض أسرع بعد النشاط الخفيف',
      })
    );

    expect(screen.getByText('اختر الدليل المباشر من الجدول')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'كل أزمنة ما بعد النشاط أقل من كل أزمنة الراحة',
      })
    );

    expect(screen.getByText('استنتاج مدعوم بالبيانات')).toBeInTheDocument();
  });

  it('يعطي تلميحًا بعد الخطأ الأول ويكشف الإجابة بعد الخطأ الثاني', () => {
    openDataActivity();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'في الراحة',
      })
    );

    expect(screen.getByText(/قارن القيم لنفس العدد من النبضات/)).toBeInTheDocument();
    expect(screen.queryByText(/الإجابة المعتمدة: بعد النشاط الخفيف/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'في الراحة',
      })
    );

    expect(screen.getByText(/الإجابة المعتمدة: بعد النشاط الخفيف/)).toBeInTheDocument();
  });
});

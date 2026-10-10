// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Grade9TimeMeasurementActivities } from '@features/activities/time-measurement/Grade9TimeMeasurementActivities';

describe('Grade 9 lesson 1-3 activities B — readiness shell after body clock', () => {
  it('يعرض أربع فئات ثابتة فقط وفق العقد B', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    const grid = screen.getByLabelText('فئات الأنشطة العلمية الأربع');
    expect(within(grid).getAllByRole('article')).toHaveLength(4);
  });

  it('يجعل الأنشطة الثلاثة المنفذة متوفرة بعد Block 4', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    const inquiry = screen.getByRole('article', { name: 'الاستقصاء العلمي' });
    expect(within(inquiry).getByText('متوفر')).toBeInTheDocument();
    expect(within(inquiry).getByRole('button', { name: 'ابدأ الاستقصاء' })).toBeEnabled();

    const data = screen.getByRole('article', { name: 'نشاط البيانات' });
    expect(within(data).getByText('متوفر')).toBeInTheDocument();
    expect(within(data).getByRole('button', { name: 'ابدأ نشاط البيانات' })).toBeEnabled();

    const experiment = screen.getByRole('article', { name: 'التجربة الموجهة' });
    expect(within(experiment).getByText('متوفر')).toBeInTheDocument();
    expect(within(experiment).getByRole('button', { name: 'ابدأ التجربة الموجهة' })).toBeEnabled();
  });

  it('يبقي المحاكاة غير متوفرة بالنص المعتمد', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);

    const simulation = screen.getByRole('article', { name: 'المحاكاة' });
    expect(simulation).toHaveAttribute('aria-disabled', 'true');
    expect(within(simulation).getByText('غير متوفر في هذا الدرس')).toBeInTheDocument();
    expect(within(simulation).queryByRole('button')).not.toBeInTheDocument();
  });

  it('يرفع مؤشر الجاهزية إلى 3/3 بعد تنفيذ التجربة الموجهة', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);
    const summary = screen.getByLabelText('جاهزية الأنشطة العلمية');
    expect(within(summary).getByText('3/3')).toBeInTheDocument();
    expect(within(summary).getByText('أنشطة جاهزة حاليًا')).toBeInTheDocument();
  });

  it('يفتح ساعة الجسم من البطاقة', () => {
    render(<Grade9TimeMeasurementActivities onBackToLesson={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاستقصاء' }));
    expect(screen.getByRole('heading', { name: 'ساعة الجسم' })).toBeInTheDocument();
    expect(screen.getByText('توقّع قبل أن تقيس')).toBeInTheDocument();
  });
});

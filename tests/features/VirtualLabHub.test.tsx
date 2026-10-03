// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualLabHub } from '@features/virtual-labs/VirtualLabHub';

describe('VirtualLabHub', () => {
  it('يفصل المختبرات حسب الصف عندما لا يوجد ربط مباشر بالدرس الحالي', () => {
    render(<VirtualLabHub lessonId="g10-phy-waves-l2" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'مختبرات الصف التاسع' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'مختبرات الصف العاشر' })).toBeInTheDocument();
    expect(screen.getByText(/لا يوجد مختبر مربوط مباشرة بهذا الدرس حتى الآن/)).toBeInTheDocument();
  });

  it('يعرض للدرس المرتبط مختبره فقط بدل مكتبة الصفين', () => {
    render(<VirtualLabHub lessonId="g10-phy-s1-u1-l1" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'الكهرباء الساكنة' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'قياس الطول والحجم والزمن' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'مكونات الدائرة الكهربائية' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('مرتبطة بالدرس الحالي')).toBeInTheDocument();
  });

  it('يعرض الصف والوحدة والدرس على بطاقة المختبر بدل دمج الكتالوج بلا سياق', () => {
    render(<VirtualLabHub lessonId="g10-phy-waves-l2" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'قياس الطول والحجم والزمن' })).toBeInTheDocument();
    expect(screen.getByText('الوحدة الأولى: الطول والزمن')).toBeInTheDocument();
    expect(
      screen.getByText('1-1 أهمية القياس • 1-2 قياس الطول والحجم • 1-3 قياس الزمن')
    ).toBeInTheDocument();
  });

  it('يربط مختبر القياس بالموقع المنشور ويفتحه في تبويب جديد', () => {
    render(<VirtualLabHub lessonId="g10-phy-waves-l2" onBackToLesson={vi.fn()} />);

    const link = screen.getByRole('link', { name: 'ابدأ مختبر قياس الطول والحجم والزمن' });
    expect(link).toHaveAttribute(
      'href',
      'https://measurement-lab-grade9.physicsbasit.chatgpt.site'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('يعيد الطالب إلى الدرس من زر الرجوع الموحد', () => {
    const onBackToLesson = vi.fn();
    render(<VirtualLabHub lessonId="g10-phy-waves-l2" onBackToLesson={onBackToLesson} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));
    expect(onBackToLesson).toHaveBeenCalledTimes(1);
  });
});

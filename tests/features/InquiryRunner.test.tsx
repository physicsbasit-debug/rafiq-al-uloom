// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InquiryRunner } from '@features/inquiries/InquiryRunner';
import type { Inquiry } from '@shared-types/inquiry.types';

const inquiry: Inquiry = {
  id: 'g10-phy-waves-l3-inquiry-sound-medium',
  lessonId: 'g10-phy-waves-l3',
  title: 'هل ينتقل الصوت دون وسط مادي؟',
  instructions: 'سجّل استدلالك.',
  objectiveIds: ['l3-o1'],
  context: 'يضعف الصوت كلما قل الهواء مع استمرار اهتزاز الجرس.',
  drivingQuestion: 'ماذا تشير هذه الملاحظة؟',
  hypothesisPrompt: 'اكتب فرضيتك.',
  observationPrompt: 'اكتب الدليل.',
  conclusionPrompt: 'اكتب استنتاجك.',
  status: 'draft',
  source: 'curriculum_seed',
};

afterEach(cleanup);

describe('InquiryRunner', () => {
  it('يعرض الحالة والسؤال وثلاثة حقول استجابة', () => {
    render(<InquiryRunner inquiry={inquiry} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: inquiry.title })).toBeInTheDocument();
    expect(screen.getByText(inquiry.context)).toBeInTheDocument();
    expect(screen.getByText(inquiry.drivingQuestion)).toBeInTheDocument();
    expect(screen.getByLabelText('الفرضية')).toBeInTheDocument();
    expect(screen.getByLabelText('الملاحظة أو الدليل')).toBeInTheDocument();
    expect(screen.getByLabelText('الاستنتاج')).toBeInTheDocument();
  });

  it('يحفظ مسودات الاستجابة في state محلي أثناء الجلسة', () => {
    render(<InquiryRunner inquiry={inquiry} onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('الفرضية'), {
      target: { value: 'الصوت يحتاج وسطًا ماديًا.' },
    });
    fireEvent.change(screen.getByLabelText('الملاحظة أو الدليل'), {
      target: { value: 'الصوت يضعف مع سحب الهواء.' },
    });
    fireEvent.change(screen.getByLabelText('الاستنتاج'), {
      target: { value: 'لا ينتقل الصوت في الفراغ.' },
    });

    expect(screen.getByLabelText('الفرضية')).toHaveValue('الصوت يحتاج وسطًا ماديًا.');
    expect(screen.getByLabelText('الملاحظة أو الدليل')).toHaveValue('الصوت يضعف مع سحب الهواء.');
    expect(screen.getByLabelText('الاستنتاج')).toHaveValue('لا ينتقل الصوت في الفراغ.');
  });

  it('يفقد مسودات الاستجابة بعد unmount/remount لأن الحالة session-only', () => {
    const firstRender = render(<InquiryRunner inquiry={inquiry} onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('الفرضية'), {
      target: { value: 'الصوت يحتاج وسطًا ماديًا.' },
    });
    fireEvent.change(screen.getByLabelText('الملاحظة أو الدليل'), {
      target: { value: 'الصوت يضعف مع سحب الهواء.' },
    });
    fireEvent.change(screen.getByLabelText('الاستنتاج'), {
      target: { value: 'لا ينتقل الصوت في الفراغ.' },
    });

    firstRender.unmount();

    render(<InquiryRunner inquiry={inquiry} onBack={vi.fn()} />);

    expect(screen.getByLabelText('الفرضية')).toHaveValue('');
    expect(screen.getByLabelText('الملاحظة أو الدليل')).toHaveValue('');
    expect(screen.getByLabelText('الاستنتاج')).toHaveValue('');
  });

  it('ينفذ العودة إلى قائمة الأنشطة', () => {
    const onBack = vi.fn();
    render(<InquiryRunner inquiry={inquiry} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

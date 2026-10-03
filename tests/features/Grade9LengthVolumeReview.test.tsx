// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Grade9LengthVolumeReview } from '@features/student/review-questions/Grade9LengthVolumeReview';
import { semester1ReferenceReviewQuestions } from '@content/seed/semester1-reference-lessons.seed';

const lessonQuestions = semester1ReferenceReviewQuestions.filter(
  ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l2'
);

function renderReview() {
  render(<Grade9LengthVolumeReview questions={lessonQuestions} onBackToLesson={vi.fn()} />);
}

function clickNext() {
  fireEvent.click(screen.getByRole('button', { name: /السؤال التالي|إنهاء المراجعة/ }));
}

afterEach(() => cleanup());

describe('Grade9LengthVolumeReview — Golden lesson 1-2 review', () => {
  it('يبدأ باسترجاع سريع خفيف ويعرض أدوات قياس مرسومة بلا كشف مسبق للإجابة', () => {
    renderReview();

    expect(screen.getAllByText('استرجاع سريع').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('قطر سلك نحاسي رفيع جدًا');
    expect(
      screen.getByRole('img', { name: 'سلك نحاسي رفيع جدًا مع تكبير لقطره' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ميكرومتر/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeDisabled();
  });

  it('يحافظ على عقد المحاولتين: الخطأ الأول تلميح والثاني شرح تعليمي', () => {
    renderReview();

    fireEvent.click(screen.getByRole('button', { name: /مسطرة/ }));
    expect(screen.getByText('تلميح للمحاولة الثانية')).toBeInTheDocument();
    expect(screen.getByText(/قارن قطر السلك/)).toBeInTheDocument();
    expect(screen.queryByText(/الميكرومتر مناسب/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'حاول مرة أخرى' }));
    fireEvent.click(screen.getByRole('button', { name: /مخبار مدرج/ }));
    expect(screen.getByText('التفسير التعليمي')).toBeInTheDocument();
    expect(screen.getByText(/الميكرومتر مناسب/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'السؤال التالي' })).toBeEnabled();
  });

  it('ينفذ التسلسل الخماسي المعتمد ويصل إلى تقرير خمس مهارات بلا درجة رقمية', () => {
    renderReview();

    fireEvent.click(screen.getByRole('button', { name: /ميكرومتر/ }));
    clickNext();

    expect(screen.getAllByText('تطبيق حسابي').length).toBeGreaterThanOrEqual(1);
    fireEvent.change(screen.getByLabelText('سمك الورقة الواحدة بالمليمتر'), {
      target: { value: '0.08' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من الحساب' }));
    clickNext();

    expect(screen.getAllByText('قراءة أداة').length).toBeGreaterThanOrEqual(1);
    const microInput = screen.getByLabelText('إجابة قراءة الميكرومتر بالمليمتر');
    fireEvent.change(microInput, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق' }));
    fireEvent.change(screen.getByLabelText('إجابة قراءة الميكرومتر بالمليمتر'), {
      target: { value: '0.28' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق' }));
    fireEvent.change(screen.getByLabelText('إجابة قراءة الميكرومتر بالمليمتر'), {
      target: { value: '3.28' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق' }));
    clickNext();

    expect(screen.getAllByText('كشف خطأ').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: /ضع علامة/ }));
    fireEvent.click(screen.getByRole('button', { name: /التدرج لا يسمح/ }));
    clickNext();

    expect(screen.getAllByText('موقف جديد').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole('img', { name: 'مسار سلكي منحني مثبت على لوحة ولا يمكن فرده' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /خيط مرن/ }));
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء المراجعة' }));

    expect(screen.getByRole('heading', { name: 'مراجعة فهمك' })).toBeInTheDocument();
    expect(screen.getByText('اختيار أداة لبعد صغير جدًا')).toBeInTheDocument();
    expect(screen.getByText('القياس غير المباشر')).toBeInTheDocument();
    expect(screen.getByText('قراءة الميكرومتر')).toBeInTheDocument();
    expect(screen.getByText('اختيار مدى وتدرج مناسبين')).toBeInTheDocument();
    expect(screen.getByText('اختيار طريقة لقياس مسار منحني')).toBeInTheDocument();
    expect(screen.getAllByText('أتقنت')).toHaveLength(5);
    expect(screen.queryByText(/^5\s*\/\s*5$/)).not.toBeInTheDocument();
  });

  it('يفرض قراءة الميكرومتر على ثلاث مراحل بدل إظهار الجواب جاهزًا', () => {
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: /ميكرومتر/ }));
    clickNext();
    fireEvent.change(screen.getByLabelText('سمك الورقة الواحدة بالمليمتر'), {
      target: { value: '0.08' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من الحساب' }));
    clickNext();

    expect(screen.getByText(/كل تقسيم في التدريج الكسري/)).toBeInTheDocument();
    expect(screen.getByLabelText('إجابة قراءة الميكرومتر بالمليمتر')).toBeInTheDocument();
    expect(screen.queryByText('3.00 mm + 0.28 mm = 3.28 mm')).not.toBeInTheDocument();
  });

  it('لا يعرض خيارات تشخيص المخبار قبل أن يكتشف الطالب موضع 6 mL على التدريج', () => {
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: /ميكرومتر/ }));
    clickNext();
    fireEvent.change(screen.getByLabelText('سمك الورقة الواحدة بالمليمتر'), {
      target: { value: '0.08' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من الحساب' }));
    clickNext();
    for (const value of ['3', '0.28', '3.28']) {
      fireEvent.change(screen.getByLabelText('إجابة قراءة الميكرومتر بالمليمتر'), {
        target: { value },
      });
      fireEvent.click(screen.getByRole('button', { name: 'تحقق' }));
    }
    clickNext();

    expect(screen.queryByRole('button', { name: /التدرج لا يسمح/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ضع علامة/ }));
    expect(screen.getByRole('button', { name: /التدرج لا يسمح/ })).toBeInTheDocument();
  });
});

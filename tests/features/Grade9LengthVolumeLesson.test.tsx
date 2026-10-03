// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Grade9LengthVolumeLesson } from '@features/student/lesson-view/Grade9LengthVolumeLesson';

const objectives = [
  {
    id: 'g9-s1-u1-l2-o1',
    lessonId: 'g9-phy-s1-u1-l2',
    text: 'يستخدم المسطرة والمخبار المدرج لإيجاد الطول أو الحجم، ويصف استخدامهما.',
  },
  {
    id: 'g9-s1-u1-l2-o4',
    lessonId: 'g9-phy-s1-u1-l2',
    text: 'يفهم كيف يستخدم أداة الميكرومتر لقياس الأبعاد الصغيرة جدًا.',
  },
];

function renderLesson() {
  render(
    <Grade9LengthVolumeLesson
      objectives={objectives}
      onBackToLessons={vi.fn()}
      onOpenReviewQuestions={vi.fn()}
      onOpenActivities={vi.fn()}
      onOpenMatchingGame={vi.fn()}
      onOpenVirtualLabs={vi.fn()}
      onOpenMasteryTest={vi.fn()}
    />
  );
}

describe('Grade9LengthVolumeLesson', () => {
  it('يعرض الافتتاح والأهداف في بداية الدرس ثم تسلسل الشرح الأساسي', () => {
    renderLesson();

    expect(screen.getByRole('heading', { name: '1-2 قياس الطول والحجم' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'الأهداف التعليمية' })).toBeInTheDocument();
    expect(screen.queryByText(/نفس الموضع البنيوي المعتمد/)).not.toBeInTheDocument();
    expect(screen.getByText(objectives[0].text)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'المسطرة ليست المشكلة دائمًا' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'الميكرومتر: عندما تصبح المسطرة كبيرة جدًا' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'بوصلة القياس' })).toBeInTheDocument();
  });

  it('يجعل تصحيح طريقة القياس تفاعليًا بدل عرضه كإجابة جاهزة', () => {
    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: 'استقامة الجسم' }));
    fireEvent.click(screen.getByRole('button', { name: 'بداية القياس' }));
    fireEvent.click(screen.getByRole('button', { name: 'موضع القراءة' }));

    expect(screen.getByText('الآن أصبحت الأداة والطريقة تعملان معًا.')).toBeInTheDocument();
  });

  it('يكشف القياس غير المباشر وقراءة الميكرومتر بالتدرج', () => {
    renderLesson();

    expect(screen.getByText('ورقة واحدة')).toBeInTheDocument();
    const growSample = screen.getByRole('button', { name: 'كبّر العينة' });
    fireEvent.click(growSample);
    fireEvent.click(growSample);
    fireEvent.click(growSample);
    expect(screen.getByText(/سمك 500 ورقة/)).toBeInTheDocument();
    expect(screen.getByText('0.09 mm')).toBeInTheDocument();

    const micrometerSteps = [
      'ضع السلك',
      'أغلق برفق',
      'اقرأ الرئيسي',
      'اقرأ الكسري',
      'اجمع القراءتين',
    ];
    expect(screen.getByRole('button', { name: /اجمع القراءتين/ })).toBeDisabled();
    for (const label of micrometerSteps) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
    }
    expect(screen.getByText(/2.5 mm \+ 0.17 mm = 2.67 mm/)).toBeInTheDocument();
  });

  it('يعلّم قراءة الماء عند مستوى النظر الصحيح والسطح المقعر', () => {
    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: 'بمستوى أفقي' }));
    expect(
      screen.getByText('القراءة الصحيحة للماء تؤخذ عند أسفل السطح المقعر وبمستوى نظر أفقي.')
    ).toBeInTheDocument();
  });

  it('يطبق الإزاحة ويجعل مقارنة المخبار اكتشافًا بصريًا دون كشف الإجابة مسبقًا', () => {
    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: 'اغمر الجسم' }));
    expect(screen.getByText(/57 mL - 42 mL = 15 mL/)).toBeInTheDocument();

    expect(screen.queryByText('تدريج أقرب لكمية صغيرة')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/تكبير بصري لتدرج مخبار/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /10 mL/ }));
    expect(screen.getByLabelText('تكبير بصري لتدرج مخبار 10 mL')).toBeInTheDocument();
    expect(screen.getByText(/تشغل الكمية المطلوبة جزءًا واضحًا من مدى الأداة/)).toBeInTheDocument();
    expect(screen.getAllByText('6 mL').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /1000 mL/ }));
    expect(screen.getByLabelText('تكبير بصري لتدرج مخبار 1000 mL')).toBeInTheDocument();
    expect(screen.getByText(/تكاد الكمية المطلوبة تقع عند بداية المدى/)).toBeInTheDocument();
  });

  it('يحافظ على تغذية راجعة بصرية محايدة في قرار الأداة مهما كان الاختيار', () => {
    renderLesson();

    expect(screen.getByText('صفيحة معدنية رقيقة')).toBeInTheDocument();
    const rulerButton = screen.getByRole('button', { name: 'مسطرة' });
    const micrometerButton = screen.getByRole('button', { name: 'ميكرومتر' });

    fireEvent.click(rulerButton);
    expect(rulerButton).toHaveClass('is-active');
    expect(screen.getByText(/قارن سمك الصفيحة بأصغر تدريج/)).not.toHaveClass('is-success');

    fireEvent.click(micrometerButton);
    expect(micrometerButton).toHaveClass('is-active');
    expect(micrometerButton).not.toHaveClass('is-best');
    expect(screen.getByText(/اختيار مناسب: البعد صغير جدًا/)).not.toHaveClass('is-success');
  });
  it('يعرض تدريجي الميكرومتر بصريًا ويبيّن متوازي مستطيلات حقيقيًا وتدرجات المخابير الثلاثة', () => {
    renderLesson();

    expect(
      screen.getByRole('group', { name: 'تكبير التدريج الرئيسي للميكرومتر' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'تكبير التدريج الكسري للميكرومتر' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'متوازي مستطيلات ثلاثي الأوجه مع أبعاد الطول والعرض والارتفاع',
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('تدريج مخبار 10 mL')).toBeInTheDocument();
    expect(screen.getByLabelText('تدريج مخبار 100 mL')).toBeInTheDocument();
    expect(screen.getByLabelText('تدريج مخبار 1000 mL')).toBeInTheDocument();
  });
});

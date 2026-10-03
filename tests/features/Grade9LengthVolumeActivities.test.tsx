// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Grade9LengthVolumeActivities } from '@features/activities/length-volume/Grade9LengthVolumeActivities';

function openCard(name: string) {
  const heading = screen.getByRole('heading', { name });
  const card = heading.closest('article');
  if (!card) throw new Error(`Missing activity card for ${name}`);
  fireEvent.click(within(card).getByRole('button'));
}

describe('Grade9LengthVolumeActivities — Golden lesson 1-2', () => {
  it('يعرض أربع فئات ثابتة فقط وفق الميثاق', () => {
    render(<Grade9LengthVolumeActivities onBackToLesson={vi.fn()} />);

    const grid = screen.getByLabelText('فئات الأنشطة العلمية الأربع');
    expect(within(grid).getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'الاستقصاء العلمي' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'المحاكاة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'نشاط البيانات' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'التجربة الموجهة' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'استقصاء متقدم' })).not.toBeInTheDocument();
    expect(screen.getAllByText('متوفر')).toHaveLength(4);
    expect(within(grid).getAllByRole('img')).toHaveLength(4);
    expect(screen.getByLabelText('أكملت 0 من 4')).toHaveTextContent('0/4');
  });

  it('ينفذ الاستقصاء كتنبؤ ثم دليل ثم عزو سبب ثم تصميم إجراء', () => {
    render(<Grade9LengthVolumeActivities onBackToLesson={vi.fn()} />);
    openCard('الاستقصاء العلمي');

    fireEvent.click(screen.getByRole('button', { name: 'أتوقع أن المحاولة A أكثر موثوقية' }));
    fireEvent.click(screen.getByRole('button', { name: 'نفّذ القياسات واكشف الدليل' }));

    expect(screen.getByText('14.8 cm')).toBeInTheDocument();

    const bSection = screen.getByRole('heading', { name: 'حلّل المحاولة B' }).parentElement;
    const cSection = screen.getByRole('heading', { name: 'حلّل المحاولة C' }).parentElement;
    if (!bSection || !cSection) throw new Error('Missing inquiry cause sections');

    fireEvent.click(
      within(bSection).getByRole('button', { name: /بدأ القياس من علامة غير الصفر/ })
    );
    fireEvent.click(within(cSection).getByRole('button', { name: /الجسم غير محاذٍ/ }));
    fireEvent.click(screen.getByRole('button', { name: 'انتقل إلى تصميم إجراء أفضل' }));

    expect(
      screen.getByRole('heading', { name: 'صمّم خطة قياس أطول من المسطرة' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /أثبت نقطة البداية/ }));
    fireEvent.click(screen.getByRole('button', { name: /أقيس الجزء الأول/ }));
    fireEvent.click(screen.getByRole('button', { name: /أنقل المسطرة/ }));
    fireEvent.click(screen.getByRole('button', { name: /أجمع أطوال الأجزاء/ }));
    fireEvent.click(screen.getByRole('button', { name: 'اختبر الخطة' }));

    expect(screen.getByRole('status')).toHaveTextContent('الخطة متصلة بلا فجوات أو تداخل');
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاستقصاء' }));
    expect(
      screen.getByRole('heading', { name: 'الاستقصاء العلمي' }).closest('article')
    ).toHaveTextContent('مكتمل');
  });

  it('يجعل المحاكاة متغيرًا مستمرًا لا ثلاث حالات منفصلة', () => {
    render(<Grade9LengthVolumeActivities onBackToLesson={vi.fn()} />);
    openCard('المحاكاة');

    const slider = screen.getByLabelText('موضع العين بالنسبة إلى مستوى الماء');
    expect(slider).toHaveAttribute('type', 'range');

    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByText('العين في المستوى الصحيح')).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '40' } });
    expect(screen.getByText('توجد زاوية اختلاف منظر')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'غيّر مستوى الماء' }));
    expect(screen.getByText('اختبرت المتغير بدل مشاهدة حركة جاهزة')).toBeInTheDocument();
  });

  it('يحلل اتساق البيانات ثم يمنع مساواة الاتساق بالدقة', () => {
    render(<Grade9LengthVolumeActivities onBackToLesson={vi.fn()} />);
    openCard('نشاط البيانات');

    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'مثّل البيانات بصريًا' }));
    expect(screen.getByRole('img', { name: /مخطط نقطي/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'المجموعة C' }));
    expect(screen.getByRole('status')).toHaveTextContent('الأكثر اتساقًا');

    fireEvent.click(screen.getByRole('button', { name: /نحتاج قيمة مرجعية/ }));
    const statuses = screen.getAllByRole('status');
    expect(statuses.some((status) => status.textContent?.includes('فصلت بين الاتساق والدقة'))).toBe(
      true
    );
  });

  it('يجعل التجربة الموجهة دفتر قياس فعليًا ويرفض السجل الناقص', () => {
    render(<Grade9LengthVolumeActivities onBackToLesson={vi.fn()} />);
    openCard('التجربة الموجهة');

    expect(
      screen.getByRole('img', { name: /مسطرة مرقمة بالسنتيمتر والمليمتر/ })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'الأداة التي استخدمتها' }), {
      target: { value: 'ruler' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /قراءة الطول/ }), {
      target: { value: '12.4' },
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'قراءة الطول - الوحدة' })).getByRole('button', {
        name: 'cm',
      })
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'سبب اختيار أداة القياس المباشر' }), {
      target: { value: 'لأن طول الجسم يقع ضمن مدى المسطرة ويمكن قراءة بدايته ونهايته.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'اعتمد سجل هذه المحطة' }));
    expect(screen.getByRole('status')).toHaveTextContent('اقرأ موضع البداية والنهاية');

    fireEvent.change(screen.getByRole('textbox', { name: /قراءة الطول/ }), {
      target: { value: '7.4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'اعتمد سجل هذه المحطة' }));

    expect(screen.getByRole('img', { name: /ميكرومتر مكبر/ })).toBeInTheDocument();
    expect(screen.getByText(/كل تقسيم على التدريج الكسري/)).toHaveTextContent(
      'كل تقسيم على التدريج الكسري = 0.01 mm'
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'الأداة التي استخدمتها' }), {
      target: { value: 'micrometer' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /قراءة السمك/ }), {
      target: { value: '1.73' },
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'قراءة السمك - الوحدة' })).getByRole('button', {
        name: 'mm',
      })
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('textbox', { name: 'سبب اختيار أداة قياس القرص' }), {
      target: { value: 'لأن سمك القرص صغير ويحتاج أداة ذات تدريج أدق.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'اعتمد سجل هذه المحطة' }));

    expect(screen.getByRole('img', { name: /مسطرة رأسية مدرجة بالمليمتر/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'طريقة القياس التي استخدمتها' }), {
      target: { value: 'stack-divide' },
    });
    fireEvent.change(screen.getByLabelText('السمك الكلي لخمس وعشرين بطاقة بالمليمتر'), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByLabelText('سمك بطاقة واحدة بالمليمتر'), {
      target: { value: '0.6' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'سبب اختيار القياس غير المباشر' }), {
      target: { value: 'لأن قياس الرزمة يجعل السمك الكلي أوضح ثم نحسب قيمة البطاقة.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'اعتمد سجل هذه المحطة' }));

    expect(screen.getByRole('img', { name: /مخباران مدرجان واضحان/ })).toBeInTheDocument();
    expect(screen.getByText('1 mL = 1 cm³')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'طريقة قياس الحجم التي استخدمتها' }), {
      target: { value: 'displacement' },
    });
    fireEvent.change(screen.getByLabelText('القراءة قبل الغمر بالمليلتر'), {
      target: { value: '34' },
    });
    fireEvent.change(screen.getByLabelText('القراءة بعد الغمر بالمليلتر'), {
      target: { value: '46' },
    });
    fireEvent.change(screen.getByLabelText('حجم الماء المزاح بالمليلتر'), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByLabelText('حجم الحجر بالسنتيمتر المكعب'), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'سبب اختيار طريقة الإزاحة' }), {
      target: { value: 'لأن الحجر غير منتظم ولا يناسبه قانون أبعاد جسم منتظم.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'اعتمد سجل هذه المحطة' }));

    expect(screen.getByText('دفتر المختبر مكتمل')).toBeInTheDocument();
  });
});

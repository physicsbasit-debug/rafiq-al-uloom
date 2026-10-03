// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrecisionEngineerGame } from '@features/games/precision-engineer/PrecisionEngineerGame';

describe('PrecisionEngineerGame — lesson 1-2', () => {
  it('يبني البروتوكول ثم يسمح بصحيح جزئي قبل الوصول إلى موثوق', () => {
    render(<PrecisionEngineerGame onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'مهندس الدقة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ورشة الساعات' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /دبوس محور معدني دقيق/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ميكرومتر' }));
    fireEvent.click(screen.getByRole('button', { name: /أشد المغزل بقوة/ }));
    fireEvent.click(screen.getByRole('button', { name: /أجمع قراءة التدريج الرئيسي والكسري/ }));
    fireEvent.click(screen.getByRole('button', { name: 'mm' }));
    fireEvent.click(screen.getByRole('button', { name: 'اختبر البروتوكول' }));

    expect(screen.getByRole('status')).toHaveTextContent('يحتاج ضبط');
    expect(screen.getByText(/السقاطة تساعد/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /أستخدم السقاطة برفق/ }));
    fireEvent.click(screen.getByRole('button', { name: 'اختبر البروتوكول' }));
    expect(screen.getByRole('status')).toHaveTextContent('موثوق');

    fireEvent.click(screen.getByRole('button', { name: 'المهمة التالية' }));
    expect(screen.getByRole('heading', { name: 'مصنع العبوات' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /علبة تغليف صناعية/ })).toBeInTheDocument();
  });

  it('يستخدم أربعة سياقات مرئية مختلفة ولا يعيد اسم مفتش القياس', () => {
    const { container } = render(<PrecisionEngineerGame onBack={vi.fn()} />);
    expect(container.textContent).not.toContain('مفتش القياس');
    expect(screen.getByText('دبوس محور معدني دقيق')).toBeInTheDocument();
  });

  it('يربط الأبعاد الثلاثة بمحاورها الهندسية ويحافظ على ترتيب الرقم ثم الوحدة', () => {
    render(<PrecisionEngineerGame onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'ميكرومتر' }));
    fireEvent.click(screen.getByRole('button', { name: /أستخدم السقاطة برفق/ }));
    fireEvent.click(screen.getByRole('button', { name: /أجمع قراءة التدريج الرئيسي والكسري/ }));
    fireEvent.click(screen.getByRole('button', { name: 'mm' }));
    fireEvent.click(screen.getByRole('button', { name: 'اختبر البروتوكول' }));
    fireEvent.click(screen.getByRole('button', { name: 'المهمة التالية' }));

    const packageVisual = screen.getByRole('img', {
      name: /علبة تغليف صناعية أبعادها 12 cm طولًا و8 cm عرضًا و5 cm ارتفاعًا/,
    });
    const dimensionLabels = [...packageVisual.querySelectorAll('text')].filter((node) =>
      ['12 cm', '8 cm', '5 cm'].includes(node.textContent ?? '')
    );

    expect(dimensionLabels).toHaveLength(3);
    expect(dimensionLabels.every((node) => node.getAttribute('direction') === 'ltr')).toBe(true);
    expect(
      dimensionLabels.find((node) => node.textContent === '8 cm')?.getAttribute('transform')
    ).toContain('rotate(29 502 67)');
    expect(
      packageVisual.querySelector('line[x1="452"][y1="72"][x2="542"][y2="122"]')
    ).not.toBeNull();
  });
});

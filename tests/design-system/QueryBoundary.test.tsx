// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryBoundary } from '@design-system/components/QueryBoundary';

describe('QueryBoundary', () => {
  it('يعرض حالة التحميل الموحدة', () => {
    render(
      <QueryBoundary isLoading error={null} onRetry={vi.fn()}>
        <div>المحتوى</div>
      </QueryBoundary>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
    expect(screen.queryByText('المحتوى')).not.toBeInTheDocument();
  });

  it('يعطي التحميل أولوية على الخطأ عند اجتماعهما مؤقتًا', () => {
    render(
      <QueryBoundary
        isLoading
        error={{ message: 'تعذر التحميل.' }}
        onRetry={vi.fn()}
      >
        <div>المحتوى</div>
      </QueryBoundary>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('يعرض رسالة الخطأ وزر إعادة المحاولة', () => {
    render(
      <QueryBoundary
        isLoading={false}
        error={{ message: 'تعذر تحميل الصفوف.' }}
        onRetry={vi.fn()}
      >
        <div>المحتوى</div>
      </QueryBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الصفوف.');
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
    expect(screen.queryByText('المحتوى')).not.toBeInTheDocument();
  });

  it('يستدعي onRetry مرة واحدة عند الضغط على زر إعادة المحاولة', () => {
    const onRetry = vi.fn();

    render(
      <QueryBoundary
        isLoading={false}
        error={{ message: 'تعذر تحميل الصفوف.' }}
        onRetry={onRetry}
      >
        <div>المحتوى</div>
      </QueryBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('يعرض children عند النجاح', () => {
    render(
      <QueryBoundary isLoading={false} error={null} onRetry={vi.fn()}>
        <div>المحتوى الناجح</div>
      </QueryBoundary>,
    );

    expect(screen.getByText('المحتوى الناجح')).toBeInTheDocument();
  });

  it('لا يعامل children الفارغة كخطأ', () => {
    const { container } = render(
      <QueryBoundary isLoading={false} error={null} onRetry={vi.fn()}>
        {null}
      </QueryBoundary>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});

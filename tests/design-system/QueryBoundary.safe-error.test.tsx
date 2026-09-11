// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { ClientAsyncAbortError } from '@services/runtime/client-async-boundary';

describe('QueryBoundary safe public errors', () => {
  it('لا يعرض رسالة repository الخام عندما يوجد cause تقني', () => {
    render(
      <QueryBoundary
        isLoading={false}
        error={{
          message: 'postgres secret detail: user@example.com',
          cause: new Error('postgres secret detail: user@example.com'),
        }}
        onRetry={vi.fn()}
      >
        <div>المحتوى</div>
      </QueryBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل البيانات. حاول مرة أخرى.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('postgres secret detail');
    expect(screen.getByRole('alert')).not.toHaveTextContent('user@example.com');
  });

  it('يعرض رسالة عربية آمنة ومحددة عند timeout', () => {
    render(
      <QueryBoundary
        isLoading={false}
        error={{
          message: 'Client operation timed out.',
          cause: new ClientAsyncAbortError('timeout'),
        }}
        onRetry={vi.fn()}
      >
        <div>المحتوى</div>
      </QueryBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'استغرق تحميل البيانات وقتًا أطول من المتوقع. حاول مرة أخرى.'
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Client operation timed out.');
  });
});

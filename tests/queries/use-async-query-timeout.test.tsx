// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { useAsyncQuery } from '@services/queries/use-async-query';

const neverResolvingQuery = () => new Promise<string>(() => undefined);

function TimeoutProbe() {
  const query = useAsyncQuery({
    queryKey: 'timeout-probe',
    initialData: '',
    queryFn: neverResolvingQuery,
    timeoutMs: 25,
  });

  return (
    <QueryBoundary isLoading={query.isLoading} error={query.error} onRetry={query.reload}>
      <div>تم التحميل</div>
    </QueryBoundary>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useAsyncQuery timeout boundary', () => {
  it('ينهي القراءة العالقة ويعرض timeout آمنًا بدل دوران التحميل بلا نهاية', async () => {
    vi.useFakeTimers();
    render(<TimeoutProbe />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(25);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'استغرق تحميل البيانات وقتًا أطول من المتوقع. حاول مرة أخرى.'
    );
    expect(screen.queryByText('تم التحميل')).not.toBeInTheDocument();
  });
});

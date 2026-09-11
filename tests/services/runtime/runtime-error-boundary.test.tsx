// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeErrorBoundary } from '@services/runtime/runtime-error-boundary';

function ExplodingView(): never {
  throw new Error('Bearer super-secret-value user@example.com');
}

describe('RuntimeErrorBoundary', () => {
  it('replaces an uncaught render failure with a safe Arabic fallback and reference id', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reportDiagnostic = vi.fn(() => 'diag-render-123');
    const reloadPage = vi.fn();

    render(
      <RuntimeErrorBoundary reportDiagnostic={reportDiagnostic} reloadPage={reloadPage}>
        <ExplodingView />
      </RuntimeErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر عرض الصفحة');
    expect(screen.getByTestId('runtime-reference-id')).toHaveTextContent('diag-render-123');
    expect(screen.queryByText(/super-secret-value/)).not.toBeInTheDocument();
    expect(screen.queryByText(/user@example\.com/)).not.toBeInTheDocument();

    expect(reportDiagnostic).toHaveBeenCalledWith({
      kind: 'react_render_error',
      source: 'react',
      error: expect.any(Error),
    });

    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل التطبيق' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});

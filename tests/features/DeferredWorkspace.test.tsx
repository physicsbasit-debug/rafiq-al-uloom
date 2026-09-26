// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DeferredWorkspace,
  type DeferredWorkspaceModule,
} from '@features/workspace/DeferredWorkspace';
import { reportRuntimeDiagnostic } from '@services/runtime/runtime-diagnostics';

vi.mock('@services/runtime/runtime-diagnostics', () => ({
  reportRuntimeDiagnostic: vi.fn(() => 'diag-workspace-1'),
}));

const mockedReportRuntimeDiagnostic = vi.mocked(reportRuntimeDiagnostic);

describe('DeferredWorkspace', () => {
  it('يعرض fallback عربية أثناء انتظار dynamic import ثم يعرض المساحة', async () => {
    let resolveModule!: (module: DeferredWorkspaceModule) => void;
    const load = vi.fn(
      () =>
        new Promise<DeferredWorkspaceModule>((resolve) => {
          resolveModule = resolve;
        })
    );

    render(<DeferredWorkspace workspaceLabel="مساحة المعلم" load={load} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل مساحة المعلم');

    await act(async () => {
      resolveModule({
        default: () => <div>المعلم المؤجل</div>,
      });
    });

    expect(await screen.findByText('المعلم المؤجل')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('يلتقط رفض dynamic import محليًا ثم يعيد المحاولة دون إسقاط التطبيق', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedReportRuntimeDiagnostic.mockClear();

    const load = vi
      .fn<() => Promise<DeferredWorkspaceModule>>()
      .mockRejectedValueOnce(new Error('chunk 404'))
      .mockResolvedValueOnce({
        default: () => <div>المراجع بعد إعادة المحاولة</div>,
      });

    render(<DeferredWorkspace workspaceLabel="مساحة المراجع" load={load} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل مساحة العمل');
    expect(screen.getByRole('alert')).toHaveTextContent('تحقق من الاتصال ثم حاول مرة أخرى');
    expect(mockedReportRuntimeDiagnostic).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(await screen.findByText('المراجع بعد إعادة المحاولة')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});

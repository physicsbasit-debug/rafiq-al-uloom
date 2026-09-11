// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  createRuntimeDiagnosticReporter,
  installGlobalRuntimeDiagnostics,
} from '@services/runtime/runtime-diagnostics';

describe('runtime diagnostics', () => {
  it('emits a bounded metadata-only diagnostic without raw exception content', () => {
    const sink = vi.fn();
    const report = createRuntimeDiagnosticReporter(sink, {
      randomUUID: () => 'diag-fixed-123',
      nowIso: () => '2026-09-10T18:00:00.000Z',
    });
    const error = new Error('Bearer secret-token user@example.com');
    error.stack = 'SECRET STACK CONTENT';

    const referenceId = report({
      kind: 'react_render_error',
      source: 'react',
      error,
    });

    expect(referenceId).toBe('diag-fixed-123');
    expect(sink).toHaveBeenCalledWith({
      referenceId: 'diag-fixed-123',
      kind: 'react_render_error',
      source: 'react',
      occurredAt: '2026-09-10T18:00:00.000Z',
      errorType: 'Error',
    });

    const serialized = JSON.stringify(sink.mock.calls[0]?.[0]);
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('user@example.com');
    expect(serialized).not.toContain('SECRET STACK CONTENT');
  });

  it('captures window errors and unhandled rejections through one safe reporter', () => {
    const reporter = vi.fn(() => 'diag-1');
    const target = new EventTarget();
    const cleanup = installGlobalRuntimeDiagnostics(target, reporter);

    target.dispatchEvent(new ErrorEvent('error', { error: new TypeError('private message') }));

    const rejectionEvent = new Event('unhandledrejection');
    Object.defineProperty(rejectionEvent, 'reason', {
      configurable: true,
      value: new Error('private rejection'),
    });
    target.dispatchEvent(rejectionEvent);

    expect(reporter).toHaveBeenNthCalledWith(1, {
      kind: 'window_error',
      source: 'browser',
      error: expect.any(TypeError),
    });
    expect(reporter).toHaveBeenNthCalledWith(2, {
      kind: 'unhandled_rejection',
      source: 'browser',
      error: expect.any(Error),
    });

    cleanup();
    reporter.mockClear();

    target.dispatchEvent(new ErrorEvent('error', { error: new Error('after cleanup') }));
    expect(reporter).not.toHaveBeenCalled();
  });

  it('does not let a failing diagnostic sink create a second runtime failure', () => {
    const report = createRuntimeDiagnosticReporter(
      () => {
        throw new Error('sink failed');
      },
      {
        randomUUID: () => 'diag-safe',
        nowIso: () => '2026-09-10T18:00:00.000Z',
      }
    );

    expect(() =>
      report({
        kind: 'window_error',
        source: 'browser',
        error: new Error('original'),
      })
    ).not.toThrow();
  });
});

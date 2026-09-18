import { describe, expect, it, vi } from 'vitest';

import { createServiceDiagnosticReporter } from '@services/runtime/service-diagnostic-bridge';
import type { RuntimeDiagnosticReporter } from '@services/runtime/runtime-diagnostics';

describe('service diagnostic bridge', () => {
  it.each([
    [
      'auth',
      'signInWithPassword: invalid_credentials',
      'signInWithPassword',
      'invalid_credentials',
    ],
    ['profile', 'getUserProfile: missing_profile', 'getUserProfile', 'missing_profile'],
    ['authorization', 'loadProfile: unknown', 'loadProfile', 'unknown'],
    ['authoring', 'saveLessonRevision: network_error', 'saveLessonRevision', 'network_error'],
    [
      'mastery_results',
      'submitMasteryAttempt: service_unavailable',
      'submitMasteryAttempt',
      'service_unavailable',
    ],
  ] as const)(
    'maps %s diagnostics into bounded runtime metadata',
    (service, message, operation, reason) => {
      const reporter = vi.fn(() => 'diag-1') as unknown as RuntimeDiagnosticReporter;
      const reportServiceDiagnostic = createServiceDiagnosticReporter(service, reporter);

      reportServiceDiagnostic(new Error(message));

      expect(reporter).toHaveBeenCalledWith({
        kind: 'service_error',
        source: 'service',
        service,
        operation,
        reason,
      });
    }
  );

  it('does not forward cause, token, email, payload text, or stack content', () => {
    const reporter = vi.fn(() => 'diag-safe') as unknown as RuntimeDiagnosticReporter;
    const reportServiceDiagnostic = createServiceDiagnosticReporter('auth', reporter);
    const cause = new Error('Bearer secret-token user@example.com lesson private payload');
    cause.stack = 'PRIVATE STACK';
    const diagnostic = new Error('signInWithPassword: network_error', { cause });

    reportServiceDiagnostic(diagnostic);

    const serialized = JSON.stringify(reporter.mock.calls[0]?.[0]);
    expect(serialized).toContain('signInWithPassword');
    expect(serialized).toContain('network_error');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('user@example.com');
    expect(serialized).not.toContain('lesson private payload');
    expect(serialized).not.toContain('PRIVATE STACK');
  });

  it('folds unknown or malformed diagnostic text to bounded unknown values', () => {
    const reporter = vi.fn(() => 'diag-unknown') as unknown as RuntimeDiagnosticReporter;
    const reportServiceDiagnostic = createServiceDiagnosticReporter('authoring', reporter);

    reportServiceDiagnostic(new Error('saveLessonRevision: private_reason user@example.com'));

    expect(reporter).toHaveBeenCalledWith({
      kind: 'service_error',
      source: 'service',
      service: 'authoring',
      operation: 'unknown',
      reason: 'unknown',
    });
  });

  it('keeps a known operation while folding an unknown reason', () => {
    const reporter = vi.fn(() => 'diag-partial') as unknown as RuntimeDiagnosticReporter;
    const reportServiceDiagnostic = createServiceDiagnosticReporter('profile', reporter);

    reportServiceDiagnostic(new Error('getUserProfile: private_reason'));

    expect(reporter).toHaveBeenCalledWith({
      kind: 'service_error',
      source: 'service',
      service: 'profile',
      operation: 'getUserProfile',
      reason: 'unknown',
    });
  });

  it('never lets a failing runtime reporter break the service path', () => {
    const reporter = vi.fn(() => {
      throw new Error('runtime sink failed');
    }) as unknown as RuntimeDiagnosticReporter;
    const reportServiceDiagnostic = createServiceDiagnosticReporter('mastery_results', reporter);

    expect(() =>
      reportServiceDiagnostic(new Error('submitMasteryAttempt: network_error'))
    ).not.toThrow();
  });
});

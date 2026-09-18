import {
  reportRuntimeDiagnostic,
  type RuntimeDiagnosticReporter,
  type RuntimeServiceName,
} from './runtime-diagnostics';

interface ServiceDiagnosticPolicy {
  readonly operations: readonly string[];
  readonly reasons: readonly string[];
}

const SERVICE_DIAGNOSTIC_ALLOWLIST: Readonly<Record<RuntimeServiceName, ServiceDiagnosticPolicy>> =
  {
    auth: {
      operations: [
        'getCurrentSession',
        'getCurrentUser',
        'signInWithPassword',
        'signUp',
        'signOut',
      ],
      reasons: [
        'invalid_input',
        'invalid_credentials',
        'weak_password',
        'rate_limited',
        'network_error',
        'service_unavailable',
        'unknown',
      ],
    },
    profile: {
      operations: ['getUserProfile'],
      reasons: [
        'missing_profile',
        'invalid_profile',
        'network_error',
        'service_unavailable',
        'unknown',
      ],
    },
    authorization: {
      operations: ['loadProfile'],
      reasons: ['unknown'],
    },
    authoring: {
      operations: [
        'listOwnRevisions',
        'listReviewEvents',
        'createLessonRevision',
        'saveLessonRevision',
        'submitLessonRevision',
        'listPendingRevisions',
        'reviewLessonRevision',
      ],
      reasons: ['network_error', 'service_unavailable', 'unknown'],
    },
    mastery_results: {
      operations: ['submitMasteryAttempt'],
      reasons: ['network_error', 'service_unavailable', 'unknown'],
    },
  };

function parseBoundedServiceDiagnostic(
  service: RuntimeServiceName,
  message: string
): { operation: string; reason: string } {
  const match = /^([A-Za-z][A-Za-z0-9]*): ([a-z][a-z0-9_]*)$/.exec(message);
  if (!match) {
    return { operation: 'unknown', reason: 'unknown' };
  }

  const [, rawOperation, rawReason] = match;
  const policy = SERVICE_DIAGNOSTIC_ALLOWLIST[service];

  return {
    operation: policy.operations.includes(rawOperation) ? rawOperation : 'unknown',
    reason: policy.reasons.includes(rawReason) ? rawReason : 'unknown',
  };
}

export function createServiceDiagnosticReporter(
  service: RuntimeServiceName,
  reporter: RuntimeDiagnosticReporter = reportRuntimeDiagnostic
): (error: Error) => void {
  return (error) => {
    const { operation, reason } = parseBoundedServiceDiagnostic(service, error.message);

    try {
      reporter({
        kind: 'service_error',
        source: 'service',
        service,
        operation,
        reason,
      });
    } catch {
      // Diagnostics must never become a second service failure.
    }
  };
}

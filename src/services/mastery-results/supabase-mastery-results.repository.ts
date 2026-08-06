import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@services/data/supabase-client';

import {
  createMasteryResultsDiagnosticError,
  isAbortError,
  unavailableResult,
} from './mastery-results.errors';
import type { MasteryResultsRepository } from './mastery-results.repository';
import {
  MASTERY_SCORING_POLICY_VERSION,
  type MasteryAttemptRejectionReason,
  type MasteryAttemptRepositoryResult,
  type MasteryAttemptRepositorySubmission,
  type OfficialMasteryAttemptResult,
} from './mastery-results.types';

type MasteryRpcClient = Pick<SupabaseClient, 'rpc'>;

type RpcResponse = {
  readonly data: unknown | null;
  readonly error: unknown;
};

type RpcQuery = PromiseLike<RpcResponse> & {
  abortSignal(signal: AbortSignal): RpcQuery;
};

export interface SupabaseMasteryResultsRepositoryOptions {
  readonly reportDiagnostic?: (error: Error) => void;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/;
const REJECTION_REASONS = new Set<MasteryAttemptRejectionReason>([
  'not_authenticated',
  'not_authorized',
  'invalid_response_set',
  'lesson_not_available',
  'scoring_contract_stale',
  'question_set_mismatch',
  'submission_conflict',
]);

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${field}`);
  }

  return value;
}

function requireUuid(value: unknown, field: string): string {
  const stringValue = requireString(value, field);
  if (!UUID_PATTERN.test(stringValue)) {
    throw new Error(`Invalid ${field}`);
  }

  return stringValue;
}

function requireInteger(value: unknown, field: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new Error(`Invalid ${field}`);
  }

  return value as number;
}

function requirePercentage(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('Invalid result.percentage');
  }

  return value;
}

function requireTimestamp(value: unknown, field: string): string {
  const stringValue = requireString(value, field);
  if (Number.isNaN(Date.parse(stringValue))) {
    throw new Error(`Invalid ${field}`);
  }

  return stringValue;
}

function requireFingerprint(value: unknown): string {
  const stringValue = requireString(value, 'result.scoringFingerprint').toLowerCase();
  if (!HEX_64_PATTERN.test(stringValue)) {
    throw new Error('Invalid result.scoringFingerprint');
  }

  return stringValue;
}

function mapOfficialResult(value: unknown): OfficialMasteryAttemptResult {
  const row = requireObject(value, 'result');
  const questionCount = requireInteger(row.questionCount, 'result.questionCount', 1);
  const correctCount = requireInteger(row.correctCount, 'result.correctCount');
  if (correctCount > questionCount) {
    throw new Error('Invalid result.correctCount');
  }

  if (row.scoringPolicyVersion !== MASTERY_SCORING_POLICY_VERSION) {
    throw new Error('Invalid result.scoringPolicyVersion');
  }

  return {
    attemptId: requireUuid(row.attemptId, 'result.attemptId'),
    submissionId: requireUuid(row.submissionId, 'result.submissionId'),
    lessonId: requireString(row.lessonId, 'result.lessonId'),
    questionCount,
    correctCount,
    percentage: requirePercentage(row.percentage),
    scoringPolicyVersion: MASTERY_SCORING_POLICY_VERSION,
    scoringFingerprint: requireFingerprint(row.scoringFingerprint),
    completedAt: requireTimestamp(row.completedAt, 'result.completedAt'),
  };
}

function mapRpcData(value: unknown): MasteryAttemptRepositoryResult {
  const response = requireObject(value, 'RPC response');
  const status = requireString(response.status, 'RPC response.status');

  if (status === 'saved' || status === 'already_saved') {
    return {
      status,
      result: mapOfficialResult(response.result),
    };
  }

  if (status === 'rejected') {
    const reason = requireString(response.reason, 'RPC response.reason');
    if (!REJECTION_REASONS.has(reason as MasteryAttemptRejectionReason)) {
      throw new Error('Invalid RPC response.reason');
    }

    return {
      status: 'rejected',
      reason: reason as MasteryAttemptRejectionReason,
    };
  }

  throw new Error('Invalid RPC response.status');
}

function callSubmitRpc(
  client: MasteryRpcClient,
  submission: MasteryAttemptRepositorySubmission
): RpcQuery {
  return client.rpc('submit_mastery_attempt', {
    p_submission_id: submission.submissionId,
    p_lesson_id: submission.lessonId,
    p_started_at: submission.startedAt,
    p_expected_scoring_fingerprint: submission.expectedScoringFingerprint,
    p_answers: submission.answers,
  }) as unknown as RpcQuery;
}

export function createSupabaseMasteryResultsRepository(
  client: MasteryRpcClient,
  options: SupabaseMasteryResultsRepositoryOptions = {}
): MasteryResultsRepository {
  const reportDiagnostic = options.reportDiagnostic ?? (() => undefined);

  function report(
    reason: 'network_error' | 'service_unavailable' | 'unknown',
    cause: unknown
  ): void {
    reportDiagnostic(createMasteryResultsDiagnosticError('submitMasteryAttempt', reason, cause));
  }

  return {
    async submitAttempt(submission, requestOptions = {}) {
      requestOptions.signal?.throwIfAborted();

      try {
        let query = callSubmitRpc(client, submission);
        if (requestOptions.signal) {
          query = query.abortSignal(requestOptions.signal);
        }

        const { data, error } = await query;
        if (error) {
          if (isAbortError(error)) {
            throw error;
          }

          const result = unavailableResult(error);
          if (result.status === 'unavailable') {
            report(result.reason, error);
          }
          return result;
        }

        if (data === null) {
          const error = new Error('submit_mastery_attempt returned no data');
          report('unknown', error);
          return { status: 'unavailable', reason: 'unknown' };
        }

        try {
          return mapRpcData(data);
        } catch (error) {
          report('unknown', error);
          return { status: 'unavailable', reason: 'unknown' };
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        const result = unavailableResult(error);
        if (result.status === 'unavailable') {
          report(result.reason, error);
        }
        return result;
      }
    },
  };
}

let defaultRepository: MasteryResultsRepository | undefined;

function getDefaultRepository(): MasteryResultsRepository {
  defaultRepository ??= createSupabaseMasteryResultsRepository(getSupabaseClient());
  return defaultRepository;
}

export const supabaseMasteryResultsRepository: MasteryResultsRepository = {
  submitAttempt: (submission, options) => getDefaultRepository().submitAttempt(submission, options),
};

import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AuthSessionContext } from '@features/auth/useAuthSession';
import type { AuthState } from '@services/auth/auth.types';
import { authorizeOperation } from '@services/auth/authorization.policy';
import type { AuthorizationState } from '@services/auth/authorization.types';
import {
  masteryResultsService,
  type MasteryAttemptServiceSubmission,
  type MasteryResultsService,
} from '@services/mastery-results';
import {
  readContentProvider,
  type ContentProvider,
} from '@services/data/content-repository.provider';
import type { Question } from '@shared-types/quiz.types';
import type { AnswersByQuestionId } from '@utils/scoring';
import type { MasterySaveState } from './mastery-result-save.types';

interface MasteryPersistenceAuthorizationSnapshot {
  readonly authState: AuthState;
  readonly authorizationState: AuthorizationState | null;
}

export interface MasteryResultPersistenceDependencies {
  readonly service?: MasteryResultsService;
  readonly contentProvider?: ContentProvider;
  readonly authorization?: MasteryPersistenceAuthorizationSnapshot;
  readonly createSubmissionId?: () => string;
  readonly now?: () => string;
}

export interface MasteryResultPersistenceSubmission {
  readonly questions: readonly Question[];
  readonly answersByQuestionId: AnswersByQuestionId;
}

export interface MasteryResultPersistenceController {
  readonly state: MasterySaveState;
  submitAttempt(submission: MasteryResultPersistenceSubmission): void;
  retry(): void;
}

const GUEST_AUTHORIZATION: MasteryPersistenceAuthorizationSnapshot = {
  authState: { status: 'guest' },
  authorizationState: null,
};

function createSubmissionId(): string {
  return globalThis.crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'AbortError'
  );
}

function copySubmission(
  lessonId: string,
  submissionId: string,
  startedAt: string,
  submission: MasteryResultPersistenceSubmission
): MasteryAttemptServiceSubmission {
  return {
    submissionId,
    lessonId,
    startedAt,
    questions: submission.questions.map((question) => ({
      ...question,
      choices: [...question.choices],
    })),
    answersByQuestionId: { ...submission.answersByQuestionId },
  };
}

export function useMasteryResultPersistence(
  lessonId: string,
  dependencies: MasteryResultPersistenceDependencies = {}
): MasteryResultPersistenceController {
  const authSession = useContext(AuthSessionContext);
  const authorization = dependencies.authorization ?? authSession ?? GUEST_AUTHORIZATION;
  const service = dependencies.service ?? masteryResultsService;
  const contentProvider = dependencies.contentProvider ?? readContentProvider(import.meta.env);
  const makeSubmissionId = dependencies.createSubmissionId ?? createSubmissionId;
  const now = dependencies.now ?? nowIso;

  const [state, setState] = useState<MasterySaveState>({ status: 'idle' });
  const [startedAt] = useState(now);
  const submissionIdRef = useRef<string | null>(null);
  const lastSubmissionRef = useRef<MasteryAttemptServiceSubmission | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, []);

  const resolvePreflightState = useCallback((): MasterySaveState | null => {
    if (contentProvider !== 'supabase') {
      return { status: 'not_applicable', reason: 'local_content' };
    }

    const decision = authorizeOperation(
      authorization.authState,
      authorization.authorizationState,
      'submit_own_mastery_result'
    );
    if (decision.allowed) {
      return null;
    }

    if (decision.reason === 'guest') {
      return { status: 'not_applicable', reason: 'guest' };
    }

    return {
      status: 'failed',
      failure: { kind: 'authorization', reason: decision.reason },
      retryable: false,
    };
  }, [authorization, contentProvider]);

  const runAuthorizedSubmission = useCallback(
    async (submission: MasteryAttemptServiceSubmission): Promise<void> => {
      activeControllerRef.current?.abort();
      const controller = new AbortController();
      activeControllerRef.current = controller;
      requestVersionRef.current += 1;
      const requestVersion = requestVersionRef.current;
      setState({ status: 'saving', submissionId: submission.submissionId });

      try {
        const result = await service.submitAttempt(submission, {
          signal: controller.signal,
        });
        if (
          controller.signal.aborted ||
          !mountedRef.current ||
          requestVersion !== requestVersionRef.current
        ) {
          return;
        }

        if (result.status === 'saved' || result.status === 'already_saved') {
          setState({
            status: 'saved',
            submissionStatus: result.status,
            result: result.result,
            reconciliation: result.reconciliation,
          });
          return;
        }

        setState({
          status: 'failed',
          failure: { kind: 'submission', result },
          retryable: result.status === 'unavailable',
        });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (mountedRef.current && requestVersion === requestVersionRef.current) {
          setState({
            status: 'failed',
            failure: {
              kind: 'submission',
              result: { status: 'unavailable', reason: 'unknown' },
            },
            retryable: true,
          });
        }
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
      }
    },
    [service]
  );

  const submitAttempt = useCallback(
    (submission: MasteryResultPersistenceSubmission): void => {
      if (activeControllerRef.current || lastSubmissionRef.current) {
        return;
      }

      const preflightState = resolvePreflightState();
      if (preflightState) {
        setState(preflightState);
        return;
      }

      try {
        submissionIdRef.current ??= makeSubmissionId();
        const persistedSubmission = copySubmission(
          lessonId,
          submissionIdRef.current,
          startedAt,
          submission
        );
        lastSubmissionRef.current = persistedSubmission;
        void runAuthorizedSubmission(persistedSubmission);
      } catch {
        setState({
          status: 'failed',
          failure: {
            kind: 'submission',
            result: { status: 'unavailable', reason: 'unknown' },
          },
          retryable: false,
        });
      }
    },
    [lessonId, makeSubmissionId, resolvePreflightState, runAuthorizedSubmission, startedAt]
  );

  const retry = useCallback((): void => {
    if (state.status !== 'failed' || !state.retryable || !lastSubmissionRef.current) {
      return;
    }

    const preflightState = resolvePreflightState();
    if (preflightState) {
      setState(preflightState);
      return;
    }

    void runAuthorizedSubmission(lastSubmissionRef.current);
  }, [resolvePreflightState, runAuthorizedSubmission, state]);

  return { state, submitAttempt, retry };
}

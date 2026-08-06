// @vitest-environment jsdom

import { randomUUID } from 'node:crypto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { useMasteryResultPersistence } from '@features/mastery/useMasteryResultPersistence';
import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';
import {
  createMasteryResultsService,
  createSupabaseMasteryResultsRepository,
} from '@services/mastery-results';
import type { ReadyAuthState } from '@services/auth/auth.types';
import type { AuthorizationState } from '@services/auth/authorization.types';

import {
  createIsolatedSupabaseClient,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';
import {
  createAuthCompositionHarness,
  type AuthCompositionHarness,
} from './helpers/auth-composition-harness';
import {
  answersForPattern,
  countStoredAttempts,
  createMasteryResultsFixture,
  installMasteryResultsFixture,
  readStoredMasteryAttempt,
  removeMasteryResultsFixture,
} from './helpers/mastery-results-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

interface AuthorizedSession {
  readonly authState: ReadyAuthState;
  readonly authorizationState: AuthorizationState;
}

async function waitForInitialGuest(harness: AuthCompositionHarness): Promise<void> {
  await harness.waitForAuthState((state) => state.status === 'guest', 'initial guest Auth state');
  await harness.waitForAuthorizationState(
    (state) => state === null,
    'initial empty Authorization state'
  );
}

async function signInAuthorizedStudent(
  harness: AuthCompositionHarness,
  identity: AuthIdentity
): Promise<AuthorizedSession> {
  await waitForInitialGuest(harness);

  const signIn = await harness.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  expect(signIn.status).toBe('authenticated');

  const authState = await harness.waitForAuthState(
    (state) => state.status === 'authenticated' && state.user.id === identity.user.id,
    'authenticated D4 student'
  );
  const authorizationState = await harness.waitForAuthorizationState(
    (state) => state?.status === 'authorized' && state.profile.id === identity.user.id,
    'authorized D4 student'
  );

  if (authorizationState?.status !== 'authorized') {
    throw new Error('Expected an authorized D4 student.');
  }

  return { authState, authorizationState };
}

async function signOutAndDispose(harness: AuthCompositionHarness): Promise<void> {
  try {
    await harness.auth.signOut();
  } finally {
    harness.dispose();
  }
}

describeIntegration('Phase 2-D4 real mastery composition', { concurrent: false }, () => {
  const fixture = createMasteryResultsFixture('d4-composition');
  let authFixtures: SupabaseAuthFixtures;
  let activeStudent: AuthIdentity;

  beforeAll(async () => {
    installMasteryResultsFixture(fixture);
    authFixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    activeStudent = await authFixtures.createIdentity(
      'd4-composition-active-student',
      'student',
      'active'
    );
  }, 30_000);

  afterAll(async () => {
    try {
      await authFixtures.cleanup();
    } finally {
      removeMasteryResultsFixture(fixture);
    }
  }, 30_000);

  it('composes real Auth, Authorization, content, React hook, RPC, and stored rows', async () => {
    const client = createIsolatedSupabaseClient(
      authFixtures.env.apiUrl,
      authFixtures.env.publishableKey
    );
    const harness = createAuthCompositionHarness(client);

    try {
      const authorization = await signInAuthorizedStudent(harness, activeStudent);
      const contentRepository = createSupabaseContentRepository(client);
      const questions = await contentRepository.getMasteryQuestionsByLesson(fixture.lessonId);
      expect(questions).toHaveLength(3);

      const service = createMasteryResultsService(
        createSupabaseMasteryResultsRepository(client)
      );
      const submissionId = randomUUID();
      const startedAt = new Date(Date.now() - 30_000).toISOString();
      const answersByQuestionId = answersForPattern(questions, [true, false, true]);

      const { result, unmount } = renderHook(() =>
        useMasteryResultPersistence(fixture.lessonId, {
          service,
          contentProvider: 'supabase',
          authorization,
          createSubmissionId: () => submissionId,
          now: () => startedAt,
        })
      );

      try {
        act(() => {
          result.current.submitAttempt({ questions, answersByQuestionId });
        });
        expect(result.current.state.status).toBe('saving');

        await waitFor(() => {
          expect(result.current.state.status).toBe('saved');
        });

        const saveState = result.current.state;
        if (saveState.status !== 'saved') {
          throw new Error('Expected a saved D4 composition result.');
        }

        expect(saveState.submissionStatus).toBe('saved');
        expect(saveState.reconciliation).toBe('matched_local_result');
        expect(saveState.result).toMatchObject({
          submissionId,
          lessonId: fixture.lessonId,
          questionCount: 3,
          correctCount: 2,
        });
        expect(saveState.result.percentage).toBeCloseTo((2 / 3) * 100, 12);

        const stored = readStoredMasteryAttempt(activeStudent.user.id, submissionId);
        expect(stored).toMatchObject({
          attemptId: saveState.result.attemptId,
          submissionId,
          userId: activeStudent.user.id,
          lessonId: fixture.lessonId,
          questionCount: 3,
          correctCount: 2,
          scoringFingerprint: saveState.result.scoringFingerprint,
          answerCount: 3,
        });
        expect(stored.percentage).toBeCloseTo(saveState.result.percentage, 12);
      } finally {
        unmount();
      }
    } finally {
      await signOutAndDispose(harness);
    }
  }, 20_000);

  it('remounts with the same frozen submission and receives already_saved without duplication', async () => {
    const client = createIsolatedSupabaseClient(
      authFixtures.env.apiUrl,
      authFixtures.env.publishableKey
    );
    const harness = createAuthCompositionHarness(client);

    try {
      const authorization = await signInAuthorizedStudent(harness, activeStudent);
      const contentRepository = createSupabaseContentRepository(client);
      const questions = await contentRepository.getMasteryQuestionsByLesson(fixture.lessonId);
      const service = createMasteryResultsService(
        createSupabaseMasteryResultsRepository(client)
      );
      const submissionId = randomUUID();
      const startedAt = new Date(Date.now() - 60_000).toISOString();
      const answersByQuestionId = answersForPattern(questions, [false, true, true]);
      const dependencies = {
        service,
        contentProvider: 'supabase' as const,
        authorization,
        createSubmissionId: () => submissionId,
        now: () => startedAt,
      };

      const first = renderHook(() =>
        useMasteryResultPersistence(fixture.lessonId, dependencies)
      );
      act(() => {
        first.result.current.submitAttempt({ questions, answersByQuestionId });
      });
      await waitFor(() => {
        expect(first.result.current.state.status).toBe('saved');
      });
      const firstState = first.result.current.state;
      if (firstState.status !== 'saved') {
        throw new Error('Expected the first D4 save to succeed.');
      }
      expect(firstState.submissionStatus).toBe('saved');
      first.unmount();

      const second = renderHook(() =>
        useMasteryResultPersistence(fixture.lessonId, dependencies)
      );
      try {
        act(() => {
          second.result.current.submitAttempt({ questions, answersByQuestionId });
        });
        await waitFor(() => {
          expect(second.result.current.state.status).toBe('saved');
        });

        const secondState = second.result.current.state;
        if (secondState.status !== 'saved') {
          throw new Error('Expected the repeated D4 save to succeed.');
        }

        expect(secondState.submissionStatus).toBe('already_saved');
        expect(secondState.result.attemptId).toBe(firstState.result.attemptId);
        expect(secondState.result.submissionId).toBe(submissionId);
        expect(secondState.reconciliation).toBe('matched_local_result');
        expect(countStoredAttempts(activeStudent.user.id, submissionId)).toBe(1);
      } finally {
        second.unmount();
      }
    } finally {
      await signOutAndDispose(harness);
    }
  }, 20_000);
});

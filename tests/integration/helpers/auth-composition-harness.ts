import type { SupabaseClient } from '@supabase/supabase-js';

import { createAuthService, type AuthService } from '@services/auth/auth.service';
import type { ReadyAuthState } from '@services/auth/auth.types';
import {
  createAuthorizationService,
  type AuthorizationService,
} from '@services/auth/authorization.service';
import type { AuthorizationState } from '@services/auth/authorization.types';
import { createProfileService } from '@services/auth/profile.service';

interface PendingWaiter<T> {
  readonly predicate: (value: T) => boolean;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface StateChannel<T> {
  publish(value: T): void;
  waitFor(
    predicate: (value: T) => boolean,
    label: string,
    timeoutMs?: number
  ): Promise<T>;
  dispose(): void;
}

export interface AuthCompositionHarness {
  readonly auth: AuthService;
  readonly authorization: AuthorizationService;
  getAuthState(): ReadyAuthState | undefined;
  getAuthorizationState(): AuthorizationState | null | undefined;
  waitForAuthState(
    predicate: (state: ReadyAuthState) => boolean,
    label: string
  ): Promise<ReadyAuthState>;
  waitForAuthorizationState(
    predicate: (state: AuthorizationState | null) => boolean,
    label: string
  ): Promise<AuthorizationState | null>;
  dispose(): void;
}

function createStateChannel<T>(): StateChannel<T> & { getCurrent(): T | undefined } {
  const waiters = new Set<PendingWaiter<T>>();
  let current: T | undefined;
  let hasCurrent = false;

  return {
    getCurrent(): T | undefined {
      return hasCurrent ? current : undefined;
    },

    publish(value: T): void {
      current = value;
      hasCurrent = true;

      for (const waiter of [...waiters]) {
        if (!waiter.predicate(value)) {
          continue;
        }

        clearTimeout(waiter.timer);
        waiters.delete(waiter);
        waiter.resolve(value);
      }
    },

    waitFor(predicate, label, timeoutMs = 8_000): Promise<T> {
      if (hasCurrent && predicate(current as T)) {
        return Promise.resolve(current as T);
      }

      return new Promise<T>((resolve, reject) => {
        const waiter: PendingWaiter<T> = {
          predicate,
          resolve,
          reject,
          timer: setTimeout(() => {
            waiters.delete(waiter);
            reject(new Error(`Timed out waiting for ${label}`));
          }, timeoutMs),
        };

        waiters.add(waiter);
      });
    },

    dispose(): void {
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error('Auth composition harness disposed'));
      }
      waiters.clear();
    },
  };
}

export function createAuthCompositionHarness(client: SupabaseClient): AuthCompositionHarness {
  const auth = createAuthService(client);
  const profiles = createProfileService(client);
  const authorization = createAuthorizationService(auth, profiles);
  const authStates = createStateChannel<ReadyAuthState>();
  const authorizationStates = createStateChannel<AuthorizationState | null>();

  // Subscribe to Auth first. createAuthService queues delivery, so the Authorization
  // listener is attached synchronously before INITIAL_SESSION is delivered.
  const removeAuthListener = auth.onAuthStateChange((change) => {
    authStates.publish(change.state);
  });
  const removeAuthorizationListener = authorization.onAuthorizationStateChange((state) => {
    authorizationStates.publish(state);
  });

  let active = true;

  return {
    auth,
    authorization,

    getAuthState: () => authStates.getCurrent(),
    getAuthorizationState: () => authorizationStates.getCurrent(),

    waitForAuthState: (predicate, label) => authStates.waitFor(predicate, label),
    waitForAuthorizationState: (predicate, label) =>
      authorizationStates.waitFor(predicate, label),

    dispose(): void {
      if (!active) {
        return;
      }

      active = false;
      removeAuthorizationListener();
      removeAuthListener();
      authorizationStates.dispose();
      authStates.dispose();
    },
  };
}

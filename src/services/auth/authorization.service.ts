import { authService, type AuthService } from './auth.service';
import { isAbortError } from './auth.errors';
import type { AuthStateChange } from './auth.types';
import type {
  AuthorizationState,
  AuthorizationStateListener,
  PublicAuthorizationError,
  UserProfile,
} from './authorization.types';
import { profileService, type ProfileService } from './profile.service';

export interface AuthorizationService {
  getCurrentState(): AuthorizationState | null;
  refreshAuthorization(): Promise<void>;
  onAuthorizationStateChange(listener: AuthorizationStateListener): () => void;
}

export interface AuthorizationServiceOptions {
  readonly reportDiagnostic?: (error: Error) => void;
}

const UNKNOWN_ERROR: PublicAuthorizationError = {
  code: 'unknown',
  message: 'تعذر قراءة بيانات الحساب حاليًا. حاول لاحقًا.',
};

function stateFromProfile(profile: UserProfile): AuthorizationState {
  switch (profile.status) {
    case 'active':
      return { status: 'authorized', profile };
    case 'pending':
      return { status: 'pending', profile };
    case 'suspended':
      return { status: 'suspended', profile };
  }
}

function diagnosticError(operation: string, cause: unknown): Error {
  return new Error(`${operation}: unknown`, { cause });
}

export function createAuthorizationService(
  auth: Pick<AuthService, 'onAuthStateChange'>,
  profiles: ProfileService,
  options: AuthorizationServiceOptions = {}
): AuthorizationService {
  const listeners = new Set<AuthorizationStateListener>();
  const reportDiagnostic = options.reportDiagnostic ?? (() => undefined);

  let currentState: AuthorizationState | null = null;
  let currentUserId: string | null = null;
  let removeAuthListener: (() => void) | undefined;
  let activeController: AbortController | undefined;
  let requestGeneration = 0;

  function notify(state: AuthorizationState | null): void {
    currentState = state;
    for (const listener of [...listeners]) {
      listener(state);
    }
  }

  function cancelActiveRequest(): void {
    requestGeneration += 1;
    activeController?.abort();
    activeController = undefined;
  }

  function clearAuthorization(): void {
    cancelActiveRequest();
    currentUserId = null;
    notify(null);
  }

  function hasLoadedProfileFor(userId: string): boolean {
    if (currentUserId !== userId || currentState === null) {
      return false;
    }

    return (
      currentState.status === 'authorized' ||
      currentState.status === 'pending' ||
      currentState.status === 'suspended'
    );
  }

  async function loadProfile(userId: string): Promise<void> {
    cancelActiveRequest();

    currentUserId = userId;
    const generation = requestGeneration;
    const controller = new AbortController();
    activeController = controller;
    notify({ status: 'loading_profile', userId });

    const load = (async () => {
      try {
        const result = await profiles.getUserProfile(userId, {
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          generation !== requestGeneration ||
          currentUserId !== userId
        ) {
          return;
        }

        notify(
          result.status === 'success'
            ? stateFromProfile(result.profile)
            : { status: 'profile_error', error: result.error }
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (generation !== requestGeneration || currentUserId !== userId) {
          return;
        }

        reportDiagnostic(diagnosticError('loadProfile', error));
        notify({ status: 'profile_error', error: UNKNOWN_ERROR });
      } finally {
        if (generation === requestGeneration) {
          activeController = undefined;
        }
      }
    })();

    await load;
  }

  function handleAuthStateChange(change: AuthStateChange): void {
    if (change.event === 'signed_out' || change.state.status === 'guest') {
      clearAuthorization();
      return;
    }

    if (change.state.status === 'error') {
      cancelActiveRequest();
      currentUserId = null;
      notify({ status: 'profile_error', error: UNKNOWN_ERROR });
      return;
    }

    const userId = change.state.user.id;

    if (change.event === 'initial_session') {
      void loadProfile(userId);
      return;
    }

    if (change.event === 'signed_in') {
      if (currentState?.status === 'loading_profile' && currentUserId === userId) {
        return;
      }

      if (!hasLoadedProfileFor(userId) || currentState?.status === 'profile_error') {
        void loadProfile(userId);
      }
    }
  }

  function ensureAuthSubscription(): void {
    if (removeAuthListener) {
      return;
    }

    removeAuthListener = auth.onAuthStateChange(handleAuthStateChange);
  }

  return {
    getCurrentState(): AuthorizationState | null {
      return currentState;
    },

    async refreshAuthorization(): Promise<void> {
      if (!currentUserId) {
        return;
      }

      await loadProfile(currentUserId);
    },

    onAuthorizationStateChange(listener): () => void {
      listeners.add(listener);
      ensureAuthSubscription();

      let active = true;
      return () => {
        if (!active) {
          return;
        }

        active = false;
        listeners.delete(listener);

        if (listeners.size === 0) {
          removeAuthListener?.();
          removeAuthListener = undefined;
          cancelActiveRequest();
        }
      };
    },
  };
}

let defaultAuthorizationService: AuthorizationService | undefined;

function getDefaultAuthorizationService(): AuthorizationService {
  defaultAuthorizationService ??= createAuthorizationService(authService, profileService);
  return defaultAuthorizationService;
}

export const authorizationService: AuthorizationService = {
  getCurrentState: () => getDefaultAuthorizationService().getCurrentState(),
  refreshAuthorization: () => getDefaultAuthorizationService().refreshAuthorization(),
  onAuthorizationStateChange: (listener) =>
    getDefaultAuthorizationService().onAuthorizationStateChange(listener),
};

import type { AuthState } from './auth.types';
import type { AuthorizationOperation } from './authorization.operations';
import type { AuthorizationState, UserRole } from './authorization.types';

export type AuthorizationDecisionReason =
  | 'allowed'
  | 'guest'
  | 'profile_loading'
  | 'session_error'
  | 'profile_error'
  | 'account_pending'
  | 'account_suspended'
  | 'role_not_allowed'
  | 'operation_not_available';

export type AuthorizationDecision =
  | {
      readonly allowed: true;
      readonly reason: 'allowed';
    }
  | {
      readonly allowed: false;
      readonly reason: Exclude<AuthorizationDecisionReason, 'allowed'>;
    };

const ALLOWED: AuthorizationDecision = {
  allowed: true,
  reason: 'allowed',
};

function denied(reason: Exclude<AuthorizationDecisionReason, 'allowed'>): AuthorizationDecision {
  return {
    allowed: false,
    reason,
  };
}

function authorizeActiveRole(
  role: UserRole,
  operation: AuthorizationOperation
): AuthorizationDecision {
  if (operation === 'author_content' || operation === 'review_content') {
    return denied('operation_not_available');
  }

  switch (operation) {
    case 'access_student_experience':
    case 'submit_own_mastery_result':
      return ALLOWED;
    case 'access_teacher_workspace':
      return role === 'teacher' ? ALLOWED : denied('role_not_allowed');
    case 'access_reviewer_workspace':
      return role === 'reviewer' ? ALLOWED : denied('role_not_allowed');
    default:
      return denied('operation_not_available');
  }
}

export function authorizeOperation(
  authState: AuthState,
  authorizationState: AuthorizationState | null,
  operation: AuthorizationOperation
): AuthorizationDecision {
  switch (authState.status) {
    case 'loading':
      return denied('profile_loading');
    case 'error':
      return denied('session_error');
    case 'guest':
      return denied('guest');
    case 'authenticated':
      break;
    default:
      return denied('session_error');
  }

  if (!authorizationState || authorizationState.status === 'loading_profile') {
    return denied('profile_loading');
  }

  switch (authorizationState.status) {
    case 'profile_error':
      return denied('profile_error');
    case 'pending':
      return denied('account_pending');
    case 'suspended':
      return denied('account_suspended');
    case 'authorized':
      return authorizeActiveRole(authorizationState.profile.role, operation);
    default:
      return denied('profile_error');
  }
}

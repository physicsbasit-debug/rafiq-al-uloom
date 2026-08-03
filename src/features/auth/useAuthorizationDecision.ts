import type { AuthorizationOperation } from '@services/auth/authorization.operations';
import {
  authorizeOperation,
  type AuthorizationDecision,
} from '@services/auth/authorization.policy';

import { useAuthSession } from './useAuthSession';

export function useAuthorizationDecision(
  operation: AuthorizationOperation
): AuthorizationDecision {
  const { authState, authorizationState } = useAuthSession();

  return authorizeOperation(authState, authorizationState, operation);
}

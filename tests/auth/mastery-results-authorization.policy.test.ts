import { describe, expect, it } from 'vitest';

import type { AuthState } from '@services/auth/auth.types';
import { authorizeOperation } from '@services/auth/authorization.policy';
import type { AuthorizationState, UserRole } from '@services/auth/authorization.types';

function authenticated(): AuthState {
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    emailConfirmedAt: '2026-08-06T00:00:00.000Z',
  };
  return {
    status: 'authenticated',
    user,
    session: { expiresAt: null, user },
  };
}

function authorized(
  role: UserRole
): Extract<AuthorizationState, { readonly status: 'authorized' }> {
  return {
    status: 'authorized',
    profile: {
      id: 'user-1',
      displayName: null,
      role,
      status: 'active',
      createdAt: '2026-08-06T00:00:00.000Z',
      updatedAt: '2026-08-06T00:00:00.000Z',
    },
  };
}

describe('authorization: submit own mastery result', () => {
  it.each(['student', 'teacher', 'reviewer'] as const)(
    'يسمح للدور النشط %s بحفظ نتيجته الشخصية',
    (role) => {
      expect(
        authorizeOperation(authenticated(), authorized(role), 'submit_own_mastery_result')
      ).toEqual({ allowed: true, reason: 'allowed' });
    }
  );

  it('يرفض Guest دفاعيًا', () => {
    expect(authorizeOperation({ status: 'guest' }, null, 'submit_own_mastery_result')).toEqual({
      allowed: false,
      reason: 'guest',
    });
  });

  it.each([
    ['pending', 'account_pending'],
    ['suspended', 'account_suspended'],
  ] as const)('يرفض الحساب %s', (status, reason) => {
    const state = authorized('student');
    const deniedState: AuthorizationState = {
      status,
      profile: { ...state.profile, status },
    };

    expect(authorizeOperation(authenticated(), deniedState, 'submit_own_mastery_result')).toEqual({
      allowed: false,
      reason,
    });
  });
});

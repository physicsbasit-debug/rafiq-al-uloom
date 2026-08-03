import { describe, expect, it } from 'vitest';

import type { AuthState } from '@services/auth/auth.types';
import type { AuthorizationOperation } from '@services/auth/authorization.operations';
import {
  authorizeOperation,
  type AuthorizationDecision,
} from '@services/auth/authorization.policy';
import type {
  AuthorizationState,
  UserProfile,
  UserRole,
  UserStatus,
} from '@services/auth/authorization.types';

function profile(role: UserRole = 'student', status: UserStatus = 'active'): UserProfile {
  return {
    id: 'user-1',
    displayName: null,
    role,
    status,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
  };
}

function authenticated(): AuthState {
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    emailConfirmedAt: '2026-08-03T00:00:00.000Z',
  };

  return {
    status: 'authenticated',
    user,
    session: {
      expiresAt: null,
      user,
    },
  };
}

function authorized(role: UserRole): AuthorizationState {
  return {
    status: 'authorized',
    profile: profile(role),
  };
}

function decide(
  operation: AuthorizationOperation,
  authorizationState: AuthorizationState | null,
  authState: AuthState = authenticated()
): AuthorizationDecision {
  return authorizeOperation(authState, authorizationState, operation);
}

describe('authorizeOperation', () => {
  it('يرفض Auth loading بسبب profile_loading', () => {
    expect(
      authorizeOperation({ status: 'loading' }, null, 'access_student_experience')
    ).toEqual({ allowed: false, reason: 'profile_loading' });
  });

  it('يرفض Auth error بسبب session_error', () => {
    expect(
      authorizeOperation(
        {
          status: 'error',
          error: { code: 'network_error', message: 'تعذر الاتصال' },
        },
        null,
        'access_student_experience'
      )
    ).toEqual({ allowed: false, reason: 'session_error' });
  });

  it('لا يحول session_error إلى profile_loading أو profile_error', () => {
    const decision = authorizeOperation(
      {
        status: 'error',
        error: { code: 'unknown', message: 'خطأ' },
      },
      { status: 'profile_error', error: { code: 'unknown', message: 'خطأ ملف' } },
      'access_student_experience'
    );

    expect(decision).toEqual({ allowed: false, reason: 'session_error' });
  });

  it('يرفض Guest دفاعيًا', () => {
    expect(
      authorizeOperation({ status: 'guest' }, null, 'access_student_experience')
    ).toEqual({ allowed: false, reason: 'guest' });
  });

  it('يرفض المستخدم المصادق عند غياب AuthorizationState', () => {
    expect(decide('access_student_experience', null)).toEqual({
      allowed: false,
      reason: 'profile_loading',
    });
  });

  it('يرفض loading_profile', () => {
    expect(
      decide('access_student_experience', {
        status: 'loading_profile',
        userId: 'user-1',
      })
    ).toEqual({ allowed: false, reason: 'profile_loading' });
  });

  it('يرفض profile_error', () => {
    expect(
      decide('access_student_experience', {
        status: 'profile_error',
        error: { code: 'missing_profile', message: 'ملف مفقود' },
      })
    ).toEqual({ allowed: false, reason: 'profile_error' });
  });

  it('يرفض pending', () => {
    expect(
      decide('access_student_experience', {
        status: 'pending',
        profile: profile('student', 'pending'),
      })
    ).toEqual({ allowed: false, reason: 'account_pending' });
  });

  it('يرفض suspended', () => {
    expect(
      decide('access_student_experience', {
        status: 'suspended',
        profile: profile('student', 'suspended'),
      })
    ).toEqual({ allowed: false, reason: 'account_suspended' });
  });

  it.each(['student', 'teacher', 'reviewer'] as const)(
    'يسمح للدور النشط %s بدخول تجربة الطالب',
    (role: UserRole) => {
      expect(decide('access_student_experience', authorized(role))).toEqual({
        allowed: true,
        reason: 'allowed',
      });
    }
  );

  it('يرفض الطالب من مساحة المعلم', () => {
    expect(decide('access_teacher_workspace', authorized('student'))).toEqual({
      allowed: false,
      reason: 'role_not_allowed',
    });
  });

  it('يسمح للمعلم النشط بمساحة المعلم', () => {
    expect(decide('access_teacher_workspace', authorized('teacher'))).toEqual({
      allowed: true,
      reason: 'allowed',
    });
  });

  it('يرفض المراجع من مساحة المعلم', () => {
    expect(decide('access_teacher_workspace', authorized('reviewer'))).toEqual({
      allowed: false,
      reason: 'role_not_allowed',
    });
  });

  it('يسمح للمراجع النشط بمساحة المراجع', () => {
    expect(decide('access_reviewer_workspace', authorized('reviewer'))).toEqual({
      allowed: true,
      reason: 'allowed',
    });
  });

  it('يرفض المعلم من مساحة المراجع', () => {
    expect(decide('access_reviewer_workspace', authorized('teacher'))).toEqual({
      allowed: false,
      reason: 'role_not_allowed',
    });
  });

  it('يرفض الطالب من مساحة المراجع', () => {
    expect(decide('access_reviewer_workspace', authorized('student'))).toEqual({
      allowed: false,
      reason: 'role_not_allowed',
    });
  });

  it.each(['student', 'teacher', 'reviewer'] as const)(
    'يعيد operation_not_available لعملية التأليف عند الدور %s',
    (role: UserRole) => {
      expect(decide('author_content', authorized(role))).toEqual({
        allowed: false,
        reason: 'operation_not_available',
      });
    }
  );

  it.each(['student', 'teacher', 'reviewer'] as const)(
    'يعيد operation_not_available لعملية المراجعة عند الدور %s',
    (role: UserRole) => {
      expect(decide('review_content', authorized(role))).toEqual({
        allowed: false,
        reason: 'operation_not_available',
      });
    }
  );

  it('لا يسمح لدور المعلم بتجاوز pending', () => {
    expect(
      decide('access_teacher_workspace', {
        status: 'pending',
        profile: profile('teacher', 'pending'),
      })
    ).toEqual({ allowed: false, reason: 'account_pending' });
  });

  it('لا يسمح لدور المراجع بتجاوز suspended', () => {
    expect(
      decide('access_reviewer_workspace', {
        status: 'suspended',
        profile: profile('reviewer', 'suspended'),
      })
    ).toEqual({ allowed: false, reason: 'account_suspended' });
  });

  it('يفشل مغلقًا عند حالة Auth غير معروفة وقت التشغيل', () => {
    const unknownAuth = { status: 'unexpected' } as unknown as AuthState;

    expect(
      authorizeOperation(unknownAuth, authorized('student'), 'access_student_experience')
    ).toEqual({ allowed: false, reason: 'session_error' });
  });

  it('يفشل مغلقًا عند AuthorizationState غير معروفة وقت التشغيل', () => {
    const unknownAuthorization = {
      status: 'unexpected',
    } as unknown as AuthorizationState;

    expect(decide('access_student_experience', unknownAuthorization)).toEqual({
      allowed: false,
      reason: 'profile_error',
    });
  });

  it('يفشل مغلقًا عند عملية غير معروفة وقت التشغيل', () => {
    const unknownOperation = 'delete_everything' as AuthorizationOperation;

    expect(decide(unknownOperation, authorized('teacher'))).toEqual({
      allowed: false,
      reason: 'operation_not_available',
    });
  });
});

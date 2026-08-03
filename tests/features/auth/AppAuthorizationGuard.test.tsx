// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContent } from '../../../src/App';
import type { AuthSessionContextValue } from '@features/auth/useAuthSession';
import { useAuthSession } from '@features/auth/useAuthSession';
import { authorizeOperation } from '@services/auth/authorization.policy';
import type { UserRole } from '@services/auth/authorization.types';

vi.mock('@features/auth/useAuthSession', () => ({ useAuthSession: vi.fn() }));
vi.mock('@services/auth/authorization.policy', () => ({
  authorizeOperation: vi.fn(),
}));

vi.mock('@features/student/grade-selection/GradeSelection', () => ({
  GradeSelection: () => <div>تجربة الطالب المحلية</div>,
}));
vi.mock('@features/student/semester-selection/SemesterSelection', () => ({
  SemesterSelection: () => <div>الفصل</div>,
}));
vi.mock('@features/student/subject-selection/SubjectSelection', () => ({
  SubjectSelection: () => <div>المادة</div>,
}));
vi.mock('@features/student/unit-selection/UnitSelection', () => ({
  UnitSelection: () => <div>الوحدة</div>,
}));
vi.mock('@features/student/lesson-list/LessonList', () => ({
  LessonList: () => <div>الدروس</div>,
}));
vi.mock('@features/student/lesson-view/LessonView', () => ({
  LessonView: () => <div>الدرس</div>,
}));
vi.mock('@features/student/review-questions/ReviewQuestionsView', () => ({
  ReviewQuestionsView: () => <div>المراجعة</div>,
}));
vi.mock('@features/games/matching/MatchingGameView', () => ({
  MatchingGameView: () => <div>اللعبة</div>,
}));
vi.mock('@features/mastery/MasteryTestView', () => ({
  MasteryTestView: () => <div>الاختبار</div>,
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedAuthorizeOperation = vi.mocked(authorizeOperation);

function baseSession(overrides: Partial<AuthSessionContextValue> = {}): AuthSessionContextValue {
  return {
    authState: { status: 'guest' },
    authorizationState: null,
    entryMode: 'closed',
    confirmationEmail: null,
    openSignIn: vi.fn(),
    openSignUp: vi.fn(),
    closeAuthEntry: vi.fn(),
    signIn: vi.fn(async () => ({
      status: 'error',
      error: { code: 'unknown', message: 'خطأ' },
    })),
    signUp: vi.fn(async () => ({
      status: 'error',
      error: { code: 'unknown', message: 'خطأ' },
    })),
    signOut: vi.fn(async () => ({ status: 'guest' })),
    refreshAuthorization: vi.fn(async () => undefined),
    retrySession: vi.fn(async () => undefined),
    ...overrides,
  };
}

function userProfile(role: UserRole, status: 'active' | 'pending' | 'suspended' = 'active') {
  return {
    id: `user-${role}`,
    displayName: null,
    role,
    status,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
  } as const;
}

function activeSession(role: UserRole): AuthSessionContextValue {
  const user = {
    id: `user-${role}`,
    email: `${role}@example.com`,
    emailConfirmedAt: '2026-08-03T00:00:00.000Z',
  };

  return baseSession({
    authState: {
      status: 'authenticated',
      user,
      session: { expiresAt: null, user },
    },
    authorizationState: {
      status: 'authorized',
      profile: userProfile(role),
    },
  });
}

beforeEach(() => {
  mockedUseAuthSession.mockReset();
  mockedAuthorizeOperation.mockReset();
});

describe('App authorization guard', () => {
  it('يعرض تجربة الزائر المحلية دون استدعاء محرك الصلاحيات', () => {
    mockedUseAuthSession.mockReturnValue(baseSession());
    mockedAuthorizeOperation.mockImplementation(() => {
      throw new Error('لا يجب استدعاء المحرك لمسار الزائر');
    });

    render(<AppContent />);

    expect(screen.getByText('تجربة الطالب المحلية')).toBeInTheDocument();
    expect(mockedAuthorizeOperation).not.toHaveBeenCalled();
  });

  it.each(['student', 'teacher', 'reviewer'] as const)(
    'يمرر الحساب النشط %s عبر RequireCapability',
    (role: UserRole) => {
      const session = activeSession(role);
      mockedUseAuthSession.mockReturnValue(session);
      mockedAuthorizeOperation.mockReturnValue({ allowed: true, reason: 'allowed' });

      render(<AppContent />);

      expect(screen.getByText('تجربة الطالب المحلية')).toBeInTheDocument();
      expect(mockedAuthorizeOperation).toHaveBeenCalledWith(
        session.authState,
        session.authorizationState,
        'access_student_experience'
      );
    }
  );

  it('لا يعرض تجربة الطالب إذا رفض المحرك الحساب النشط', () => {
    mockedUseAuthSession.mockReturnValue(activeSession('student'));
    mockedAuthorizeOperation.mockReturnValue({
      allowed: false,
      reason: 'role_not_allowed',
    });

    render(<AppContent />);

    expect(screen.queryByText('تجربة الطالب المحلية')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('لا يملك هذا الحساب صلاحية');
  });

  it('لا يمرر pending إلى الحارس', () => {
    const session = activeSession('teacher');
    mockedUseAuthSession.mockReturnValue(
      baseSession({
        authState: session.authState,
        authorizationState: {
          status: 'pending',
          profile: userProfile('teacher', 'pending'),
        },
      })
    );

    render(<AppContent />);

    expect(screen.getByText('الحساب في انتظار التفعيل')).toBeInTheDocument();
    expect(mockedAuthorizeOperation).not.toHaveBeenCalled();
  });

  it('لا يمرر suspended إلى الحارس', () => {
    const session = activeSession('reviewer');
    mockedUseAuthSession.mockReturnValue(
      baseSession({
        authState: session.authState,
        authorizationState: {
          status: 'suspended',
          profile: userProfile('reviewer', 'suspended'),
        },
      })
    );

    render(<AppContent />);

    expect(screen.getByText('الحساب موقوف')).toBeInTheDocument();
    expect(mockedAuthorizeOperation).not.toHaveBeenCalled();
  });

  it('لا يمرر profile_error إلى الحارس', () => {
    const session = activeSession('student');
    mockedUseAuthSession.mockReturnValue(
      baseSession({
        authState: session.authState,
        authorizationState: {
          status: 'profile_error',
          error: { code: 'missing_profile', message: 'ملف مفقود' },
        },
      })
    );

    render(<AppContent />);

    expect(screen.getByText('تعذر قراءة بيانات الحساب')).toBeInTheDocument();
    expect(mockedAuthorizeOperation).not.toHaveBeenCalled();
  });

  it('يعرض session_error قبل الحارس', () => {
    mockedUseAuthSession.mockReturnValue(
      baseSession({
        authState: {
          status: 'error',
          error: { code: 'network_error', message: 'تعذر الاتصال' },
        },
      })
    );

    render(<AppContent />);

    expect(screen.getByText('تعذر استعادة الجلسة')).toBeInTheDocument();
    expect(mockedAuthorizeOperation).not.toHaveBeenCalled();
  });

  it('يحذف متغير authorized القديم ويستخدم RequireCapability مرة واحدة', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).not.toMatch(/const\s+authorized\s*=/);
    expect(source).not.toMatch(/showStudentExperience/);
    expect(
      source.match(/<RequireCapability\s+operation="access_student_experience">/g)
    ).toHaveLength(1);
  });

  it('يبقي مسار Guest خارج RequireCapability في المصدر الفعلي', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('showGuestExperience');
    expect(source).toContain(
      'showGuestExperience ? <StudentExperience step={step} setStep={setStep} /> : null'
    );
  });

  it('يبقي اتحاد Step خاليًا من حالات الصلاحيات', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).not.toMatch(/name:\s*['"]access_denied['"]/);
    expect(source).not.toMatch(/name:\s*['"]teacher_workspace['"]/);
    expect(source).not.toMatch(/name:\s*['"]reviewer_workspace['"]/);
    expect(source).not.toMatch(/name:\s*['"]pending['"]/);
    expect(source).not.toMatch(/name:\s*['"]suspended['"]/);
  });
});

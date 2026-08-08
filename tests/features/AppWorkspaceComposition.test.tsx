// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContent } from '../../src/App';
import type { AuthSessionContextValue } from '@features/auth/useAuthSession';
import { useAuthSession } from '@features/auth/useAuthSession';
import type { UserRole } from '@services/auth/authorization.types';

const workspaceSpies = vi.hoisted(() => ({
  teacher: vi.fn(),
  reviewer: vi.fn(),
}));

vi.mock('@features/auth/useAuthSession', () => ({ useAuthSession: vi.fn() }));

vi.mock('@features/teacher/workspace', () => ({
  TeacherWorkspace: () => {
    workspaceSpies.teacher();
    return <div>لوحة المعلم التجريبية</div>;
  },
}));

vi.mock('@features/reviewer/workspace', () => ({
  ReviewerWorkspace: () => {
    workspaceSpies.reviewer();
    return <div>لوحة المراجع التجريبية</div>;
  },
}));

vi.mock('@features/student/grade-selection/GradeSelection', () => ({
  GradeSelection: ({ onSelectGrade }: { onSelectGrade: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectGrade('grade-10')}>
      الصف التجريبي
    </button>
  ),
}));
vi.mock('@features/student/semester-selection/SemesterSelection', () => ({
  SemesterSelection: ({ onSelectSemester }: { onSelectSemester: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectSemester('semester-1')}>
      الفصل التجريبي
    </button>
  ),
}));
vi.mock('@features/student/subject-selection/SubjectSelection', () => ({
  SubjectSelection: ({ onSelectSubject }: { onSelectSubject: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectSubject('physics')}>
      المادة التجريبية
    </button>
  ),
}));
vi.mock('@features/student/unit-selection/UnitSelection', () => ({
  UnitSelection: ({ onSelectUnit }: { onSelectUnit: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectUnit('waves')}>
      الوحدة التجريبية
    </button>
  ),
}));
vi.mock('@features/student/lesson-list/LessonList', () => ({
  LessonList: ({ onSelectLesson }: { onSelectLesson: (id: string) => void }) => (
    <button type="button" onClick={() => onSelectLesson('lesson-3')}>
      الدرس الثالث
    </button>
  ),
}));
vi.mock('@features/student/lesson-view/LessonView', () => ({
  LessonView: ({ lessonId }: { lessonId: string }) => <div>صفحة الدرس {lessonId}</div>,
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
      profile: {
        id: user.id,
        displayName: null,
        role,
        status: 'active',
        createdAt: '2026-08-03T00:00:00.000Z',
        updatedAt: '2026-08-03T00:00:00.000Z',
      },
    },
  });
}

function reachLesson() {
  fireEvent.click(screen.getByRole('button', { name: 'الصف التجريبي' }));
  fireEvent.click(screen.getByRole('button', { name: 'الفصل التجريبي' }));
  fireEvent.click(screen.getByRole('button', { name: 'المادة التجريبية' }));
  fireEvent.click(screen.getByRole('button', { name: 'الوحدة التجريبية' }));
  fireEvent.click(screen.getByRole('button', { name: 'الدرس الثالث' }));
  expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
}

beforeEach(() => {
  mockedUseAuthSession.mockReset();
  workspaceSpies.teacher.mockReset();
  workspaceSpies.reviewer.mockReset();
});

describe('App workspace authorization composition', () => {
  it('يبقي الطالب النشط في تجربة الطالب ولا يعرض أو يشغّل أي مساحة عمل', () => {
    mockedUseAuthSession.mockReturnValue(activeSession('student'));

    render(<AppContent />);

    expect(screen.getByRole('button', { name: 'الصف التجريبي' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مساحة المعلم' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مساحة المراجع' })).not.toBeInTheDocument();
    expect(workspaceSpies.teacher).not.toHaveBeenCalled();
    expect(workspaceSpies.reviewer).not.toHaveBeenCalled();
  });

  it('يفتح للمعلم النشط مساحة المعلم فقط ولا يشغّل مساحة المراجع', () => {
    mockedUseAuthSession.mockReturnValue(activeSession('teacher'));

    render(<AppContent />);

    expect(screen.getByRole('button', { name: 'مساحة المعلم' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مساحة المراجع' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'مساحة المعلم' }));

    expect(screen.getByText('لوحة المعلم التجريبية')).toBeInTheDocument();
    expect(screen.queryByText('لوحة المراجع التجريبية')).not.toBeInTheDocument();
    expect(workspaceSpies.teacher).toHaveBeenCalledTimes(1);
    expect(workspaceSpies.reviewer).not.toHaveBeenCalled();
  });

  it('يفتح للمراجع النشط مساحة المراجع فقط ولا يشغّل مساحة المعلم', () => {
    mockedUseAuthSession.mockReturnValue(activeSession('reviewer'));

    render(<AppContent />);

    expect(screen.queryByRole('button', { name: 'مساحة المعلم' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مساحة المراجع' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'مساحة المراجع' }));

    expect(screen.getByText('لوحة المراجع التجريبية')).toBeInTheDocument();
    expect(screen.queryByText('لوحة المعلم التجريبية')).not.toBeInTheDocument();
    expect(workspaceSpies.reviewer).toHaveBeenCalledTimes(1);
    expect(workspaceSpies.teacher).not.toHaveBeenCalled();
  });

  it('يحفظ Step نفسها عند دخول المعلم مساحة المعلم ثم العودة إلى التعلم', () => {
    mockedUseAuthSession.mockReturnValue(activeSession('teacher'));

    render(<AppContent />);
    reachLesson();

    fireEvent.click(screen.getByRole('button', { name: 'مساحة المعلم' }));
    expect(screen.getByText('لوحة المعلم التجريبية')).toBeInTheDocument();
    expect(screen.queryByText('صفحة الدرس lesson-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى التعلم' }));
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it('يحفظ Step نفسها عند دخول المراجع مساحة المراجع ثم العودة إلى التعلم', () => {
    mockedUseAuthSession.mockReturnValue(activeSession('reviewer'));

    render(<AppContent />);
    reachLesson();

    fireEvent.click(screen.getByRole('button', { name: 'مساحة المراجع' }));
    expect(screen.getByText('لوحة المراجع التجريبية')).toBeInTheDocument();
    expect(screen.queryByText('صفحة الدرس lesson-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى التعلم' }));
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it.each([
    ['teacher', 'مساحة المعلم', 'لوحة المعلم التجريبية', 'teacher'],
    ['reviewer', 'مساحة المراجع', 'لوحة المراجع التجريبية', 'reviewer'],
  ] as const)(
    'يعيد تقييم الحارس ويزيل مساحة %s إذا زالت صلاحيتها أثناء بقائها السطح النشط',
    (role, entryLabel, workspaceLabel, spyKey) => {
      let session = activeSession(role);
      mockedUseAuthSession.mockImplementation(() => session);

      const view = render(<AppContent />);
      fireEvent.click(screen.getByRole('button', { name: entryLabel }));

      expect(screen.getByText(workspaceLabel)).toBeInTheDocument();
      expect(workspaceSpies[spyKey]).toHaveBeenCalledTimes(1);

      session = activeSession('student');
      view.rerender(<AppContent />);

      expect(screen.queryByText(workspaceLabel)).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('لا يملك هذا الحساب صلاحية');
      expect(screen.getByRole('button', { name: 'العودة إلى التعلم' })).toBeInTheDocument();
      expect(workspaceSpies[spyKey]).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    ['teacher', 'مساحة المعلم'],
    ['reviewer', 'مساحة المراجع'],
  ] as const)(
    'العودة من مساحة %s تغيّر سطح العرض فقط دون تسجيل خروج أو تحديث صلاحيات أو جلسة',
    (role, entryLabel) => {
      const session = activeSession(role);
      mockedUseAuthSession.mockReturnValue(session);

      render(<AppContent />);
      reachLesson();
      fireEvent.click(screen.getByRole('button', { name: entryLabel }));
      fireEvent.click(screen.getByRole('button', { name: 'العودة إلى التعلم' }));

      expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
      expect(session.signOut).not.toHaveBeenCalled();
      expect(session.refreshAuthorization).not.toHaveBeenCalled();
      expect(session.retrySession).not.toHaveBeenCalled();
    }
  );

  it('يبقي مسار الزائر محليًا بلا نقاط دخول لمساحات العمل', () => {
    mockedUseAuthSession.mockReturnValue(baseSession());

    render(<AppContent />);

    expect(screen.getByRole('button', { name: 'الصف التجريبي' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مساحة المعلم' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'مساحة المراجع' })).not.toBeInTheDocument();
    expect(workspaceSpies.teacher).not.toHaveBeenCalled();
    expect(workspaceSpies.reviewer).not.toHaveBeenCalled();
  });
});

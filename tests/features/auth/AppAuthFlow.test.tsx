// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContent } from '../../../src/App';
import type { AuthSessionContextValue } from '@features/auth/useAuthSession';
import { useAuthSession } from '@features/auth/useAuthSession';

vi.mock('@features/auth/useAuthSession', () => ({ useAuthSession: vi.fn() }));

vi.mock('@features/student/grade-selection/GradeSelection', () => ({
  GradeSelection: ({ onSelectGrade }: { onSelectGrade: (id: string) => void }) => <button onClick={() => onSelectGrade('grade-10')}>الصف التجريبي</button>,
}));
vi.mock('@features/student/semester-selection/SemesterSelection', () => ({
  SemesterSelection: ({ onSelectSemester }: { onSelectSemester: (id: string) => void }) => <button onClick={() => onSelectSemester('semester-1')}>الفصل التجريبي</button>,
}));
vi.mock('@features/student/subject-selection/SubjectSelection', () => ({
  SubjectSelection: ({ onSelectSubject }: { onSelectSubject: (id: string) => void }) => <button onClick={() => onSelectSubject('physics')}>المادة التجريبية</button>,
}));
vi.mock('@features/student/unit-selection/UnitSelection', () => ({
  UnitSelection: ({ onSelectUnit }: { onSelectUnit: (id: string) => void }) => <button onClick={() => onSelectUnit('waves')}>الوحدة التجريبية</button>,
}));
vi.mock('@features/student/lesson-list/LessonList', () => ({
  LessonList: ({ onSelectLesson }: { onSelectLesson: (id: string) => void }) => <button onClick={() => onSelectLesson('lesson-3')}>الدرس الثالث</button>,
}));
vi.mock('@features/student/lesson-view/LessonView', () => ({
  LessonView: ({ lessonId }: { lessonId: string }) => <div>صفحة الدرس {lessonId}</div>,
}));
vi.mock('@features/student/review-questions/ReviewQuestionsView', () => ({ ReviewQuestionsView: () => <div>مراجعة</div> }));
vi.mock('@features/games/matching/MatchingGameView', () => ({ MatchingGameView: () => <div>لعبة</div> }));
vi.mock('@features/mastery/MasteryTestView', () => ({ MasteryTestView: () => <div>اختبار</div> }));

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
    signIn: vi.fn(async () => ({ status: 'error', error: { code: 'unknown', message: 'خطأ' } })),
    signUp: vi.fn(async () => ({ status: 'error', error: { code: 'unknown', message: 'خطأ' } })),
    signOut: vi.fn(async () => ({ status: 'guest' })),
    refreshAuthorization: vi.fn(async () => undefined),
    retrySession: vi.fn(async () => undefined),
    ...overrides,
  };
}

function reachLesson() {
  fireEvent.click(screen.getByRole('button', { name: 'الصف التجريبي' }));
  fireEvent.click(screen.getByRole('button', { name: 'الفصل التجريبي' }));
  fireEvent.click(screen.getByRole('button', { name: 'المادة التجريبية' }));
  fireEvent.click(screen.getByRole('button', { name: 'الوحدة التجريبية' }));
  fireEvent.click(screen.getByRole('button', { name: 'الدرس الثالث' }));
  expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
}

beforeEach(() => mockedUseAuthSession.mockReset());

describe('App auth flow', () => {
  it('يحافظ على اتجاه RTL على غلاف التطبيق', () => {
    mockedUseAuthSession.mockReturnValue(baseSession());
    const view = render(<AppContent />);

    expect(view.container.firstElementChild).toHaveAttribute('dir', 'rtl');
  });

  it('لا يعرض تجربة الطالب أثناء booting', () => {
    mockedUseAuthSession.mockReturnValue(baseSession({ authState: { status: 'loading' } }));
    render(<AppContent />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تجهيز حسابك');
    expect(screen.queryByText('الصف التجريبي')).not.toBeInTheDocument();
  });

  it('لا يعرض تجربة الطالب أثناء loading_profile', () => {
    mockedUseAuthSession.mockReturnValue(baseSession({
      authState: { status: 'authenticated', user: { id: 'u', email: null, emailConfirmedAt: null }, session: { expiresAt: null, user: { id: 'u', email: null, emailConfirmedAt: null } } },
      authorizationState: { status: 'loading_profile', userId: 'u' },
    }));
    render(<AppContent />);
    expect(screen.queryByText('الصف التجريبي')).not.toBeInTheDocument();
  });

  it('يحفظ Step عند فتح تسجيل الدخول ثم الإلغاء', () => {
    let session = baseSession();
    mockedUseAuthSession.mockImplementation(() => session);
    const view = render(<AppContent />);
    reachLesson();

    session = baseSession({ entryMode: 'sign_in' });
    view.rerender(<AppContent />);
    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.queryByText('صفحة الدرس lesson-3')).not.toBeInTheDocument();

    session = baseSession();
    view.rerender(<AppContent />);
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it('لا يغير Step عند الانتقال بين تسجيل الدخول وإنشاء الحساب', () => {
    let session = baseSession();
    mockedUseAuthSession.mockImplementation(() => session);
    const view = render(<AppContent />);
    reachLesson();

    session = baseSession({ entryMode: 'sign_in' });
    view.rerender(<AppContent />);
    session = baseSession({ entryMode: 'sign_up' });
    view.rerender(<AppContent />);
    expect(screen.getByRole('heading', { name: 'إنشاء حساب' })).toBeInTheDocument();

    session = baseSession();
    view.rerender(<AppContent />);
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it('يستأنف الموضع نفسه بعد دخول حساب active', () => {
    let session = baseSession();
    mockedUseAuthSession.mockImplementation(() => session);
    const view = render(<AppContent />);
    reachLesson();

    session = baseSession({ entryMode: 'sign_in' });
    view.rerender(<AppContent />);
    session = baseSession({
      authState: { status: 'authenticated', user: { id: 'u', email: 'u@example.com', emailConfirmedAt: null }, session: { expiresAt: null, user: { id: 'u', email: 'u@example.com', emailConfirmedAt: null } } },
      authorizationState: { status: 'authorized', profile: { id: 'u', displayName: null, role: 'student', status: 'active', createdAt: 'x', updatedAt: 'x' } },
    });
    view.rerender(<AppContent />);
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it('يعيد المستخدم إلى وضع الزائر مع الموضع نفسه بعد تسجيل الخروج', () => {
    let session = baseSession();
    mockedUseAuthSession.mockImplementation(() => session);
    const view = render(<AppContent />);
    reachLesson();

    session = baseSession({
      authState: { status: 'authenticated', user: { id: 'u', email: 'u@example.com', emailConfirmedAt: null }, session: { expiresAt: null, user: { id: 'u', email: 'u@example.com', emailConfirmedAt: null } } },
      authorizationState: { status: 'authorized', profile: { id: 'u', displayName: null, role: 'student', status: 'active', createdAt: 'x', updatedAt: 'x' } },
    });
    view.rerender(<AppContent />);
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();

    session = baseSession();
    view.rerender(<AppContent />);
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it('يخفي تجربة الطالب في pending دون مسح Step', () => {
    let session = baseSession();
    mockedUseAuthSession.mockImplementation(() => session);
    const view = render(<AppContent />);
    reachLesson();

    session = baseSession({
      authState: { status: 'authenticated', user: { id: 'u', email: null, emailConfirmedAt: null }, session: { expiresAt: null, user: { id: 'u', email: null, emailConfirmedAt: null } } },
      authorizationState: { status: 'pending', profile: { id: 'u', displayName: null, role: 'student', status: 'pending', createdAt: 'x', updatedAt: 'x' } },
    });
    view.rerender(<AppContent />);
    expect(screen.getByText('الحساب في انتظار التفعيل')).toBeInTheDocument();

    session = baseSession();
    view.rerender(<AppContent />);
    expect(screen.getByText('صفحة الدرس lesson-3')).toBeInTheDocument();
  });

  it('يعرض شاشة تأكيد البريد دون إظهار تجربة الطالب', () => {
    mockedUseAuthSession.mockReturnValue(baseSession({
      entryMode: 'confirmation_required',
      confirmationEmail: 'new@example.com',
    }));
    render(<AppContent />);

    expect(screen.getByText('راجع بريدك الإلكتروني')).toBeInTheDocument();
    expect(screen.getByText('new@example.com')).toBeInTheDocument();
    expect(screen.queryByText('الصف التجريبي')).not.toBeInTheDocument();
  });

  it('لا يضيف حالات Auth إلى آلة Step التعليمية', async () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(source).not.toMatch(/name:\s*['"]sign_in['"]/);
    expect(source).not.toMatch(/name:\s*['"]pending['"]/);
    expect(source).not.toMatch(/name:\s*['"]suspended['"]/);
  });
});

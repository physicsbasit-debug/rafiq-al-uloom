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
  GradeSelection: ({ onSelectGrade }: { onSelectGrade: (id: string) => void }) => (
    <button onClick={() => onSelectGrade('grade-10')}>الصف التجريبي</button>
  ),
}));
vi.mock('@features/student/semester-selection/SemesterSelection', () => ({
  SemesterSelection: ({ onSelectSemester }: { onSelectSemester: (id: string) => void }) => (
    <button onClick={() => onSelectSemester('semester-1')}>الفصل التجريبي</button>
  ),
}));
vi.mock('@features/student/subject-selection/SubjectSelection', () => ({
  SubjectSelection: ({ onSelectSubject }: { onSelectSubject: (id: string) => void }) => (
    <button onClick={() => onSelectSubject('physics')}>المادة التجريبية</button>
  ),
}));
vi.mock('@features/student/unit-selection/UnitSelection', () => ({
  UnitSelection: ({ onSelectUnit }: { onSelectUnit: (id: string) => void }) => (
    <button onClick={() => onSelectUnit('waves')}>الوحدة التجريبية</button>
  ),
}));
vi.mock('@features/student/lesson-list/LessonList', () => ({
  LessonList: ({ onSelectLesson }: { onSelectLesson: (id: string) => void }) => (
    <button onClick={() => onSelectLesson('lesson-3')}>الدرس الثالث</button>
  ),
}));
vi.mock('@features/student/lesson-view/LessonView', () => ({
  LessonView: ({ lessonId }: { lessonId: string }) => <div>صفحة الدرس {lessonId}</div>,
}));
vi.mock('@features/student/review-questions/ReviewQuestionsView', () => ({
  ReviewQuestionsView: () => <div>مراجعة</div>,
}));
vi.mock('@features/games/matching/MatchingGameView', () => ({
  MatchingGameView: () => <div>لعبة</div>,
}));
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

beforeEach(() => mockedUseAuthSession.mockReset());

describe('App accountless student flow', () => {
  it('يحافظ على اتجاه RTL على غلاف التطبيق', () => {
    mockedUseAuthSession.mockReturnValue(baseSession());
    const view = render(<AppContent />);
    expect(view.container.firstElementChild).toHaveAttribute('dir', 'rtl');
  });

  it('يعرض بوابة الطالب بلا بريد أو كلمة مرور', () => {
    mockedUseAuthSession.mockReturnValue(baseSession());
    render(<AppContent />);

    expect(screen.getByRole('heading', { name: 'رفيق العلوم' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ابدأ التعلّم' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دخول الكادر التعليمي' })).toBeInTheDocument();
    expect(screen.queryByLabelText('البريد الإلكتروني')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('كلمة المرور')).not.toBeInTheDocument();
    expect(screen.queryByText('الصف التجريبي')).not.toBeInTheDocument();
  });

  it('يبدأ تجربة الطالب مباشرة بلا مصادقة', () => {
    mockedUseAuthSession.mockReturnValue(baseSession());
    render(<AppContent />);

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ التعلّم' }));

    expect(screen.getByRole('button', { name: 'الصف التجريبي' })).toBeInTheDocument();
  });

  it('يفتح تسجيل دخول الكادر التعليمي فقط عند الطلب', () => {
    let session = baseSession();
    mockedUseAuthSession.mockImplementation(() => session);
    const view = render(<AppContent />);

    const openSignIn = vi.mocked(session.openSignIn);
    fireEvent.click(screen.getByRole('button', { name: 'دخول الكادر التعليمي' }));
    expect(openSignIn).toHaveBeenCalledTimes(1);

    session = baseSession({ entryMode: 'sign_in' });
    view.rerender(<AppContent />);

    expect(screen.getByRole('heading', { name: 'تسجيل دخول الكادر التعليمي' })).toBeInTheDocument();
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إنشاء حساب جديد' })).not.toBeInTheDocument();
  });

  it('لا يعرض تجربة الطالب أثناء booting', () => {
    mockedUseAuthSession.mockReturnValue(baseSession({ authState: { status: 'loading' } }));
    render(<AppContent />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تجهيز حسابك');
    expect(screen.queryByText('الصف التجريبي')).not.toBeInTheDocument();
  });

  it('لا يضيف حالات Auth إلى آلة Step التعليمية', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(source).not.toMatch(/name:\s*['"]sign_in['"]/);
    expect(source).not.toMatch(/name:\s*['"]pending['"]/);
    expect(source).not.toMatch(/name:\s*['"]suspended['"]/);
  });
});

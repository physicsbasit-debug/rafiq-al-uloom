// @vitest-environment jsdom

import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequireCapability } from '@features/auth/RequireCapability';
import { useAuthorizationDecision } from '@features/auth/useAuthorizationDecision';

vi.mock('@features/auth/useAuthorizationDecision', () => ({
  useAuthorizationDecision: vi.fn(),
}));

const mockedUseAuthorizationDecision = vi.mocked(useAuthorizationDecision);

beforeEach(() => {
  mockedUseAuthorizationDecision.mockReset();
});

describe('RequireCapability', () => {
  it('يعرض children عند السماح', () => {
    mockedUseAuthorizationDecision.mockReturnValue({ allowed: true, reason: 'allowed' });

    render(
      <RequireCapability operation="access_student_experience">
        <div>المحتوى المحمي</div>
      </RequireCapability>
    );

    expect(screen.getByText('المحتوى المحمي')).toBeInTheDocument();
  });

  it('لا يعرض children عند المنع', () => {
    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'role_not_allowed',
    });

    render(
      <RequireCapability operation="access_teacher_workspace">
        <div>مساحة المعلم</div>
      </RequireCapability>
    );

    expect(screen.queryByText('مساحة المعلم')).not.toBeInTheDocument();
  });

  it('يعرض fallback المخصص عند المنع', () => {
    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'account_pending',
    });

    render(
      <RequireCapability operation="access_student_experience" fallback={<div>واجهة بديلة</div>}>
        <div>المحتوى</div>
      </RequireCapability>
    );

    expect(screen.getByText('واجهة بديلة')).toBeInTheDocument();
    expect(screen.queryByText('المحتوى')).not.toBeInTheDocument();
  });

  it('يعرض fallback افتراضيًا واضحًا', () => {
    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'operation_not_available',
    });

    render(
      <RequireCapability operation="author_content">
        <div>التأليف</div>
      </RequireCapability>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('هذه الميزة غير متاحة بعد');
  });

  it('لا يشغّل Effects داخل child محظور', () => {
    const effect = vi.fn();

    function ProtectedChild() {
      useEffect(effect, []);
      return <div>طفل محمي</div>;
    }

    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'account_suspended',
    });

    render(
      <RequireCapability operation="access_student_experience">
        <ProtectedChild />
      </RequireCapability>
    );

    expect(effect).not.toHaveBeenCalled();
    expect(screen.queryByText('طفل محمي')).not.toBeInTheDocument();
  });

  it('يعيد التقييم عند تغير القرار إلى السماح', () => {
    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'profile_loading',
    });

    const view = render(
      <RequireCapability operation="access_student_experience">
        <div>التجربة</div>
      </RequireCapability>
    );

    expect(screen.queryByText('التجربة')).not.toBeInTheDocument();

    mockedUseAuthorizationDecision.mockReturnValue({ allowed: true, reason: 'allowed' });
    view.rerender(
      <RequireCapability operation="access_student_experience">
        <div>التجربة</div>
      </RequireCapability>
    );

    expect(screen.getByText('التجربة')).toBeInTheDocument();
  });

  it('يعيد التقييم عند تغير القرار إلى المنع', () => {
    mockedUseAuthorizationDecision.mockReturnValue({ allowed: true, reason: 'allowed' });

    const view = render(
      <RequireCapability operation="access_student_experience">
        <div>التجربة</div>
      </RequireCapability>
    );

    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'account_suspended',
    });
    view.rerender(
      <RequireCapability operation="access_student_experience">
        <div>التجربة</div>
      </RequireCapability>
    );

    expect(screen.queryByText('التجربة')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('الحساب موقوف');
  });

  it('يمرر العملية نفسها إلى hook المركزي', () => {
    mockedUseAuthorizationDecision.mockReturnValue({ allowed: true, reason: 'allowed' });

    render(
      <RequireCapability operation="access_reviewer_workspace">
        <div>المراجعة</div>
      </RequireCapability>
    );

    expect(mockedUseAuthorizationDecision).toHaveBeenCalledWith('access_reviewer_workspace');
  });

  it('يرفض Guest دفاعيًا إذا وصل إلى الحارس', () => {
    mockedUseAuthorizationDecision.mockReturnValue({ allowed: false, reason: 'guest' });

    render(
      <RequireCapability operation="access_student_experience">
        <div>التجربة</div>
      </RequireCapability>
    );

    expect(screen.queryByText('التجربة')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('تتطلب حسابًا نشطًا');
  });

  it('يرفض session_error دون عرض المحتوى', () => {
    mockedUseAuthorizationDecision.mockReturnValue({
      allowed: false,
      reason: 'session_error',
    });

    render(
      <RequireCapability operation="access_student_experience">
        <div>التجربة</div>
      </RequireCapability>
    );

    expect(screen.queryByText('التجربة')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر التحقق من جلسة الحساب');
  });
});

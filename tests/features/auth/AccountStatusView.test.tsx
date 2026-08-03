// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountStatusView } from '@features/auth/AccountStatusView';

const signOut = vi.fn(async () => ({ status: 'guest' as const }));
const retry = vi.fn(async () => undefined);

function profile(status: 'pending' | 'suspended') {
  return {
    id: 'user-1',
    displayName: null,
    role: 'student' as const,
    status,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
  };
}

beforeEach(() => {
  signOut.mockClear();
  retry.mockClear();
});

describe('AccountStatusView', () => {
  it('يعرض حالة التحميل دون تجربة الطالب أو أزرار تشغيلية', () => {
    render(
      <AccountStatusView
        state={{ status: 'session_loading' }}
        onRetry={retry}
        onSignOut={signOut}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تجهيز حسابك');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('يعرض pending مع إعادة المحاولة وتسجيل الخروج', async () => {
    render(
      <AccountStatusView
        state={{ status: 'pending', profile: profile('pending') }}
        onRetry={retry}
        onSignOut={signOut}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('لا يعرض إعادة المحاولة للحساب الموقوف', () => {
    render(
      <AccountStatusView
        state={{ status: 'suspended', profile: profile('suspended') }}
        onRetry={retry}
        onSignOut={signOut}
      />
    );

    expect(screen.getByText('الحساب موقوف')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
  });

  it('يعرض رسالة profile_error العامة ويعيد المحاولة مرة واحدة', async () => {
    render(
      <AccountStatusView
        state={{
          status: 'profile_error',
          error: { code: 'network_error', message: 'تعذر الاتصال بخدمة بيانات الحساب حاليًا.' },
        }}
        onRetry={retry}
        onSignOut={signOut}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر الاتصال بخدمة بيانات الحساب حاليًا.');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  });
});

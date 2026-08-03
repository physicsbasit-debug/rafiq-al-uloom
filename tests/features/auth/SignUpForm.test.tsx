// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SignUpForm } from '@features/auth/SignUpForm';
import type { SignUpResult } from '@services/auth/auth.types';

function fill(email = 'new@example.com', password = 'strong-password', confirmation = password) {
  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('كلمة المرور'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور'), { target: { value: confirmation } });
}

describe('SignUpForm', () => {
  it('يرفض كلمات المرور غير المتطابقة قبل استدعاء الخدمة', () => {
    const onSubmit = vi.fn();
    render(<SignUpForm onSubmit={onSubmit} onSignIn={vi.fn()} onCancel={vi.fn()} />);
    fill('new@example.com', 'first-password', 'second-password');

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('كلمتا المرور غير متطابقتين.');
  });

  it('لا يرسل role أو status أو display_name', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      status: 'confirmation_required',
      email: 'new@example.com',
    } satisfies SignUpResult);
    render(<SignUpForm onSubmit={onSubmit} onSignIn={vi.fn()} onCancel={vi.fn()} />);
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'strong-password',
    });
  });

  it('يعرض PublicAuthError فقط عند فشل التسجيل', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      status: 'error',
      error: { code: 'weak_password', message: 'كلمة المرور لا تحقق متطلبات الأمان.' },
    } satisfies SignUpResult);
    render(<SignUpForm onSubmit={onSubmit} onSignIn={vi.fn()} onCancel={vi.fn()} />);
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'كلمة المرور لا تحقق متطلبات الأمان.'
    );
  });

  it('يعطل الأزرار أثناء الإرسال', async () => {
    let resolve!: (result: SignUpResult) => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<SignUpResult>((done) => {
          resolve = done;
        })
    );
    render(<SignUpForm onSubmit={onSubmit} onSignIn={vi.fn()} onCancel={vi.fn()} />);
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    expect(screen.getByRole('button', { name: 'جارٍ إنشاء الحساب...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'لدي حساب بالفعل' })).toBeDisabled();
    resolve({ status: 'confirmation_required', email: 'new@example.com' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'إنشاء الحساب' })).toBeEnabled());
  });

  it('يستخدم autocomplete الجديد لكلمتي المرور', () => {
    render(<SignUpForm onSubmit={vi.fn()} onSignIn={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('كلمة المرور')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('تأكيد كلمة المرور')).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
  });

  it('يربط العودة إلى الدخول والإلغاء', () => {
    const onSignIn = vi.fn();
    const onCancel = vi.fn();
    render(<SignUpForm onSubmit={vi.fn()} onSignIn={onSignIn} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'لدي حساب بالفعل' }));
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى موضعي السابق' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

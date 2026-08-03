// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SignInForm } from '@features/auth/SignInForm';
import type { SignInResult } from '@services/auth/auth.types';

function fillForm() {
  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'student@example.com' },
  });
  fireEvent.change(screen.getByLabelText('كلمة المرور'), {
    target: { value: 'correct-password' },
  });
}

describe('SignInForm', () => {
  it('يتحقق من الحقول المطلوبة قبل استدعاء الخدمة', () => {
    const onSubmit = vi.fn();
    render(<SignInForm onSubmit={onSubmit} onCreateAccount={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('أدخل البريد الإلكتروني وكلمة المرور.');
  });

  it('يرسل البريد وكلمة المرور فقط', async () => {
    const onSubmit = vi.fn(async () => ({
      status: 'error',
      error: { code: 'network_error', message: 'تعذر الاتصال بالخدمة حاليًا.' },
    } satisfies SignInResult));
    render(<SignInForm onSubmit={onSubmit} onCreateAccount={vi.fn()} onCancel={vi.fn()} />);
    fillForm();

    fireEvent.submit(screen.getByLabelText('كلمة المرور').closest('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'correct-password',
    });
  });

  it('يعرض التلميح العام نفسه لأخطاء invalid_credentials دون كشف السبب', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      status: 'error',
      error: { code: 'invalid_credentials', message: 'RAW email_not_confirmed' },
    } satisfies SignInResult);
    render(<SignInForm onSubmit={onSubmit} onCreateAccount={vi.fn()} onCancel={vi.fn()} />);
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور، وإن كنت قد أنشأت حسابك مؤخرًا فتأكد من إكمال تأكيد البريد الإلكتروني.'
    );
    expect(screen.queryByText(/email_not_confirmed/i)).not.toBeInTheDocument();
  });

  it('يعطل الإرسال أثناء الطلب ويمنع التكرار', async () => {
    let resolve!: (result: SignInResult) => void;
    const onSubmit = vi.fn(() => new Promise<SignInResult>((done) => { resolve = done; }));
    render(<SignInForm onSubmit={onSubmit} onCreateAccount={vi.fn()} onCancel={vi.fn()} />);
    fillForm();

    const submit = screen.getByRole('button', { name: 'تسجيل الدخول' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'جارٍ تسجيل الدخول...' })).toBeDisabled();
    resolve({ status: 'error', error: { code: 'unknown', message: 'تعذر الإكمال.' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeEnabled());
  });

  it('يستخدم labels وautocomplete المناسبين ويدعم إرسال form', () => {
    render(<SignInForm onSubmit={vi.fn()} onCreateAccount={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('كلمة المرور')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAttribute('type', 'email');
  });

  it('يربط إنشاء الحساب والإلغاء دون تعديل حقول النموذج', () => {
    const onCreateAccount = vi.fn();
    const onCancel = vi.fn();
    render(<SignInForm onSubmit={vi.fn()} onCreateAccount={onCreateAccount} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء حساب جديد' }));
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى موضعي السابق' }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

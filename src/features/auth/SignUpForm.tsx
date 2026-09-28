import { type ChangeEvent, type FormEvent, useState } from 'react';

import type { SignUpCredentials, SignUpResult } from '@services/auth/auth.types';

interface SignUpFormProps {
  readonly onSubmit: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  readonly onSignIn: () => void;
  readonly onCancel: () => void;
  readonly showCancel?: boolean;
}

const REQUIRED_FIELDS_MESSAGE = 'أكمل البريد الإلكتروني وكلمتي المرور.';
const PASSWORD_MISMATCH_MESSAGE = 'كلمتا المرور غير متطابقتين.';

export function SignUpForm({ onSubmit, onSignIn, onCancel, showCancel = true }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password || !passwordConfirmation) {
      setErrorMessage(REQUIRED_FIELDS_MESSAGE);
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onSubmit({ email: email.trim(), password });

      if (result.status === 'error') {
        setErrorMessage(result.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="sign-up-title"
      className="rafiq-auth-form"
    >
      <h2 id="sign-up-title">إنشاء حساب</h2>
      <p className="rafiq-auth-form-description">
        ينشأ الحساب بدور طالب وحالة معلّقة حتى يكتمل التفعيل.
      </p>

      <div className="rafiq-auth-fields">
        <label>
          <span>البريد الإلكتروني</span>
          <input
            id="sign-up-email"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setEmail(event.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
          />
        </label>

        <label>
          <span>كلمة المرور</span>
          <input
            id="sign-up-password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setPassword(event.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
          />
        </label>

        <label>
          <span>تأكيد كلمة المرور</span>
          <input
            id="sign-up-password-confirmation"
            name="passwordConfirmation"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            value={passwordConfirmation}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setPasswordConfirmation(event.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
          />
        </label>
      </div>

      <div className="rafiq-auth-error-slot" aria-live="polite">
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      </div>

      <div className="rafiq-auth-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rafiq-auth-button rafiq-auth-button-primary"
        >
          {isSubmitting ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
        </button>

        <button
          type="button"
          onClick={onSignIn}
          disabled={isSubmitting}
          className="rafiq-auth-button rafiq-auth-button-secondary"
        >
          لدي حساب بالفعل
        </button>

        {showCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rafiq-auth-button rafiq-auth-button-muted"
          >
            العودة إلى موضعي السابق
          </button>
        ) : null}
      </div>
    </form>
  );
}

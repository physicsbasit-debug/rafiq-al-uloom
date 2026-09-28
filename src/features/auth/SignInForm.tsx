import { type ChangeEvent, type FormEvent, useState } from 'react';

import type { SignInCredentials, SignInResult } from '@services/auth/auth.types';

interface SignInFormProps {
  readonly onSubmit: (credentials: SignInCredentials) => Promise<SignInResult>;
  readonly onCreateAccount: () => void;
  readonly onCancel: () => void;
  readonly showCreateAccount?: boolean;
  readonly cancelLabel?: string;
}

const INVALID_CREDENTIALS_HINT =
  'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور، وإن كان الحساب جديدًا فتأكد من إكمال تأكيد البريد الإلكتروني.';

const REQUIRED_FIELDS_MESSAGE = 'أدخل البريد الإلكتروني وكلمة المرور.';

export function SignInForm({
  onSubmit,
  onCreateAccount,
  onCancel,
  showCreateAccount = true,
  cancelLabel = 'العودة إلى موضعي السابق',
}: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage(REQUIRED_FIELDS_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onSubmit({ email: email.trim(), password });

      if (result.status === 'error') {
        setErrorMessage(
          result.error.code === 'invalid_credentials'
            ? INVALID_CREDENTIALS_HINT
            : result.error.message
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="sign-in-title"
      className="rafiq-auth-form"
    >
      <h2 id="sign-in-title">تسجيل دخول الكادر التعليمي</h2>
      <p className="rafiq-auth-form-description">
        هذه البوابة مخصصة للمعلم والمراجع لإدارة المحتوى والمراجعة والتأليف.
      </p>

      <div className="rafiq-auth-fields">
        <label>
          <span>البريد الإلكتروني</span>
          <input
            id="sign-in-email"
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
            id="sign-in-password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setPassword(event.target.value);
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
          {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>

        {showCreateAccount ? (
          <button
            type="button"
            onClick={onCreateAccount}
            disabled={isSubmitting}
            className="rafiq-auth-button rafiq-auth-button-secondary"
          >
            إنشاء حساب جديد
          </button>
        ) : null}

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rafiq-auth-button rafiq-auth-button-muted"
        >
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}

import type { PublicAuthError, PublicAuthErrorCode } from './auth.types';

interface AuthErrorShape {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly status?: unknown;
}

const GENERIC_MESSAGES: Readonly<Record<PublicAuthErrorCode, string>> = {
  invalid_input: 'تحقق من البيانات المدخلة ثم حاول مرة أخرى.',
  invalid_credentials: 'بيانات الدخول غير صحيحة.',
  weak_password: 'كلمة المرور لا تحقق متطلبات الأمان.',
  rate_limited: 'تم إجراء محاولات كثيرة. حاول لاحقًا.',
  network_error: 'تعذر الاتصال بالخدمة حاليًا.',
  service_unavailable: 'خدمة تسجيل الدخول غير متاحة مؤقتًا.',
  unknown: 'تعذر إكمال العملية حاليًا. حاول لاحقًا.',
};

function readErrorShape(error: unknown): AuthErrorShape {
  return typeof error === 'object' && error !== null ? error : {};
}

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

export function isPotentialExistingUserError(error: unknown): boolean {
  const shape = readErrorShape(error);
  const code = normalizeCode(shape.code);
  const message = normalizeMessage(shape.message);

  return (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    code === 'user_already_registered' ||
    message.includes('already registered') ||
    message.includes('already exists')
  );
}

export function toPublicAuthError(error: unknown): PublicAuthError {
  const shape = readErrorShape(error);
  const code = normalizeCode(shape.code);
  const message = normalizeMessage(shape.message);
  const status = normalizeStatus(shape.status);

  let publicCode: PublicAuthErrorCode = 'unknown';

  if (
    code === 'validation_failed' ||
    code === 'email_address_invalid' ||
    code === 'bad_json' ||
    message.includes('invalid email')
  ) {
    publicCode = 'invalid_input';
  } else if (
    code === 'invalid_credentials' ||
    code === 'email_not_confirmed' ||
    code === 'user_not_found' ||
    message.includes('invalid login credentials')
  ) {
    publicCode = 'invalid_credentials';
  } else if (
    status === 429 ||
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_sms_send_rate_limit' ||
    message.includes('rate limit')
  ) {
    publicCode = 'rate_limited';
  } else if (code === 'weak_password' || message.includes('password')) {
    publicCode = 'weak_password';
  } else if (
    error instanceof TypeError ||
    code === 'network_error' ||
    message.includes('fetch') ||
    message.includes('network')
  ) {
    publicCode = 'network_error';
  } else if ((status !== undefined && status >= 500) || code === 'service_unavailable') {
    publicCode = 'service_unavailable';
  }

  return {
    code: publicCode,
    message: GENERIC_MESSAGES[publicCode],
  };
}

export function createAuthDiagnosticError(
  operation: string,
  publicError: PublicAuthError,
  cause: unknown
): Error {
  return new Error(`${operation}: ${publicError.code}`, { cause });
}

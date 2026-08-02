import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@services/data/supabase-client';

import { isAbortError } from './auth.errors';
import type {
  ProfileReadResult,
  PublicAuthorizationError,
  PublicAuthorizationErrorCode,
  UserProfile,
  UserRole,
  UserStatus,
} from './authorization.types';

export interface ProfileService {
  getUserProfile(
    userId: string,
    options?: { readonly signal?: AbortSignal }
  ): Promise<ProfileReadResult>;
}

export interface ProfileServiceOptions {
  readonly reportDiagnostic?: (error: Error) => void;
}

type ProfileClient = Pick<SupabaseClient, 'from'>;

type ProfileQueryResponse = {
  readonly data: unknown | null;
  readonly error: unknown;
};

type ProfileQueryBuilder = PromiseLike<ProfileQueryResponse> & {
  select(columns: string): ProfileQueryBuilder;
  eq(column: string, value: unknown): ProfileQueryBuilder;
  maybeSingle(): ProfileQueryBuilder;
  abortSignal(signal: AbortSignal): ProfileQueryBuilder;
};

const PROFILE_COLUMNS = 'id,display_name,role,status,created_at,updated_at';

const ROLE_VALUES = ['student', 'teacher', 'reviewer'] as const;
const STATUS_VALUES = ['pending', 'active', 'suspended'] as const;

const GENERIC_MESSAGES: Readonly<Record<PublicAuthorizationErrorCode, string>> = {
  missing_profile: 'تعذر العثور على ملف المستخدم.',
  invalid_profile: 'بيانات حساب المستخدم غير صالحة.',
  network_error: 'تعذر الاتصال بخدمة بيانات الحساب حاليًا.',
  service_unavailable: 'خدمة بيانات الحساب غير متاحة مؤقتًا.',
  unknown: 'تعذر قراءة بيانات الحساب حاليًا. حاول لاحقًا.',
};

function queryProfiles(client: ProfileClient): ProfileQueryBuilder {
  return client.from('profiles') as unknown as ProfileQueryBuilder;
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${field}`);
  }

  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, field);
}

function requireEnum<const T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  field: string
): T[number] {
  if (
    typeof value !== 'string' ||
    !allowedValues.includes(value as T[number])
  ) {
    throw new Error(`Invalid ${field}`);
  }

  return value as T[number];
}

function mapProfileRow(value: unknown, expectedUserId: string): UserProfile {
  const row = requireObject(value, 'profile');
  const id = requireString(row.id, 'profile.id');

  if (id !== expectedUserId) {
    throw new Error('Invalid profile.id');
  }

  return {
    id,
    displayName: requireNullableString(row.display_name, 'profile.display_name'),
    role: requireEnum(row.role, ROLE_VALUES, 'profile.role') as UserRole,
    status: requireEnum(row.status, STATUS_VALUES, 'profile.status') as UserStatus,
    createdAt: requireString(row.created_at, 'profile.created_at'),
    updatedAt: requireString(row.updated_at, 'profile.updated_at'),
  };
}

function readErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    Number.isFinite(error.status)
  ) {
    return error.status;
  }

  return undefined;
}

function readErrorText(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message.toLowerCase();
  }

  return error instanceof Error ? error.message.toLowerCase() : '';
}

function toPublicAuthorizationError(error: unknown): PublicAuthorizationError {
  const status = readErrorStatus(error);
  const message = readErrorText(error);

  let code: PublicAuthorizationErrorCode = 'unknown';

  if (
    error instanceof TypeError ||
    message.includes('fetch') ||
    message.includes('network')
  ) {
    code = 'network_error';
  } else if (status !== undefined && status >= 500) {
    code = 'service_unavailable';
  }

  return { code, message: GENERIC_MESSAGES[code] };
}

function diagnosticError(
  operation: string,
  publicError: PublicAuthorizationError,
  cause: unknown
): Error {
  return new Error(`${operation}: ${publicError.code}`, { cause });
}

export function createProfileService(
  client: ProfileClient,
  options: ProfileServiceOptions = {}
): ProfileService {
  const reportDiagnostic = options.reportDiagnostic ?? (() => undefined);

  function report(
    operation: string,
    publicError: PublicAuthorizationError,
    cause: unknown
  ): void {
    reportDiagnostic(diagnosticError(operation, publicError, cause));
  }

  return {
    async getUserProfile(userId, requestOptions = {}) {
      requestOptions.signal?.throwIfAborted();

      try {
        const query = queryProfiles(client)
          .select(PROFILE_COLUMNS)
          .eq('id', userId)
          // Safe here because profiles.id is a PRIMARY KEY. Re-evaluate before
          // copying maybeSingle() to a query whose filter is not structurally unique.
          .maybeSingle();

        const { data, error } = await (requestOptions.signal
          ? query.abortSignal(requestOptions.signal)
          : query);

        if (error) {
          if (isAbortError(error)) {
            throw error;
          }

          const publicError = toPublicAuthorizationError(error);
          report('getUserProfile', publicError, error);
          return { status: 'error', error: publicError };
        }

        if (data === null) {
          const publicError: PublicAuthorizationError = {
            code: 'missing_profile',
            message: GENERIC_MESSAGES.missing_profile,
          };
          report('getUserProfile', publicError, new Error('Profile row is missing'));
          return { status: 'error', error: publicError };
        }

        try {
          return {
            status: 'success',
            profile: mapProfileRow(data, userId),
          };
        } catch (error) {
          const publicError: PublicAuthorizationError = {
            code: 'invalid_profile',
            message: GENERIC_MESSAGES.invalid_profile,
          };
          report('getUserProfile', publicError, error);
          return { status: 'error', error: publicError };
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        const publicError = toPublicAuthorizationError(error);
        report('getUserProfile', publicError, error);
        return { status: 'error', error: publicError };
      }
    },
  };
}

let defaultProfileService: ProfileService | undefined;

function getDefaultProfileService(): ProfileService {
  defaultProfileService ??= createProfileService(getSupabaseClient());
  return defaultProfileService;
}

export const profileService: ProfileService = {
  getUserProfile: (userId, options) =>
    getDefaultProfileService().getUserProfile(userId, options),
};

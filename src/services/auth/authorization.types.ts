export type UserRole = 'student' | 'teacher' | 'reviewer';

export type UserStatus = 'pending' | 'active' | 'suspended';

export interface UserProfile {
  readonly id: string;
  readonly displayName: string | null;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PublicAuthorizationErrorCode =
  'missing_profile' | 'invalid_profile' | 'network_error' | 'service_unavailable' | 'unknown';

export interface PublicAuthorizationError {
  readonly code: PublicAuthorizationErrorCode;
  readonly message: string;
}

export type ProfileReadResult =
  | {
      readonly status: 'success';
      readonly profile: UserProfile;
    }
  | {
      readonly status: 'error';
      readonly error: PublicAuthorizationError;
    };

export type AuthorizationState =
  | {
      readonly status: 'loading_profile';
      readonly userId: string;
    }
  | {
      readonly status: 'authorized';
      readonly profile: UserProfile;
    }
  | {
      readonly status: 'pending';
      readonly profile: UserProfile;
    }
  | {
      readonly status: 'suspended';
      readonly profile: UserProfile;
    }
  | {
      readonly status: 'profile_error';
      readonly error: PublicAuthorizationError;
    };

export type AuthorizationStateListener = (state: AuthorizationState | null) => void;

import { authoringRejected, authoringUnavailableResult, isAbortError } from './authoring.errors';
import type { AuthoringRepository } from './authoring.repository';
import { supabaseAuthoringRepository } from './supabase-authoring.repositories';
import type {
  AuthoringRequestOptions,
  CreateLessonRevisionInput,
  CreateLessonRevisionResult,
  LessonRevisionListResult,
  LessonRevisionPayload,
  ReviewEventListResult,
  SaveLessonRevisionResult,
  SubmitLessonRevisionResult,
} from './authoring.types';

export interface AuthoringService {
  listOwnRevisions(options?: AuthoringRequestOptions): Promise<LessonRevisionListResult>;
  listReviewEvents(
    revisionId: string,
    options?: AuthoringRequestOptions
  ): Promise<ReviewEventListResult>;
  createLessonRevision(
    input: CreateLessonRevisionInput,
    options?: AuthoringRequestOptions
  ): Promise<CreateLessonRevisionResult>;
  saveLessonRevision(
    revisionId: string,
    payload: LessonRevisionPayload,
    options?: AuthoringRequestOptions
  ): Promise<SaveLessonRevisionResult>;
  submitLessonRevision(
    revisionId: string,
    options?: AuthoringRequestOptions
  ): Promise<SubmitLessonRevisionResult>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPayload(payload: LessonRevisionPayload): boolean {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return false;
  }

  const value = payload as unknown as Record<string, unknown>;
  return (
    typeof value.lesson === 'object' &&
    value.lesson !== null &&
    !Array.isArray(value.lesson) &&
    Array.isArray(value.objectives) &&
    Array.isArray(value.questions) &&
    Array.isArray(value.games) &&
    Array.isArray(value.experiments) &&
    Array.isArray(value.simulations) &&
    Array.isArray(value.inquiries) &&
    Array.isArray(value.dataActivities)
  );
}

async function guardRepositoryCall<T>(
  call: () => Promise<T>
): Promise<T | ReturnType<typeof authoringUnavailableResult>> {
  try {
    return await call();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return authoringUnavailableResult(error);
  }
}

export function createAuthoringService(repository: AuthoringRepository): AuthoringService {
  return {
    async listOwnRevisions(options = {}) {
      options.signal?.throwIfAborted();
      return guardRepositoryCall(() => repository.listOwnRevisions(options));
    },

    async listReviewEvents(revisionId, options = {}) {
      options.signal?.throwIfAborted();
      if (!UUID_PATTERN.test(revisionId)) {
        return authoringRejected('invalid_revision_id');
      }
      return guardRepositoryCall(() => repository.listReviewEvents(revisionId, options));
    },

    async createLessonRevision(input, options = {}) {
      options.signal?.throwIfAborted();
      if (!validPayload(input.payload)) {
        return authoringRejected('invalid_payload');
      }
      if (
        input.supersedesRevisionId !== undefined &&
        input.supersedesRevisionId !== null &&
        !UUID_PATTERN.test(input.supersedesRevisionId)
      ) {
        return authoringRejected('invalid_revision_id');
      }
      return guardRepositoryCall(() => repository.createLessonRevision(input, options));
    },

    async saveLessonRevision(revisionId, payload, options = {}) {
      options.signal?.throwIfAborted();
      if (!UUID_PATTERN.test(revisionId)) {
        return authoringRejected('invalid_revision_id');
      }
      if (!validPayload(payload)) {
        return authoringRejected('invalid_payload');
      }
      return guardRepositoryCall(() => repository.saveLessonRevision(revisionId, payload, options));
    },

    async submitLessonRevision(revisionId, options = {}) {
      options.signal?.throwIfAborted();
      if (!UUID_PATTERN.test(revisionId)) {
        return authoringRejected('invalid_revision_id');
      }
      return guardRepositoryCall(() => repository.submitLessonRevision(revisionId, options));
    },
  };
}

let defaultService: AuthoringService | undefined;

function getDefaultService(): AuthoringService {
  defaultService ??= createAuthoringService(supabaseAuthoringRepository);
  return defaultService;
}

export const authoringService: AuthoringService = {
  listOwnRevisions: (options) => getDefaultService().listOwnRevisions(options),
  listReviewEvents: (revisionId, options) =>
    getDefaultService().listReviewEvents(revisionId, options),
  createLessonRevision: (input, options) =>
    getDefaultService().createLessonRevision(input, options),
  saveLessonRevision: (revisionId, payload, options) =>
    getDefaultService().saveLessonRevision(revisionId, payload, options),
  submitLessonRevision: (revisionId, options) =>
    getDefaultService().submitLessonRevision(revisionId, options),
};

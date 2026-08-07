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

export interface AuthoringRepository {
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

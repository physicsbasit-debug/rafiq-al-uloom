import type {
  AuthoringRequestOptions,
  LessonRevisionListResult,
  ReviewLessonRevisionInput,
  ReviewLessonRevisionResult,
} from './authoring.types';

export interface ReviewRepository {
  listPendingRevisions(options?: AuthoringRequestOptions): Promise<LessonRevisionListResult>;
  reviewLessonRevision(
    input: ReviewLessonRevisionInput,
    options?: AuthoringRequestOptions
  ): Promise<ReviewLessonRevisionResult>;
}

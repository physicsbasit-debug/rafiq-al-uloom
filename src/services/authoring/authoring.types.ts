import type { DataActivityConfig } from '@shared-types/data-activity.types';
import type { SafetyLevel } from '@shared-types/experiment.types';
import type { Difficulty } from '@shared-types/quiz.types';
import type { SimulationConfig } from '@shared-types/simulation.types';

export type LessonRevisionStatus = 'draft' | 'pending_review' | 'rejected' | 'approved';
export type ReviewDecision = 'approve' | 'reject';

export type AuthoringRejectionReason =
  | 'not_authenticated'
  | 'not_authorized'
  | 'invalid_payload'
  | 'unit_not_available'
  | 'lesson_not_available'
  | 'source_revision_not_available'
  | 'source_revision_mismatch'
  | 'revision_not_editable'
  | 'revision_not_submittable'
  | 'revision_not_reviewable'
  | 'invalid_decision'
  | 'review_note_required'
  | 'stale_revision'
  | 'canonical_position_conflict'
  | 'invalid_revision_id';

export type AuthoringUnavailableReason = 'network_error' | 'service_unavailable' | 'unknown';

export interface LessonRevisionPayload {
  readonly lesson: {
    readonly unitId: string;
    readonly title: string;
    readonly displayOrder: number;
    readonly summary: string;
    readonly keyConcepts: readonly string[];
    readonly examples: readonly string[];
    readonly misconceptions: readonly string[];
  };
  readonly objectives: readonly {
    readonly key: string;
    readonly text: string;
  }[];
  readonly questions: readonly {
    readonly key: string;
    readonly purpose: 'review' | 'mastery';
    readonly type: 'multiple_choice';
    readonly prompt: string;
    readonly choices: readonly string[];
    readonly correctAnswerIndex: number;
    readonly explanation: string;
    readonly objectiveKey: string;
    readonly difficulty: Difficulty;
  }[];
  readonly games: readonly {
    readonly key: string;
    readonly type: 'matching';
    readonly title: string;
    readonly instructions: string;
    readonly items: readonly {
      readonly left: string;
      readonly right: string;
    }[];
    readonly objectiveKeys: readonly string[];
  }[];
  readonly experiments: readonly {
    readonly key: string;
    readonly title: string;
    readonly objective: string;
    readonly objectiveKeys: readonly string[];
    readonly tools: readonly string[];
    readonly steps: readonly string[];
    readonly safetyNotes: readonly string[];
    readonly safetyLevel: SafetyLevel;
    readonly observationPrompt: string;
    readonly conclusionPrompt: string;
    readonly homeAlternative: string | null;
  }[];
  readonly simulations: readonly {
    readonly key: string;
    readonly title: string;
    readonly instructions: string;
    readonly objectiveKeys: readonly string[];
    readonly config: SimulationConfig;
  }[];
  readonly inquiries: readonly {
    readonly key: string;
    readonly title: string;
    readonly instructions: string;
    readonly objectiveKeys: readonly string[];
    readonly context: string;
    readonly drivingQuestion: string;
    readonly hypothesisPrompt: string;
    readonly observationPrompt: string;
    readonly conclusionPrompt: string;
  }[];
  readonly dataActivities: readonly {
    readonly key: string;
    readonly title: string;
    readonly instructions: string;
    readonly objectiveKeys: readonly string[];
    readonly config: DataActivityConfig;
  }[];
}

export interface LessonRevision {
  readonly id: string;
  readonly entityType: 'lesson';
  readonly entityId: string | null;
  readonly publishedEntityId: string | null;
  readonly supersedesRevisionId: string | null;
  readonly authorId: string;
  readonly status: LessonRevisionStatus;
  readonly payload: LessonRevisionPayload;
  readonly baseFingerprint: string | null;
  readonly revisionNumber: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedAt: string | null;
}

export interface ContentReviewEvent {
  readonly id: string;
  readonly revisionId: string;
  readonly reviewerId: string;
  readonly decision: ReviewDecision;
  readonly note: string | null;
  readonly createdAt: string;
}

export interface CreateLessonRevisionInput {
  readonly payload: LessonRevisionPayload;
  readonly entityId?: string | null;
  readonly supersedesRevisionId?: string | null;
}

export interface ReviewLessonRevisionInput {
  readonly revisionId: string;
  readonly decision: ReviewDecision;
  readonly note?: string | null;
}

export interface AuthoringRequestOptions {
  readonly signal?: AbortSignal;
}

export interface CreatedRevisionReference {
  readonly id: string;
  readonly entityId: string | null;
  readonly revisionNumber: number;
  readonly baseFingerprint: string | null;
}

export type AuthoringRejectedResult = {
  readonly status: 'rejected';
  readonly reason: AuthoringRejectionReason;
};

export type AuthoringUnavailableResult = {
  readonly status: 'unavailable';
  readonly reason: AuthoringUnavailableReason;
};

export type CreateLessonRevisionResult =
  | {
      readonly status: 'created';
      readonly revision: CreatedRevisionReference;
    }
  | AuthoringRejectedResult
  | AuthoringUnavailableResult;

export type SaveLessonRevisionResult =
  | {
      readonly status: 'saved';
      readonly revisionId: string;
    }
  | AuthoringRejectedResult
  | AuthoringUnavailableResult;

export type SubmitLessonRevisionResult =
  | {
      readonly status: 'submitted';
      readonly revisionId: string;
    }
  | AuthoringRejectedResult
  | AuthoringUnavailableResult;

export type ReviewLessonRevisionResult =
  | {
      readonly status: 'approved';
      readonly revisionId: string;
      readonly publishedEntityId: string;
    }
  | {
      readonly status: 'rejected_by_reviewer';
      readonly revisionId: string;
    }
  | AuthoringRejectedResult
  | AuthoringUnavailableResult;

export type LessonRevisionListResult =
  | {
      readonly status: 'success';
      readonly revisions: readonly LessonRevision[];
    }
  | AuthoringUnavailableResult;

export type ReviewEventListResult =
  | {
      readonly status: 'success';
      readonly events: readonly ContentReviewEvent[];
    }
  | AuthoringRejectedResult
  | AuthoringUnavailableResult;

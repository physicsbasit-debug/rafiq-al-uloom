import type {
  AuthoringRejectedResult,
  AuthoringRejectionReason,
  ContentReviewEvent,
  CreateLessonRevisionResult,
  LessonRevision,
  LessonRevisionPayload,
  LessonRevisionStatus,
  ReviewDecision,
  ReviewLessonRevisionResult,
  SaveLessonRevisionResult,
  SubmitLessonRevisionResult,
} from './authoring.types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/;
const REVISION_STATUSES = new Set<LessonRevisionStatus>([
  'draft',
  'pending_review',
  'rejected',
  'approved',
]);
const REVIEW_DECISIONS = new Set<ReviewDecision>(['approve', 'reject']);
const REJECTION_REASONS = new Set<AuthoringRejectionReason>([
  'not_authenticated',
  'not_authorized',
  'invalid_payload',
  'unit_not_available',
  'lesson_not_available',
  'source_revision_not_available',
  'source_revision_mismatch',
  'revision_not_editable',
  'revision_not_submittable',
  'revision_not_reviewable',
  'invalid_decision',
  'review_note_required',
  'stale_revision',
  'canonical_position_conflict',
]);
function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value as Record<string, unknown>;
}
function requireArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}
function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${field}`);
  }

  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  return value === null ? null : requireString(value, field);
}

function requireUuid(value: unknown, field: string): string {
  const stringValue = requireString(value, field);
  if (!UUID_PATTERN.test(stringValue)) {
    throw new Error(`Invalid ${field}`);
  }

  return stringValue;
}

function requireNullableUuid(value: unknown, field: string): string | null {
  return value === null ? null : requireUuid(value, field);
}

function requirePositiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new Error(`Invalid ${field}`);
  }

  return value as number;
}

function requireTimestamp(value: unknown, field: string): string {
  const stringValue = requireString(value, field);
  if (Number.isNaN(Date.parse(stringValue))) {
    throw new Error(`Invalid ${field}`);
  }

  return stringValue;
}

function requireNullableTimestamp(value: unknown, field: string): string | null {
  return value === null ? null : requireTimestamp(value, field);
}

function requireNullableFingerprint(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }

  const fingerprint = requireString(value, field).toLowerCase();
  if (!HEX_64_PATTERN.test(fingerprint)) {
    throw new Error(`Invalid ${field}`);
  }

  return fingerprint;
}

function requireRevisionStatus(value: unknown): LessonRevisionStatus {
  const status = requireString(value, 'revision.status') as LessonRevisionStatus;
  if (!REVISION_STATUSES.has(status)) {
    throw new Error('Invalid revision.status');
  }

  return status;
}

function requireReviewDecision(value: unknown): ReviewDecision {
  const decision = requireString(value, 'reviewEvent.decision') as ReviewDecision;
  if (!REVIEW_DECISIONS.has(decision)) {
    throw new Error('Invalid reviewEvent.decision');
  }

  return decision;
}

function requireLessonRevisionPayload(value: unknown): LessonRevisionPayload {
  const payload = requireObject(value, 'revision.payload');
  requireObject(payload.lesson, 'revision.payload.lesson');
  requireArray(payload.objectives, 'revision.payload.objectives');
  requireArray(payload.questions, 'revision.payload.questions');
  requireArray(payload.games, 'revision.payload.games');
  requireArray(payload.experiments, 'revision.payload.experiments');
  return value as LessonRevisionPayload;
}

function mapRevisionRow(value: unknown): LessonRevision {
  const row = requireObject(value, 'revision');
  if (row.entity_type !== 'lesson') {
    throw new Error('Invalid revision.entity_type');
  }

  return {
    id: requireUuid(row.id, 'revision.id'),
    entityType: 'lesson',
    entityId: requireNullableString(row.entity_id, 'revision.entity_id'),
    publishedEntityId: requireNullableString(
      row.published_entity_id,
      'revision.published_entity_id'
    ),
    supersedesRevisionId: requireNullableUuid(
      row.supersedes_revision_id,
      'revision.supersedes_revision_id'
    ),
    authorId: requireUuid(row.author_id, 'revision.author_id'),
    status: requireRevisionStatus(row.status),
    payload: requireLessonRevisionPayload(row.payload),
    baseFingerprint: requireNullableFingerprint(row.base_fingerprint, 'revision.base_fingerprint'),
    revisionNumber: requirePositiveInteger(row.revision_number, 'revision.revision_number'),
    createdAt: requireTimestamp(row.created_at, 'revision.created_at'),
    updatedAt: requireTimestamp(row.updated_at, 'revision.updated_at'),
    submittedAt: requireNullableTimestamp(row.submitted_at, 'revision.submitted_at'),
  };
}

function mapReviewEventRow(value: unknown): ContentReviewEvent {
  const row = requireObject(value, 'reviewEvent');

  return {
    id: requireUuid(row.id, 'reviewEvent.id'),
    revisionId: requireUuid(row.revision_id, 'reviewEvent.revision_id'),
    reviewerId: requireUuid(row.reviewer_id, 'reviewEvent.reviewer_id'),
    decision: requireReviewDecision(row.decision),
    note: requireNullableString(row.note, 'reviewEvent.note'),
    createdAt: requireTimestamp(row.created_at, 'reviewEvent.created_at'),
  };
}

function mapRejected(value: Record<string, unknown>): AuthoringRejectedResult {
  const reason = requireString(value.reason, 'RPC response.reason') as AuthoringRejectionReason;
  if (!REJECTION_REASONS.has(reason)) {
    throw new Error('Invalid RPC response.reason');
  }

  return { status: 'rejected', reason };
}

export function mapRevisionRows(value: unknown): readonly LessonRevision[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid revisions');
  }

  return value.map(mapRevisionRow);
}

export function mapReviewEventRows(value: unknown): readonly ContentReviewEvent[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid reviewEvents');
  }

  return value.map(mapReviewEventRow);
}

export function mapCreateRpcData(value: unknown): CreateLessonRevisionResult {
  const response = requireObject(value, 'RPC response');
  const status = requireString(response.status, 'RPC response.status');

  if (status === 'rejected') {
    return mapRejected(response);
  }
  if (status !== 'created') {
    throw new Error('Invalid RPC response.status');
  }

  const revision = requireObject(response.revision, 'RPC response.revision');
  return {
    status: 'created',
    revision: {
      id: requireUuid(revision.id, 'RPC response.revision.id'),
      entityId: requireNullableString(revision.entityId, 'RPC response.revision.entityId'),
      revisionNumber: requirePositiveInteger(
        revision.revisionNumber,
        'RPC response.revision.revisionNumber'
      ),
      baseFingerprint: requireNullableFingerprint(
        revision.baseFingerprint,
        'RPC response.revision.baseFingerprint'
      ),
    },
  };
}

export function mapSaveRpcData(value: unknown): SaveLessonRevisionResult {
  const response = requireObject(value, 'RPC response');
  const status = requireString(response.status, 'RPC response.status');

  if (status === 'rejected') {
    return mapRejected(response);
  }
  if (status !== 'saved') {
    throw new Error('Invalid RPC response.status');
  }

  return {
    status: 'saved',
    revisionId: requireUuid(response.revisionId, 'RPC response.revisionId'),
  };
}

export function mapSubmitRpcData(value: unknown): SubmitLessonRevisionResult {
  const response = requireObject(value, 'RPC response');
  const status = requireString(response.status, 'RPC response.status');

  if (status === 'rejected') {
    return mapRejected(response);
  }
  if (status !== 'submitted') {
    throw new Error('Invalid RPC response.status');
  }

  return {
    status: 'submitted',
    revisionId: requireUuid(response.revisionId, 'RPC response.revisionId'),
  };
}

export function mapReviewRpcData(value: unknown): ReviewLessonRevisionResult {
  const response = requireObject(value, 'RPC response');
  const status = requireString(response.status, 'RPC response.status');

  if (status === 'rejected') {
    return mapRejected(response);
  }
  if (status === 'rejected_by_reviewer') {
    return {
      status,
      revisionId: requireUuid(response.revisionId, 'RPC response.revisionId'),
    };
  }
  if (status === 'approved') {
    return {
      status,
      revisionId: requireUuid(response.revisionId, 'RPC response.revisionId'),
      publishedEntityId: requireString(
        response.publishedEntityId,
        'RPC response.publishedEntityId'
      ),
    };
  }

  throw new Error('Invalid RPC response.status');
}

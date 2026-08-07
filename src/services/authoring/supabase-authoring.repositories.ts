import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@services/data/supabase-client';

import {
  authoringUnavailableResult,
  createAuthoringDiagnosticError,
  isAbortError,
} from './authoring.errors';
import type { AuthoringRepository } from './authoring.repository';
import {
  mapCreateRpcData,
  mapReviewEventRows,
  mapReviewRpcData,
  mapRevisionRows,
  mapSaveRpcData,
  mapSubmitRpcData,
} from './supabase-authoring.mappers';
import type { ReviewRepository } from './review.repository';
import type {
  AuthoringRequestOptions,
  AuthoringUnavailableResult,
  CreateLessonRevisionInput,
  CreateLessonRevisionResult,
  LessonRevisionListResult,
  LessonRevisionPayload,
  ReviewEventListResult,
  ReviewLessonRevisionInput,
  ReviewLessonRevisionResult,
  SaveLessonRevisionResult,
  SubmitLessonRevisionResult,
} from './authoring.types';

type DbResponse = {
  readonly data: unknown | null;
  readonly error: unknown;
};

type QueryLike = PromiseLike<DbResponse> & {
  select(columns: string): QueryLike;
  eq(column: string, value: unknown): QueryLike;
  order(
    column: string,
    options?: { readonly ascending?: boolean; readonly nullsFirst?: boolean }
  ): QueryLike;
  abortSignal(signal: AbortSignal): QueryLike;
};

type RpcQuery = PromiseLike<DbResponse> & {
  abortSignal(signal: AbortSignal): RpcQuery;
};

type AuthoringSupabaseClient = Pick<SupabaseClient, 'from' | 'rpc'>;

export interface SupabaseAuthoringRepositoriesOptions {
  readonly reportDiagnostic?: (error: Error) => void;
}

const REVISION_COLUMNS = [
  'id',
  'entity_type',
  'entity_id',
  'published_entity_id',
  'supersedes_revision_id',
  'author_id',
  'status',
  'payload',
  'base_fingerprint',
  'revision_number',
  'created_at',
  'updated_at',
  'submitted_at',
].join(',');

const REVIEW_EVENT_COLUMNS = 'id,revision_id,reviewer_id,decision,note,created_at';

function queryTable(client: AuthoringSupabaseClient, table: string): QueryLike {
  return client.from(table) as unknown as QueryLike;
}

function callRpc(
  client: AuthoringSupabaseClient,
  name: string,
  args: Record<string, unknown>
): RpcQuery {
  return client.rpc(name, args) as unknown as RpcQuery;
}

function withAbort<T extends QueryLike | RpcQuery>(query: T, options: AuthoringRequestOptions): T {
  options.signal?.throwIfAborted();
  return options.signal ? (query.abortSignal(options.signal) as T) : query;
}

function reportUnavailable(
  operation: string,
  error: unknown,
  reportDiagnostic: (error: Error) => void
): AuthoringUnavailableResult {
  const result = authoringUnavailableResult(error);
  reportDiagnostic(createAuthoringDiagnosticError(operation, result.reason, error));
  return result;
}

async function executeMapped<T>(
  operation: string,
  query: QueryLike | RpcQuery,
  mapData: (value: unknown) => T,
  reportDiagnostic: (error: Error) => void
): Promise<T | AuthoringUnavailableResult> {
  try {
    const { data, error } = await query;
    if (error) {
      if (isAbortError(error)) {
        throw error;
      }
      return reportUnavailable(operation, error, reportDiagnostic);
    }

    if (data === null) {
      return reportUnavailable(
        operation,
        new Error(`${operation} returned no data`),
        reportDiagnostic
      );
    }

    try {
      return mapData(data);
    } catch (error) {
      return reportUnavailable(operation, error, reportDiagnostic);
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return reportUnavailable(operation, error, reportDiagnostic);
  }
}

export function createSupabaseAuthoringRepositories(
  client: AuthoringSupabaseClient,
  options: SupabaseAuthoringRepositoriesOptions = {}
): {
  readonly authoring: AuthoringRepository;
  readonly review: ReviewRepository;
} {
  const reportDiagnostic = options.reportDiagnostic ?? (() => undefined);

  const authoring: AuthoringRepository = {
    async listOwnRevisions(requestOptions = {}): Promise<LessonRevisionListResult> {
      const query = withAbort(
        queryTable(client, 'content_revisions')
          .select(REVISION_COLUMNS)
          .order('updated_at', { ascending: false })
          .order('id', { ascending: true }),
        requestOptions
      );

      return executeMapped(
        'listOwnRevisions',
        query,
        (data) => ({ status: 'success' as const, revisions: mapRevisionRows(data) }),
        reportDiagnostic
      );
    },

    async listReviewEvents(revisionId, requestOptions = {}): Promise<ReviewEventListResult> {
      const query = withAbort(
        queryTable(client, 'content_review_events')
          .select(REVIEW_EVENT_COLUMNS)
          .eq('revision_id', revisionId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
        requestOptions
      );

      return executeMapped(
        'listReviewEvents',
        query,
        (data) => ({ status: 'success' as const, events: mapReviewEventRows(data) }),
        reportDiagnostic
      );
    },

    async createLessonRevision(
      input: CreateLessonRevisionInput,
      requestOptions = {}
    ): Promise<CreateLessonRevisionResult> {
      const query = withAbort(
        callRpc(client, 'create_lesson_revision', {
          p_payload: input.payload,
          p_entity_id: input.entityId ?? null,
          p_supersedes_revision_id: input.supersedesRevisionId ?? null,
        }),
        requestOptions
      );

      return executeMapped('createLessonRevision', query, mapCreateRpcData, reportDiagnostic);
    },

    async saveLessonRevision(
      revisionId: string,
      payload: LessonRevisionPayload,
      requestOptions = {}
    ): Promise<SaveLessonRevisionResult> {
      const query = withAbort(
        callRpc(client, 'save_lesson_revision', {
          p_revision_id: revisionId,
          p_payload: payload,
        }),
        requestOptions
      );

      return executeMapped('saveLessonRevision', query, mapSaveRpcData, reportDiagnostic);
    },

    async submitLessonRevision(
      revisionId: string,
      requestOptions = {}
    ): Promise<SubmitLessonRevisionResult> {
      const query = withAbort(
        callRpc(client, 'submit_lesson_revision', { p_revision_id: revisionId }),
        requestOptions
      );

      return executeMapped('submitLessonRevision', query, mapSubmitRpcData, reportDiagnostic);
    },
  };

  const review: ReviewRepository = {
    async listPendingRevisions(requestOptions = {}): Promise<LessonRevisionListResult> {
      const query = withAbort(
        queryTable(client, 'content_revisions')
          .select(REVISION_COLUMNS)
          .eq('status', 'pending_review')
          .order('submitted_at', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true }),
        requestOptions
      );

      return executeMapped(
        'listPendingRevisions',
        query,
        (data) => ({ status: 'success' as const, revisions: mapRevisionRows(data) }),
        reportDiagnostic
      );
    },

    async reviewLessonRevision(
      input: ReviewLessonRevisionInput,
      requestOptions = {}
    ): Promise<ReviewLessonRevisionResult> {
      const query = withAbort(
        callRpc(client, 'review_lesson_revision', {
          p_revision_id: input.revisionId,
          p_decision: input.decision,
          p_note: input.note ?? null,
        }),
        requestOptions
      );

      return executeMapped('reviewLessonRevision', query, mapReviewRpcData, reportDiagnostic);
    },
  };

  return { authoring, review };
}

let defaultRepositories:
  | {
      readonly authoring: AuthoringRepository;
      readonly review: ReviewRepository;
    }
  | undefined;

function getDefaultRepositories() {
  defaultRepositories ??= createSupabaseAuthoringRepositories(getSupabaseClient());
  return defaultRepositories;
}

export const supabaseAuthoringRepository: AuthoringRepository = {
  listOwnRevisions: (options) => getDefaultRepositories().authoring.listOwnRevisions(options),
  listReviewEvents: (revisionId, options) =>
    getDefaultRepositories().authoring.listReviewEvents(revisionId, options),
  createLessonRevision: (input, options) =>
    getDefaultRepositories().authoring.createLessonRevision(input, options),
  saveLessonRevision: (revisionId, payload, options) =>
    getDefaultRepositories().authoring.saveLessonRevision(revisionId, payload, options),
  submitLessonRevision: (revisionId, options) =>
    getDefaultRepositories().authoring.submitLessonRevision(revisionId, options),
};

export const supabaseReviewRepository: ReviewRepository = {
  listPendingRevisions: (options) => getDefaultRepositories().review.listPendingRevisions(options),
  reviewLessonRevision: (input, options) =>
    getDefaultRepositories().review.reviewLessonRevision(input, options),
};

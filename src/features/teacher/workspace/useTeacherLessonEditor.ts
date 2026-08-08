import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  AuthoringService,
  AuthoringUnavailableReason,
  AuthoringRejectionReason,
  LessonRevision,
  LessonRevisionPayload,
} from '@services/authoring';

import {
  createEmptyTeacherLessonPayload,
  teacherAuthoringFailureMessage,
} from './teacher-workspace.utils';

export type TeacherLessonEditorMode =
  'new' | 'edit_draft' | 'revise_rejected' | 'readonly_pending_review' | 'readonly_approved';

export type TeacherLessonEditorError =
  | {
      readonly kind: 'rejected';
      readonly reason: AuthoringRejectionReason;
      readonly message: string;
    }
  | {
      readonly kind: 'unavailable';
      readonly reason: AuthoringUnavailableReason;
      readonly message: string;
    };

interface UseTeacherLessonEditorOptions {
  readonly service: AuthoringService;
  readonly revision?: LessonRevision | null;
}

function modeForRevision(revision?: LessonRevision | null): TeacherLessonEditorMode {
  if (!revision) return 'new';
  if (revision.status === 'draft') return 'edit_draft';
  if (revision.status === 'rejected') return 'revise_rejected';
  if (revision.status === 'pending_review') return 'readonly_pending_review';
  return 'readonly_approved';
}

function workingIdForRevision(revision?: LessonRevision | null): string | null {
  return revision?.status === 'draft' ? revision.id : null;
}

function errorFromResult(
  result:
    | { readonly status: 'rejected'; readonly reason: AuthoringRejectionReason }
    | { readonly status: 'unavailable'; readonly reason: AuthoringUnavailableReason }
): TeacherLessonEditorError {
  if (result.status === 'rejected') {
    return {
      kind: 'rejected',
      reason: result.reason,
      message: teacherAuthoringFailureMessage(result.reason),
    };
  }
  return {
    kind: 'unavailable',
    reason: result.reason,
    message: teacherAuthoringFailureMessage(result.reason),
  };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

export function useTeacherLessonEditor({
  service,
  revision = null,
}: UseTeacherLessonEditorOptions) {
  const originRevisionId = revision?.id ?? null;
  const [mode, setMode] = useState<TeacherLessonEditorMode>(() => modeForRevision(revision));
  const [workingRevisionId, setWorkingRevisionId] = useState<string | null>(() =>
    workingIdForRevision(revision)
  );
  const [payload, setPayload] = useState<LessonRevisionPayload>(
    () => revision?.payload ?? createEmptyTeacherLessonPayload()
  );
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<TeacherLessonEditorError | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  const submitAbortRef = useRef<AbortController | null>(null);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      saveAbortRef.current?.abort();
      submitAbortRef.current?.abort();
      saveAbortRef.current = null;
      submitAbortRef.current = null;
    };
  }, []);

  const isReadOnly = mode === 'readonly_pending_review' || mode === 'readonly_approved';
  const canSubmit =
    mode === 'edit_draft' && workingRevisionId !== null && !dirty && !isSaving && !isSubmitting;

  const updatePayload = (next: LessonRevisionPayload) => {
    if (isReadOnly || isSaving || isSubmitting) return;
    setPayload(next);
    setDirty(true);
    setError(null);
  };

  const save = async () => {
    if (isReadOnly || isSaving || isSubmitting || submitInFlightRef.current || !dirty) return;

    const controller = new AbortController();
    saveAbortRef.current?.abort();
    saveAbortRef.current = controller;
    setIsSaving(true);
    setError(null);

    try {
      if (mode === 'new' || mode === 'revise_rejected') {
        const input =
          mode === 'revise_rejected'
            ? { payload, supersedesRevisionId: originRevisionId }
            : { payload };
        const result = await service.createLessonRevision(input, { signal: controller.signal });

        if (result.status === 'created') {
          setWorkingRevisionId(result.revision.id);
          setMode('edit_draft');
          setDirty(false);
          return;
        }

        setError(errorFromResult(result));
        return;
      }

      if (mode === 'edit_draft' && workingRevisionId) {
        const result = await service.saveLessonRevision(workingRevisionId, payload, {
          signal: controller.signal,
        });
        if (result.status === 'saved') {
          setDirty(false);
          return;
        }
        setError(errorFromResult(result));
      }
    } catch (caught) {
      if (!isAbortError(caught)) {
        throw caught;
      }
    } finally {
      if (saveAbortRef.current === controller) {
        saveAbortRef.current = null;
        setIsSaving(false);
      }
    }
  };

  const submit = async () => {
    if (!canSubmit || !workingRevisionId || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    const controller = new AbortController();
    submitAbortRef.current?.abort();
    submitAbortRef.current = controller;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await service.submitLessonRevision(workingRevisionId, {
        signal: controller.signal,
      });

      if (result.status === 'submitted') {
        setMode('readonly_pending_review');
        return;
      }

      setError(errorFromResult(result));
    } catch (caught) {
      if (!isAbortError(caught)) {
        throw caught;
      }
    } finally {
      if (submitAbortRef.current === controller) {
        submitAbortRef.current = null;
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const session = useMemo(
    () => ({
      originRevisionId,
      workingRevisionId,
      mode,
      dirty,
      isSaving,
      isSubmitting,
      isReadOnly,
      canSubmit,
    }),
    [
      originRevisionId,
      workingRevisionId,
      mode,
      dirty,
      isSaving,
      isSubmitting,
      isReadOnly,
      canSubmit,
    ]
  );

  return {
    payload,
    updatePayload,
    save,
    submit,
    error,
    session,
  };
}

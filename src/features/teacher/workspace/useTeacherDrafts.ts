import { useCallback, useEffect, useState } from 'react';

import type { AuthoringService, LessonRevision } from '@services/authoring';

import { teacherDraftsUnavailableMessage } from './teacher-workspace.utils';

interface TeacherDraftsState {
  readonly revisions: readonly LessonRevision[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

export function useTeacherDrafts(service: AuthoringService): TeacherDraftsState {
  const [revisions, setRevisions] = useState<readonly LessonRevision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const reload = useCallback(() => {
    setRequestVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await service.listOwnRevisions({ signal: controller.signal });
        if (controller.signal.aborted) return;

        if (result.status === 'success') {
          setRevisions(result.revisions);
          setError(null);
        } else {
          setError(teacherDraftsUnavailableMessage(result.reason));
        }
      } catch (caught) {
        if (isAbortError(caught) || controller.signal.aborted) return;
        setError('تعذر تحميل مسوداتك بسبب خطأ غير متوقع. حاول مجددًا.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [requestVersion, service]);

  return { revisions, isLoading, error, reload };
}

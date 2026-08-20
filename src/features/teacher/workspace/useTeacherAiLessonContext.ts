import { useEffect, useRef, useState } from 'react';

import type { AiLessonContext } from '@services/ai-authoring';
import type { ContentRepository } from '@services/data/content.repository';

export type TeacherAiLessonContextState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'resolved'; readonly context: AiLessonContext }
  | { readonly status: 'unavailable'; readonly reason: 'unit_not_found' | 'catalog_unavailable' };

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

export async function resolveTeacherAiLessonContext(
  repository: ContentRepository,
  unitId: string,
  lessonTitle: string,
  signal?: AbortSignal
): Promise<AiLessonContext | null> {
  const normalizedUnitId = unitId.trim();
  const normalizedLessonTitle = lessonTitle.trim();
  if (!normalizedUnitId || !normalizedLessonTitle) return null;

  // Unit ids are treated as globally unique identifiers. In the current Supabase
  // schema public.units.id is the table PRIMARY KEY. The local catalog uses the
  // same id contract. ContentRepository currently has no getUnitById method, so
  // this read-only resolver walks the catalog without deriving meaning from the id.
  const grades = await repository.getGrades({ signal });
  for (const grade of grades) {
    const semesters = await repository.getSemestersByGrade(grade.id, { signal });
    for (const semester of semesters) {
      const subjects = await repository.getSubjectsBySemester(semester.id, { signal });
      for (const subject of subjects) {
        if (subject.gradeId !== grade.id) continue;
        const units = await repository.getUnitsBySubjectAndSemester(subject.id, semester.id, {
          signal,
        });
        const unit = units.find((candidate) => candidate.id === normalizedUnitId);
        if (!unit) continue;

        return {
          language: 'ar',
          gradeLabel: grade.name,
          subjectLabel: subject.name,
          unitTitle: unit.title,
          lessonTitle: normalizedLessonTitle,
        };
      }
    }
  }

  return null;
}

interface UseTeacherAiLessonContextOptions {
  readonly repository: ContentRepository;
  readonly unitId: string;
  readonly lessonTitle: string;
  readonly enabled?: boolean;
}

export function useTeacherAiLessonContext({
  repository,
  unitId,
  lessonTitle,
  enabled = true,
}: UseTeacherAiLessonContextOptions): TeacherAiLessonContextState {
  const normalizedUnitId = unitId.trim();
  const normalizedLessonTitle = lessonTitle.trim();
  const requestEnabled = enabled && Boolean(normalizedUnitId) && Boolean(normalizedLessonTitle);
  const requestKey = JSON.stringify([enabled, normalizedUnitId, normalizedLessonTitle]);
  const [trackedRequestKey, setTrackedRequestKey] = useState(requestKey);
  const [state, setState] = useState<TeacherAiLessonContextState>(() =>
    requestEnabled ? { status: 'loading' } : { status: 'idle' }
  );
  const sequenceRef = useRef(0);

  // Reset the visible request state during the same guarded render in which
  // inputs change. The effect below is reserved for the external async read.
  if (trackedRequestKey !== requestKey) {
    setTrackedRequestKey(requestKey);
    setState(requestEnabled ? { status: 'loading' } : { status: 'idle' });
  }

  useEffect(() => {
    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    const controller = new AbortController();

    if (!requestEnabled) {
      return () => controller.abort();
    }

    void resolveTeacherAiLessonContext(
      repository,
      normalizedUnitId,
      normalizedLessonTitle,
      controller.signal
    )
      .then((context) => {
        if (controller.signal.aborted || sequence !== sequenceRef.current) return;
        setState(
          context
            ? { status: 'resolved', context }
            : { status: 'unavailable', reason: 'unit_not_found' }
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || sequence !== sequenceRef.current || isAbortError(error)) {
          return;
        }
        setState({ status: 'unavailable', reason: 'catalog_unavailable' });
      });

    return () => {
      controller.abort();
    };
  }, [normalizedLessonTitle, normalizedUnitId, repository, requestEnabled]);

  return state;
}

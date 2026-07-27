// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asyncLocalContentRepository } from '@services/data/async-local-content.repository';
import {
  useGamesByLesson,
  useGrades,
  useLesson,
  useLessonExperiments,
  useLessonObjectives,
  useLessonsByUnit,
  useMasteryQuestions,
  useObjectivesByIds,
  useReviewQuestions,
  useSemestersByGrade,
  useSubjectsBySemester,
  useUnitsBySubject,
  useUnitsBySubjectAndSemester,
} from '@services/queries/content-query.hooks';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('content query hooks: repository mappings', () => {
  it('يفوض useGrades مرة واحدة ويحافظ على مرجع queryFn', async () => {
    const spy = vi.spyOn(asyncLocalContentRepository, 'getGrades').mockResolvedValue([]);

    const { rerender } = renderHook(() => useGrades());

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    expect(spy.mock.calls[0]?.[0]?.signal).toBeInstanceOf(AbortSignal);

    rerender();
    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('يفوض useSemestersByGrade إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getSemestersByGrade')
      .mockResolvedValue([]);

    renderHook(() => useSemestersByGrade('grade-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('grade-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useSubjectsBySemester إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getSubjectsBySemester')
      .mockResolvedValue([]);

    renderHook(() => useSubjectsBySemester('semester-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('semester-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useUnitsBySubjectAndSemester إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getUnitsBySubjectAndSemester')
      .mockResolvedValue([]);

    renderHook(() => useUnitsBySubjectAndSemester('subject-1', 'semester-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('subject-1', 'semester-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useUnitsBySubject إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getUnitsBySubject')
      .mockResolvedValue([]);

    renderHook(() => useUnitsBySubject('subject-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('subject-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useLesson إلى getLessonById ويبدأ بـundefined', async () => {
    const spy = vi.spyOn(asyncLocalContentRepository, 'getLessonById').mockResolvedValue(undefined);

    const { result } = renderHook(() => useLesson('lesson-1'));

    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useLessonObjectives إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getObjectivesByLesson')
      .mockResolvedValue([]);

    renderHook(() => useLessonObjectives('lesson-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useLessonExperiments إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getExperimentsByLesson')
      .mockResolvedValue([]);

    renderHook(() => useLessonExperiments('lesson-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useReviewQuestions إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getReviewQuestionsByLesson')
      .mockResolvedValue([]);

    renderHook(() => useReviewQuestions('lesson-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useMasteryQuestions إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getMasteryQuestionsByLesson')
      .mockResolvedValue([]);

    renderHook(() => useMasteryQuestions('lesson-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض useGamesByLesson إلى الدالة الصحيحة', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getGamesByLesson')
      .mockResolvedValue([]);

    renderHook(() => useGamesByLesson('lesson-1'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });
});

describe('content query hooks: reference stability', () => {
  it('لا يعيد useLessonsByUnit الطلب مع unitId نفسه ويعيده مرة عند تغيّره', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getLessonsByUnit')
      .mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ unitId }: { unitId: string }) => useLessonsByUnit(unitId),
      {
        initialProps: { unitId: 'unit-1' },
      },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    rerender({ unitId: 'unit-1' });
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ unitId: 'unit-2' });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });

    expect(spy).toHaveBeenLastCalledWith('unit-2', {
      signal: expect.any(AbortSignal),
    });
  });

  it('لا يعيد useObjectivesByIds الطلب عند تغير المرجع وبقاء المحتوى نفسه', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getObjectivesByIds')
      .mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ objectiveIds }: { objectiveIds: string[] }) => useObjectivesByIds(objectiveIds),
      {
        initialProps: { objectiveIds: ['o1', 'o2'] },
      },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    rerender({ objectiveIds: ['o1', 'o2'] });
    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('يعيد useObjectivesByIds الطلب عند تغير المحتوى', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getObjectivesByIds')
      .mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ objectiveIds }: { objectiveIds: string[] }) => useObjectivesByIds(objectiveIds),
      {
        initialProps: { objectiveIds: ['o1', 'o2'] },
      },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    rerender({ objectiveIds: ['o1', 'o3'] });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });

    expect(spy).toHaveBeenLastCalledWith(['o1', 'o3'], {
      signal: expect.any(AbortSignal),
    });
  });

  it('يعيد useObjectivesByIds الطلب عند تغير ترتيب المحتوى', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getObjectivesByIds')
      .mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ objectiveIds }: { objectiveIds: string[] }) => useObjectivesByIds(objectiveIds),
      {
        initialProps: { objectiveIds: ['o1', 'o2'] },
      },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });

    rerender({ objectiveIds: ['o2', 'o1'] });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });

    expect(spy).toHaveBeenLastCalledWith(['o2', 'o1'], {
      signal: expect.any(AbortSignal),
    });
  });

  it('ينهي useObjectivesByIds التحميل بلا حلقة إعادة طلب', async () => {
    const spy = vi
      .spyOn(asyncLocalContentRepository, 'getObjectivesByIds')
      .mockResolvedValue([]);

    const { result } = renderHook(() => useObjectivesByIds(['o1']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe('content query hooks: structural regression guards', () => {
  it('يحافظ على أعداد hooks والاستدعاءات والقيم الابتدائية المعتمدة', () => {
    const sourcePath = resolve(
      process.cwd(),
      'src/services/queries/content-query.hooks.ts',
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source.match(/export function use[A-Z]\w*\(/g)?.length ?? 0).toBe(13);
    expect(source.match(/return useAsyncQuery\(\{/g)?.length ?? 0).toBe(13);
    expect(source.match(/initialData:\s*EMPTY_[A-Z_]+/g)?.length ?? 0).toBe(12);
    expect(source.match(/initialData:\s*undefined/g)?.length ?? 0).toBe(1);

    expect(source).not.toMatch(
      /initialData:\s*(?:\[\]|\{\}|new\s+(?:Array|Map|Set)\s*\(|Array\.from\s*\(|\[\.\.\.|\{\s*\.\.\.)/,
    );
  });

  it('لا يكرر منطق دورة الاستعلام داخل hooks المتخصصة', () => {
    const sourcePath = resolve(
      process.cwd(),
      'src/services/queries/content-query.hooks.ts',
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('useEffect');
    expect(source).not.toContain('AbortController');
    expect(source).not.toContain('requestVersionRef');
    expect(source).not.toContain('enabled');
  });
});

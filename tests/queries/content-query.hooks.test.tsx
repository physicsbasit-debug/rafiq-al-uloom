// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  it('يفوض hooks الفهرس إلى دوال Repository الصحيحة', async () => {
    const semestersSpy = vi
      .spyOn(asyncLocalContentRepository, 'getSemestersByGrade')
      .mockResolvedValue([]);
    const subjectsSpy = vi
      .spyOn(asyncLocalContentRepository, 'getSubjectsBySemester')
      .mockResolvedValue([]);
    const unitsBySemesterSpy = vi
      .spyOn(asyncLocalContentRepository, 'getUnitsBySubjectAndSemester')
      .mockResolvedValue([]);
    const unitsBySubjectSpy = vi
      .spyOn(asyncLocalContentRepository, 'getUnitsBySubject')
      .mockResolvedValue([]);

    renderHook(() => useSemestersByGrade('grade-1'));
    renderHook(() => useSubjectsBySemester('semester-1'));
    renderHook(() => useUnitsBySubjectAndSemester('subject-1', 'semester-1'));
    renderHook(() => useUnitsBySubject('subject-1'));

    await waitFor(() => {
      expect(semestersSpy).toHaveBeenCalledWith('grade-1', {
        signal: expect.any(AbortSignal),
      });
      expect(subjectsSpy).toHaveBeenCalledWith('semester-1', {
        signal: expect.any(AbortSignal),
      });
      expect(unitsBySemesterSpy).toHaveBeenCalledWith('subject-1', 'semester-1', {
        signal: expect.any(AbortSignal),
      });
      expect(unitsBySubjectSpy).toHaveBeenCalledWith('subject-1', {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('يفوض hooks الدرس إلى دوال Repository الصحيحة', async () => {
    const lessonSpy = vi.spyOn(asyncLocalContentRepository, 'getLessonById').mockResolvedValue(
      undefined,
    );
    const objectivesSpy = vi
      .spyOn(asyncLocalContentRepository, 'getObjectivesByLesson')
      .mockResolvedValue([]);
    const experimentsSpy = vi
      .spyOn(asyncLocalContentRepository, 'getExperimentsByLesson')
      .mockResolvedValue([]);
    const reviewSpy = vi
      .spyOn(asyncLocalContentRepository, 'getReviewQuestionsByLesson')
      .mockResolvedValue([]);
    const masterySpy = vi
      .spyOn(asyncLocalContentRepository, 'getMasteryQuestionsByLesson')
      .mockResolvedValue([]);
    const gamesSpy = vi
      .spyOn(asyncLocalContentRepository, 'getGamesByLesson')
      .mockResolvedValue([]);

    const lessonHook = renderHook(() => useLesson('lesson-1'));
    renderHook(() => useLessonObjectives('lesson-1'));
    renderHook(() => useLessonExperiments('lesson-1'));
    renderHook(() => useReviewQuestions('lesson-1'));
    renderHook(() => useMasteryQuestions('lesson-1'));
    renderHook(() => useGamesByLesson('lesson-1'));

    expect(lessonHook.result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(lessonSpy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
      expect(objectivesSpy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
      expect(experimentsSpy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
      expect(reviewSpy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
      expect(masterySpy).toHaveBeenCalledWith('lesson-1', {
        signal: expect.any(AbortSignal),
      });
      expect(gamesSpy).toHaveBeenCalledWith('lesson-1', {
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

  it('يثبت useObjectivesByIds بحسب المحتوى لا بحسب مرجع المصفوفة', async () => {
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

    rerender({ objectiveIds: ['o1', 'o3'] });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });

    rerender({ objectiveIds: ['o3', 'o1'] });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(3);
    });

    expect(spy).toHaveBeenLastCalledWith(['o3', 'o1'], {
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
    const sourcePath = fileURLToPath(
      new URL('../../src/services/queries/content-query.hooks.ts', import.meta.url),
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
    const sourcePath = fileURLToPath(
      new URL('../../src/services/queries/content-query.hooks.ts', import.meta.url),
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('useEffect');
    expect(source).not.toContain('AbortController');
    expect(source).not.toContain('requestVersionRef');
    expect(source).not.toContain('enabled');
  });
});

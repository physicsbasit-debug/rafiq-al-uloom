// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  resolveTeacherAiLessonContext,
  useTeacherAiLessonContext,
} from '@features/teacher/workspace/useTeacherAiLessonContext';
import type { ContentRepository } from '@services/data/content.repository';

function repositoryFixture(): ContentRepository {
  return {
    getGrades: vi.fn(async () => [{ id: 'g10', name: 'الصف العاشر', order: 10 }]),
    getSemestersByGrade: vi.fn(async () => [
      { id: 'g10-sem2', gradeId: 'g10', name: 'الفصل الدراسي الثاني', order: 2 },
    ]),
    getSubjectsBySemester: vi.fn(async () => [
      { id: 'g10-physics', gradeId: 'g10', name: 'الفيزياء', themeColor: '#000000' },
    ]),
    getUnitsBySubjectAndSemester: vi.fn(async () => [
      {
        id: 'g10-phy-waves-unit',
        subjectId: 'g10-physics',
        semesterId: 'g10-sem2',
        title: 'الموجات',
        order: 1,
      },
    ]),
    getUnitsBySubject: vi.fn(async () => []),
    getLessonsByUnit: vi.fn(async () => []),
    getLessonById: vi.fn(async () => undefined),
    getObjectivesByLesson: vi.fn(async () => []),
    getObjectivesByIds: vi.fn(async () => []),
    getExperimentsByLesson: vi.fn(async () => []),
    getReviewQuestionsByLesson: vi.fn(async () => []),
    getMasteryQuestionsByLesson: vi.fn(async () => []),
    getGamesByLesson: vi.fn(async () => []),
  };
}

describe('teacher AI lesson context', () => {
  it('يحل الصف والمادة واسم الوحدة من ContentRepository بدل اشتقاقها من unitId', async () => {
    const context = await resolveTeacherAiLessonContext(
      repositoryFixture(),
      'g10-phy-waves-unit',
      'سلوك الموجات'
    );

    expect(context).toEqual({
      language: 'ar',
      gradeLabel: 'الصف العاشر',
      subjectLabel: 'الفيزياء',
      unitTitle: 'الموجات',
      lessonTitle: 'سلوك الموجات',
    });
  });

  it('يعيد unavailable إذا لم يوجد unitId بدل اختراع سياق', async () => {
    const repository = repositoryFixture();
    repository.getUnitsBySubjectAndSemester = vi.fn(async () => []);
    const { result } = renderHook(() =>
      useTeacherAiLessonContext({ repository, unitId: 'missing', lessonTitle: 'درس' })
    );

    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });
});

import { describe, expect, it } from 'vitest';

import {
  STUDENT_VISIBLE_GRADE_IDS,
  STUDENT_VISIBLE_SEMESTER_IDS,
  isStudentSemesterVisible,
} from '@content/student-content-release';
import {
  learningCatalogGrades,
  learningCatalogSemesters,
  learningCatalogUnits,
} from '@content/seed/learning-catalog.seed';
import {
  grade9Semester1CurriculumLessons,
  grade10Semester1CurriculumLessons,
} from '@content/seed/semester1-curriculum-lessons.seed';
import { publicContentVisibility } from '@content/seed/public-content-visibility.seed';
import { VIRTUAL_LABS } from '@features/virtual-labs/virtual-lab.registry';

describe('Phase 6-7C3c official semester-1 catalog', () => {
  it('يقصر المنتج على الصفين التاسع والعاشر', () => {
    expect(learningCatalogGrades.map(({ id }) => id)).toEqual(['g9', 'g10']);
    expect(STUDENT_VISIBLE_GRADE_IDS).toEqual(['g9', 'g10']);
  });

  it('يبقي فصلين لكل صف ويعرض الفصل الأول فقط للطالب', () => {
    expect(learningCatalogSemesters.filter(({ gradeId }) => gradeId === 'g9')).toHaveLength(2);
    expect(learningCatalogSemesters.filter(({ gradeId }) => gradeId === 'g10')).toHaveLength(2);
    expect(STUDENT_VISIBLE_SEMESTER_IDS).toEqual(['g9-sem1', 'g10-sem1']);
    expect(isStudentSemesterVisible('g9-sem2')).toBe(false);
    expect(isStudentSemesterVisible('g10-sem2')).toBe(false);
  });

  it('يحمل وحدات الفصل الأول الرسمية: 10 للتاسع و11 للعاشر', () => {
    expect(learningCatalogUnits.filter(({ semesterId }) => semesterId === 'g9-sem1')).toHaveLength(
      10
    );
    expect(learningCatalogUnits.filter(({ semesterId }) => semesterId === 'g10-sem1')).toHaveLength(
      11
    );
  });

  it('يحمل موضوعات الفصل الأول ويحافظ على اعتماد الدروس المرجعية المنشورة', () => {
    expect(grade9Semester1CurriculumLessons).toHaveLength(26);
    expect(grade10Semester1CurriculumLessons).toHaveLength(29);
    const referenceIds = new Set(['g9-phy-s1-u1-l1', 'g9-phy-s1-u1-l2', 'g9-phy-s1-u1-l3', 'g10-phy-s1-u1-l1']);
    for (const lesson of [
      ...grade9Semester1CurriculumLessons,
      ...grade10Semester1CurriculumLessons,
    ]) {
      if (
        lesson.id === 'g9-phy-s1-u1-l1' ||
        lesson.id === 'g9-phy-s1-u1-l2'
      ) {
        expect(lesson.status).toBe('approved');
      } else {
        expect(lesson.status).toBe('draft');
      }
      if (referenceIds.has(lesson.id)) {
        expect(lesson.objectiveIds.length).toBeGreaterThan(0);
        expect(lesson.keyConcepts.length).toBeGreaterThan(0);
        continue;
      }
      expect(lesson.objectiveIds).toEqual([]);
      expect(lesson.keyConcepts).toEqual([]);
      expect(lesson.examples).toEqual([]);
      expect(lesson.misconceptions).toEqual([]);
    }
  });

  it('يشتق إتاحة الوحدات من الفصل الأول ولا ينشر أي درس تلقائيًا', () => {
    expect(publicContentVisibility.gradeIds).toEqual(['g9', 'g10']);
    expect(publicContentVisibility.semesterIds).toEqual(['g9-sem1', 'g10-sem1']);
    expect(publicContentVisibility.unitIds).toHaveLength(21);
    expect(publicContentVisibility.lessonIds).toEqual([
      'g9-phy-s1-u1-l1',
      'g9-phy-s1-u1-l2',
    ]);
  });

  it('يربط المختبرات المنشورة بدروسها الحقيقية في الفصل الأول', () => {
    const measurement = VIRTUAL_LABS.find(({ id }) => id === 'measurement-lab-grade9');
    const staticElectricity = VIRTUAL_LABS.find(({ id }) => id === 'static-electricity-lab-g10');
    const circuits = VIRTUAL_LABS.find(({ id }) => id === 'circuit-components-lab-grade10');

    expect(measurement?.relatedLessonIds).toEqual([
      'g9-phy-s1-u1-l1',
      'g9-phy-s1-u1-l2',
      'g9-phy-s1-u1-l3',
    ]);
    expect(staticElectricity?.relatedLessonIds).toEqual(['g10-phy-s1-u1-l1']);
    expect(circuits?.relatedLessonIds).toEqual(['g10-phy-s1-u2-l1']);
  });
});

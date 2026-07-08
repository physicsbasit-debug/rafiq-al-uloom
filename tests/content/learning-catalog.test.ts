import { describe, it, expect } from 'vitest';
import {
  learningCatalogGrades,
  learningCatalogSubjects,
  learningCatalogUnits,
} from '@content/seed/learning-catalog.seed';
import { grade10PhysicsWavesLessons } from '@content/seed/grade10-physics-waves';
import {
  getGrades,
  getSubjectsByGrade,
  getUnitsBySubject,
  getLessonsByUnit,
  getLessonById,
} from '@services/data/local-content.repository';

const gradeIds = new Set(learningCatalogGrades.map((g) => g.id));
const subjectIds = new Set(learningCatalogSubjects.map((s) => s.id));

describe('catalog: وجود بيانات أساسية', () => {
  it('صف واحد على الأقل', () => {
    expect(learningCatalogGrades.length).toBeGreaterThan(0);
  });
  it('مادة واحدة على الأقل', () => {
    expect(learningCatalogSubjects.length).toBeGreaterThan(0);
  });
  it('وحدة واحدة على الأقل', () => {
    expect(learningCatalogUnits.length).toBeGreaterThan(0);
  });
});

describe('catalog: سلامة مفاتيح الربط', () => {
  it('كل مادة تشير إلى صف موجود', () => {
    for (const s of learningCatalogSubjects) {
      expect(gradeIds.has(s.gradeId)).toBe(true);
    }
  });
  it('كل وحدة تشير إلى مادة موجودة', () => {
    for (const u of learningCatalogUnits) {
      expect(subjectIds.has(u.subjectId)).toBe(true);
    }
  });
});

describe('catalog: تطابق الكتالوج مع محتوى 1-A', () => {
  it('كل unitId مستخدم في الدروس له وحدة مطابقة في الكتالوج', () => {
    const catalogUnitIds = new Set(learningCatalogUnits.map((u) => u.id));
    const lessonUnitIds = new Set(grade10PhysicsWavesLessons.map((l) => l.unitId));
    for (const uid of lessonUnitIds) {
      expect(catalogUnitIds.has(uid)).toBe(true);
    }
  });
});

describe('repository: القراءة', () => {
  it('getGrades يعيد الصفوف', () => {
    expect(getGrades().length).toBe(learningCatalogGrades.length);
  });

  it('getSubjectsByGrade يصفّي حسب الصف', () => {
    const first = learningCatalogGrades[0].id;
    const subjects = getSubjectsByGrade(first);
    expect(subjects.length).toBeGreaterThan(0);
    for (const s of subjects) expect(s.gradeId).toBe(first);
  });

  it('getUnitsBySubject يصفّي حسب المادة', () => {
    const first = learningCatalogSubjects[0].id;
    const units = getUnitsBySubject(first);
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) expect(u.subjectId).toBe(first);
  });

  it('getLessonsByUnit يعيد دروس الوحدة الأربعة مرتّبة', () => {
    const lessons = getLessonsByUnit('g10-phy-waves-unit');
    expect(lessons.length).toBe(4);
    for (let i = 1; i < lessons.length; i++) {
      expect(lessons[i].order).toBeGreaterThan(lessons[i - 1].order);
    }
  });

  it('getLessonsByUnit لوحدة غير موجودة يعيد فارغًا', () => {
    expect(getLessonsByUnit('no-such-unit').length).toBe(0);
  });

  it('getLessonById يعيد الدرس الصحيح أو undefined', () => {
    const lesson = getLessonById('g10-phy-waves-l1');
    expect(lesson?.id).toBe('g10-phy-waves-l1');
    expect(getLessonById('no-such-lesson')).toBe(undefined);
  });
});

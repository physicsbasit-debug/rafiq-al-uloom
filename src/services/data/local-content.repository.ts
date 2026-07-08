import type { Grade, Subject, Unit, Lesson } from '@shared-types/content.types';
import {
  learningCatalogGrades,
  learningCatalogSubjects,
  learningCatalogUnits,
} from '@content/seed/learning-catalog.seed';
import { grade10PhysicsWavesLessons } from '@content/seed/grade10-physics-waves';

/**
 * local-content.repository — الطبقة الوحيدة التي تستورد ملفات الـ seed.
 * دوال قراءة خالصة فقط: لا كتابة، لا شبكة، لا استنتاج (لا اشتقاق البنية من unitId).
 * مكوّنات الواجهة تستدعي هذه الدوال ولا تستورد الـ seed مباشرة.
 *
 * عند الانتقال إلى Supabase (Phase 2) تتبدّل هذه الطبقة وحدها، لا الشاشات.
 */

export function getGrades(): Grade[] {
  return learningCatalogGrades;
}

export function getSubjectsByGrade(gradeId: string): Subject[] {
  return learningCatalogSubjects.filter((s) => s.gradeId === gradeId);
}

export function getUnitsBySubject(subjectId: string): Unit[] {
  return learningCatalogUnits.filter((u) => u.subjectId === subjectId);
}

export function getLessonsByUnit(unitId: string): Lesson[] {
  return grade10PhysicsWavesLessons
    .filter((l) => l.unitId === unitId)
    .sort((a, b) => a.order - b.order);
}

// يُستخدم لاحقًا في 1-C (فتح درس مفرد) — موجود هنا كي لا تُكسر واجهة الـ repository لاحقًا.
export function getLessonById(lessonId: string): Lesson | undefined {
  return grade10PhysicsWavesLessons.find((l) => l.id === lessonId);
}

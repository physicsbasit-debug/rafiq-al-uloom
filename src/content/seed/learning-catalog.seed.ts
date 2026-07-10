import type { Grade, Semester, Subject, Unit } from '@shared-types/content.types';

/**
 * كتالوج التعلّم — بيانات البنية:
 * صف → فصل دراسي → مادة → وحدة.
 *
 * لا يلمس ملف محتوى 1-A المغلق:
 * src/content/seed/grade10-physics-waves.ts
 *
 * القاعدة المعمارية:
 * - المادة Subject تتبع الصف.
 * - الوحدة Unit تتبع المادة والفصل الدراسي.
 * - لا نربط Subject بالفصل حتى لا نكرر مادة الفيزياء لكل فصل.
 *
 * ملاحظة مؤقتة:
 * تم وضع وحدة الموجات في الفصل الدراسي الثاني مبدئيًا إلى أن يُثبَّت فهرس المنهج الرسمي.
 */

export const learningCatalogGrades: Grade[] = [
  { id: 'g10', name: 'الصف العاشر', order: 10 },
];

export const learningCatalogSemesters: Semester[] = [
  { id: 'g10-sem1', gradeId: 'g10', name: 'الفصل الدراسي الأول', order: 1 },
  { id: 'g10-sem2', gradeId: 'g10', name: 'الفصل الدراسي الثاني', order: 2 },
];

export const learningCatalogSubjects: Subject[] = [
  {
    id: 'g10-physics',
    gradeId: 'g10',
    name: 'الفيزياء',
    themeColor: '#2F6FED',
  },
];

export const learningCatalogUnits: Unit[] = [
  {
    id: 'g10-phy-waves-unit',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem2',
    title: 'الموجات',
    order: 1,
  },
];

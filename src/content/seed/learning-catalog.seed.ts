import type { Grade, Subject, Unit } from '@shared-types/content.types';

/**
 * كتالوج التعلّم — بيانات البنية (صف/مادة/وحدة).
 * مستقل عن ملف محتوى 1-A المغلق (grade10-physics-waves.ts).
 * أسماء التصدير عامة لتسمح بإضافة صفوف/مواد/وحدات لاحقًا بلا إعادة تسمية.
 *
 * قيد تطابق حرج: Unit.id هنا يجب أن يساوي unitId المستخدم في دروس 1-A
 * ("g10-phy-waves-unit")، وإلا ينكسر ربط الوحدة بدروسها بصمت.
 *
 * ملاحظة طبقات: themeColor قيمة نصية ثابتة (بيانات)، لا تستورد design-system.
 * القيمة "#2F6FED" مطابقة قصديًا للون الأساسي في الثيم، لكنها لا تُربط به برمجيًا.
 */

export const learningCatalogGrades: Grade[] = [{ id: 'g10', name: 'الصف العاشر', order: 10 }];

export const learningCatalogSubjects: Subject[] = [
  { id: 'g10-physics', gradeId: 'g10', name: 'الفيزياء', themeColor: '#2F6FED' },
];

export const learningCatalogUnits: Unit[] = [
  { id: 'g10-phy-waves-unit', subjectId: 'g10-physics', title: 'الموجات', order: 1 },
];

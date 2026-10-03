import type { Grade, Semester, Subject, Unit } from '@shared-types/content.types';

/**
 * الكتالوج الرسمي للفصل الدراسي الأول 2026/2027.
 *
 * مصادر أسماء الوحدات:
 * - الخطة الفصلية لمادة الفيزياء للصف التاسع 2026/2027 - الفصل الأول.
 * - الخطة الفصلية لمادة الفيزياء للصف العاشر 2026/2027 - الفصل الأول.
 *
 * الفصل الثاني موجود بنيويًا، لكنه غير متاح للطالب في الإصدار الحالي.
 * وحدة الموجات القديمة باقية كعينة داخلية في g10-sem2 فقط حتى يتوفر
 * مصدر رسمي للفصل الثاني؛ لا تُعامل بوصفها تعيينًا منهجيًا رسميًا.
 */

export const learningCatalogGrades: Grade[] = [
  { id: 'g9', name: 'الصف التاسع', order: 9 },
  { id: 'g10', name: 'الصف العاشر', order: 10 },
];

export const learningCatalogSemesters: Semester[] = [
  { id: 'g9-sem1', gradeId: 'g9', name: 'الفصل الدراسي الأول', order: 1 },
  { id: 'g9-sem2', gradeId: 'g9', name: 'الفصل الدراسي الثاني', order: 2 },
  { id: 'g10-sem1', gradeId: 'g10', name: 'الفصل الدراسي الأول', order: 1 },
  { id: 'g10-sem2', gradeId: 'g10', name: 'الفصل الدراسي الثاني', order: 2 },
];

export const learningCatalogSubjects: Subject[] = [
  {
    id: 'g9-physics',
    gradeId: 'g9',
    name: 'الفيزياء',
    themeColor: '#00695c',
  },
  {
    id: 'g10-physics',
    gradeId: 'g10',
    name: 'الفيزياء',
    themeColor: '#00695c',
  },
];

export const learningCatalogUnits: Unit[] = [
  {
    id: 'g9-phy-s1-u1-length-time',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'الطول والزمن',
    order: 1,
  },
  {
    id: 'g9-phy-s1-u2-motion',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'الحركة',
    order: 2,
  },
  {
    id: 'g9-phy-s1-u3-mass-weight',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'الكتلة والوزن',
    order: 3,
  },
  {
    id: 'g9-phy-s1-u4-density',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'الكثافة',
    order: 4,
  },
  {
    id: 'g9-phy-s1-u5-particle-model',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'نموذج الحركة الجزيئية البسيطة للمادة',
    order: 5,
  },
  {
    id: 'g9-phy-s1-u6-thermal-properties',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'المادة والخصائص الحرارية',
    order: 6,
  },
  {
    id: 'g9-phy-s1-u7-temperature',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'قياس درجة الحرارة',
    order: 7,
  },
  {
    id: 'g9-phy-s1-u8-energy',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'الطاقة',
    order: 8,
  },
  {
    id: 'g9-phy-s1-u9-energy-transfer',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'انتقال الطاقة',
    order: 9,
  },
  {
    id: 'g9-phy-s1-u10-transfer-applications',
    subjectId: 'g9-physics',
    semesterId: 'g9-sem1',
    title: 'التطبيقات والآثار المترتبة على نقل الطاقة',
    order: 10,
  },
  {
    id: 'g10-phy-s1-u1-electric-charge',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'الشحنة الكهربائية',
    order: 1,
  },
  {
    id: 'g10-phy-s1-u2-circuit-diagrams',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'مخططات الدوائر الكهربائية',
    order: 2,
  },
  {
    id: 'g10-phy-s1-u3-electrical-hazards',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'مخاطر الكهرباء',
    order: 3,
  },
  {
    id: 'g10-phy-s1-u4-effects-of-forces',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'تأثيرات القوى',
    order: 4,
  },
  {
    id: 'g10-phy-s1-u5-moments-centre-mass',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'عزم القوة ومركز الكتلة',
    order: 5,
  },
  {
    id: 'g10-phy-s1-u6-work-power',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'الشغل والقدرة',
    order: 6,
  },
  {
    id: 'g10-phy-s1-u7-pressure',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'الضغط',
    order: 7,
  },
  {
    id: 'g10-phy-s1-u8-nuclear-physics',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'فيزياء النواة',
    order: 8,
  },
  {
    id: 'g10-phy-s1-u9-radioactivity',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'النشاط الإشعاعي',
    order: 9,
  },
  {
    id: 'g10-phy-s1-u10-decay-half-life',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'الاضمحلال الإشعاعي وعمر النصف',
    order: 10,
  },
  {
    id: 'g10-phy-s1-u11-safety',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem1',
    title: 'احتياطات السلامة',
    order: 11,
  },
  {
    id: 'g10-phy-waves-unit',
    subjectId: 'g10-physics',
    semesterId: 'g10-sem2',
    title: 'الموجات',
    order: 1,
  },
];

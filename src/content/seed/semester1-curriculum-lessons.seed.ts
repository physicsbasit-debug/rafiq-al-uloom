import type { Lesson } from '@shared-types/content.types';
import {
  grade9ImportanceMeasurementReferenceLesson,
  grade9LengthVolumeReferenceLesson,
  grade10StaticElectricityReferenceLesson,
} from './semester1-reference-lessons.seed';

/**
 * عناوين موضوعات الفصل الدراسي الأول 2026/2027 كما وردت في الخطتين الفصليتين
 * للصفين التاسع والعاشر.
 *
 * هذه سجلات هيكلية فقط وليست محتوى منشورًا:
 * - status = draft
 * - لا أهداف أو شرح أو أسئلة مخمّنة.
 * - مرحلة 6-7C4 مسؤولة عن بناء كل درس واعتماده قبل إتاحته للطالب.
 */

function plannedLesson(id: string, unitId: string, title: string, order: number): Lesson {
  return {
    id,
    unitId,
    title,
    order,
    objectiveIds: [],
    summary: 'المحتوى التعليمي لهذا الدرس قيد الإعداد والمراجعة قبل النشر للطلبة.',
    keyConcepts: [],
    examples: [],
    misconceptions: [],
    status: 'draft',
    source: 'curriculum_seed',
  };
}

export const grade9Semester1CurriculumLessons: Lesson[] = [
  grade9ImportanceMeasurementReferenceLesson,
  grade9LengthVolumeReferenceLesson,
  plannedLesson('g9-phy-s1-u1-l3', 'g9-phy-s1-u1-length-time', '1-3 قياس الزمن', 3),
  plannedLesson('g9-phy-s1-u2-l1', 'g9-phy-s1-u2-motion', '2-1 فهم السرعة', 1),
  plannedLesson('g9-phy-s1-u2-l2', 'g9-phy-s1-u2-motion', '2-2 التمثيل البياني (المسافة/الزمن)', 2),
  plannedLesson('g9-phy-s1-u2-l3', 'g9-phy-s1-u2-motion', '2-3 فهم التسارع', 3),
  plannedLesson('g9-phy-s1-u2-l4', 'g9-phy-s1-u2-motion', '2-4 حساب السرعة والتسارع', 4),
  plannedLesson('g9-phy-s1-u3-l1', 'g9-phy-s1-u3-mass-weight', '3-1 الكتلة والوزن والجاذبية', 1),
  plannedLesson('g9-phy-s1-u4-l1', 'g9-phy-s1-u4-density', '4-1 الكثافة', 1),
  plannedLesson('g9-phy-s1-u5-l1', 'g9-phy-s1-u5-particle-model', '5-1 حالات المادة', 1),
  plannedLesson(
    'g9-phy-s1-u5-l2',
    'g9-phy-s1-u5-particle-model',
    '5-2 نموذج الحركة الجزيئية البسيطة للمادة',
    2
  ),
  plannedLesson(
    'g9-phy-s1-u5-l3',
    'g9-phy-s1-u5-particle-model',
    '5-3 القوى والنظرية الجزيئية البسيطة للمادة',
    3
  ),
  plannedLesson(
    'g9-phy-s1-u5-l4',
    'g9-phy-s1-u5-particle-model',
    '5-4 المواد الغازية ونموذج الحركة الجزيئية البسيط للمادة',
    4
  ),
  plannedLesson('g9-phy-s1-u6-l1', 'g9-phy-s1-u6-thermal-properties', '6-1 التمدد الحراري', 1),
  plannedLesson(
    'g9-phy-s1-u7-l1',
    'g9-phy-s1-u7-temperature',
    '7-1 درجة الحرارة وموازين الحرارة',
    1
  ),
  plannedLesson('g9-phy-s1-u7-l2', 'g9-phy-s1-u7-temperature', '7-2 تصميم ميزان حرارة', 2),
  plannedLesson('g9-phy-s1-u8-l1', 'g9-phy-s1-u8-energy', '8-1 التغيرات في الطاقة', 1),
  plannedLesson('g9-phy-s1-u8-l2', 'g9-phy-s1-u8-energy', '8-2 تطبيقات على تغيرات الطاقة', 2),
  plannedLesson('g9-phy-s1-u8-l3', 'g9-phy-s1-u8-energy', '8-3 حفظ الطاقة', 3),
  plannedLesson('g9-phy-s1-u8-l4', 'g9-phy-s1-u8-energy', '8-4 حسابات الطاقة', 4),
  plannedLesson('g9-phy-s1-u8-l5', 'g9-phy-s1-u8-energy', '8-5 القدرة', 5),
  plannedLesson('g9-phy-s1-u8-l6', 'g9-phy-s1-u8-energy', '8-6 حساب القدرة', 6),
  plannedLesson('g9-phy-s1-u9-l1', 'g9-phy-s1-u9-energy-transfer', '9-1 التوصيل', 1),
  plannedLesson('g9-phy-s1-u9-l2', 'g9-phy-s1-u9-energy-transfer', '9-2 الحمل الحراري', 2),
  plannedLesson('g9-phy-s1-u9-l3', 'g9-phy-s1-u9-energy-transfer', '9-3 الإشعاع', 3),
  plannedLesson(
    'g9-phy-s1-u10-l1',
    'g9-phy-s1-u10-transfer-applications',
    '10-1 بعض التطبيقات والآثار المترتبة على نقل الطاقة',
    1
  ),
];

export const grade10Semester1CurriculumLessons: Lesson[] = [
  grade10StaticElectricityReferenceLesson,
  plannedLesson(
    'g10-phy-s1-u1-l2',
    'g10-phy-s1-u1-electric-charge',
    '1-2 الاحتكاك والشحن الكهربائي',
    2
  ),
  plannedLesson(
    'g10-phy-s1-u1-l3',
    'g10-phy-s1-u1-electric-charge',
    '1-3 المجالات الكهربائية والشحنة الكهربائية',
    3
  ),
  plannedLesson(
    'g10-phy-s1-u1-l4',
    'g10-phy-s1-u1-electric-charge',
    '1-4 الموصلات الكهربائية والعوازل',
    4
  ),
  plannedLesson(
    'g10-phy-s1-u2-l1',
    'g10-phy-s1-u2-circuit-diagrams',
    '2-1 مكونات الدائرة الكهربائية',
    1
  ),
  plannedLesson('g10-phy-s1-u2-l2', 'g10-phy-s1-u2-circuit-diagrams', '2-2 توصيل المقاومات', 2),
  plannedLesson(
    'g10-phy-s1-u3-l1',
    'g10-phy-s1-u3-electrical-hazards',
    '3-1 المخاطر الكهربائية',
    1
  ),
  plannedLesson('g10-phy-s1-u3-l2', 'g10-phy-s1-u3-electrical-hazards', '3-2 المنصهرات', 2),
  plannedLesson(
    'g10-phy-s1-u4-l1',
    'g10-phy-s1-u4-effects-of-forces',
    '4-1 القوى المؤثرة على قطار الملاهي',
    1
  ),
  plannedLesson(
    'g10-phy-s1-u4-l2',
    'g10-phy-s1-u4-effects-of-forces',
    '4-2 القوى المؤثرة على المركبة الفضائية',
    2
  ),
  plannedLesson(
    'g10-phy-s1-u4-l3',
    'g10-phy-s1-u4-effects-of-forces',
    '4-3 القوة والكتلة والتسارع',
    3
  ),
  plannedLesson('g10-phy-s1-u4-l4', 'g10-phy-s1-u4-effects-of-forces', '4-4 استطالة الزنبرك', 4),
  plannedLesson('g10-phy-s1-u4-l5', 'g10-phy-s1-u4-effects-of-forces', '4-5 قانون هوك', 5),
  plannedLesson('g10-phy-s1-u5-l1', 'g10-phy-s1-u5-moments-centre-mass', '5-1 عزم القوة', 1),
  plannedLesson('g10-phy-s1-u5-l2', 'g10-phy-s1-u5-moments-centre-mass', '5-2 حساب عزم القوة', 2),
  plannedLesson(
    'g10-phy-s1-u5-l3',
    'g10-phy-s1-u5-moments-centre-mass',
    '5-3 الاستقرار ومركز الكتلة',
    3
  ),
  plannedLesson('g10-phy-s1-u6-l1', 'g10-phy-s1-u6-work-power', '6-1 الشغل المبذول', 1),
  plannedLesson('g10-phy-s1-u6-l2', 'g10-phy-s1-u6-work-power', '6-2 حساب الشغل المبذول', 2),
  plannedLesson('g10-phy-s1-u6-l3', 'g10-phy-s1-u6-work-power', '6-3 القدرة', 3),
  plannedLesson('g10-phy-s1-u7-l1', 'g10-phy-s1-u7-pressure', '7-1 الضغط على سطح', 1),
  plannedLesson('g10-phy-s1-u7-l2', 'g10-phy-s1-u7-pressure', '7-2 حساب الضغط', 2),
  plannedLesson('g10-phy-s1-u8-l1', 'g10-phy-s1-u8-nuclear-physics', '8-1 بنية النواة', 1),
  plannedLesson(
    'g10-phy-s1-u9-l1',
    'g10-phy-s1-u9-radioactivity',
    '9-1 النشاط الإشعاعي في كل مكان',
    1
  ),
  plannedLesson('g10-phy-s1-u9-l2', 'g10-phy-s1-u9-radioactivity', '9-2 فهم النشاط الإشعاعي', 2),
  plannedLesson('g10-phy-s1-u9-l3', 'g10-phy-s1-u9-radioactivity', '9-3 استخدام النظائر المشعة', 3),
  plannedLesson(
    'g10-phy-s1-u10-l1',
    'g10-phy-s1-u10-decay-half-life',
    '10-1 تناقص النشاط الإشعاعي مع مرور الزمن',
    1
  ),
  plannedLesson(
    'g10-phy-s1-u10-l2',
    'g10-phy-s1-u10-decay-half-life',
    '10-2 معادلات الاضمحلال الإشعاعي',
    2
  ),
  plannedLesson(
    'g10-phy-s1-u10-l3',
    'g10-phy-s1-u10-decay-half-life',
    '10-3 عمر النصف للمادة المشعة',
    3
  ),
  plannedLesson('g10-phy-s1-u11-l1', 'g10-phy-s1-u11-safety', '11-1 التعامل الآمن', 1),
];

export const semester1CurriculumLessons: Lesson[] = [
  ...grade9Semester1CurriculumLessons,
  ...grade10Semester1CurriculumLessons,
];

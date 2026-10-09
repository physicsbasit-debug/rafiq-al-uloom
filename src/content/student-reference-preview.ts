const STUDENT_REFERENCE_PREVIEW_LESSON_IDS = new Set(['g10-phy-s1-u1-l1', 'g9-phy-s1-u1-l3']);

/**
 * عقد معاينة مؤقت للدروس المرجعية التي لم تُعتمد بعد للنشر الطلابي.
 * لا يغيّر status ولا public visibility ولا RLS.
 *
 * الدروس المعتمدة تخرج من هذا المسار عند النشر الرسمي. درس 1-3 «قياس الزمن»
 * يدخل المعاينة المؤقتة أثناء بناء مساراته، مع بقاء الكهرباء الساكنة في المعاينة.
 */
export function isStudentReferencePreviewLesson(lessonId: string): boolean {
  return STUDENT_REFERENCE_PREVIEW_LESSON_IDS.has(lessonId);
}

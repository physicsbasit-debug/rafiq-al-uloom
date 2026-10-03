const STUDENT_REFERENCE_PREVIEW_LESSON_IDS = new Set(['g10-phy-s1-u1-l1', 'g9-phy-s1-u1-l2']);

/**
 * عقد معاينة مؤقت للدروس المرجعية التي لم تُعتمد بعد للنشر الطلابي.
 * لا يغيّر status ولا public visibility ولا RLS.
 *
 * درس الصف التاسع 1-1 «أهمية القياس» خرج من هذا المسار بعد اعتماد
 * ميثاق رفيق الذهبي، وبقي درس الكهرباء الساكنة فقط في المعاينة المؤقتة.
 */
export function isStudentReferencePreviewLesson(lessonId: string): boolean {
  return STUDENT_REFERENCE_PREVIEW_LESSON_IDS.has(lessonId);
}

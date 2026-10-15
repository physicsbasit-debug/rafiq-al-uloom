const STUDENT_REFERENCE_PREVIEW_LESSON_IDS = new Set(['g10-phy-s1-u1-l1']);

/**
 * عقد معاينة مؤقت للدروس المرجعية التي لم تُعتمد بعد للنشر الطلابي.
 * لا يغيّر status ولا public visibility ولا RLS.
 *
 * الدروس المعتمدة تخرج من هذا المسار عند النشر الرسمي.
 * يبقى درس الكهرباء الساكنة فقط في المعاينة المؤقتة حاليًا.
 */
export function isStudentReferencePreviewLesson(lessonId: string): boolean {
  return STUDENT_REFERENCE_PREVIEW_LESSON_IDS.has(lessonId);
}

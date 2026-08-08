import type {
  AuthoringRejectionReason,
  AuthoringUnavailableReason,
  LessonRevision,
  LessonRevisionPayload,
  LessonRevisionStatus,
} from '@services/authoring';

import type { TeacherRevisionFilter } from './teacher-workspace.types';

const STATUS_LABELS: Record<LessonRevisionStatus, string> = {
  draft: 'مسودة',
  pending_review: 'قيد المراجعة',
  rejected: 'يحتاج إلى تعديل',
  approved: 'معتمد',
};

const UNAVAILABLE_MESSAGES: Record<AuthoringUnavailableReason, string> = {
  network_error: 'تعذر الاتصال بالخدمة. تحقق من الاتصال ثم حاول مجددًا.',
  service_unavailable: 'خدمة التأليف غير متاحة حاليًا. حاول لاحقًا.',
  unknown: 'تعذر إكمال العملية بسبب خطأ غير متوقع. حاول مجددًا.',
};

const REJECTION_MESSAGES: Record<AuthoringRejectionReason, string> = {
  not_authenticated: 'انتهت جلسة الدخول. أعد تسجيل الدخول للمتابعة.',
  not_authorized: 'لا تملك صلاحية تنفيذ هذه العملية.',
  invalid_payload: 'بيانات الدرس غير مكتملة أو غير صالحة. راجع محتوى النموذج.',
  unit_not_available: 'الوحدة المحددة لم تعد متاحة. حدّث البيانات ثم اختر وحدة متاحة.',
  lesson_not_available: 'الدرس المرتبط بهذه النسخة لم يعد متاحًا للتعديل.',
  source_revision_not_available: 'النسخة التي يعتمد عليها هذا التعديل لم تعد متاحة.',
  source_revision_mismatch: 'تغيّرت النسخة المرجعية منذ فتحها. حدّث البيانات قبل المتابعة.',
  revision_not_editable: 'هذه النسخة ليست قابلة للتعديل في حالتها الحالية.',
  revision_not_submittable: 'لا يمكن إرسال هذه النسخة للمراجعة في حالتها الحالية.',
  revision_not_reviewable: 'تعذر إكمال العملية بسبب حالة المراجعة الحالية.',
  invalid_decision: 'تعذر إكمال العملية بسبب استجابة مراجعة غير صالحة.',
  review_note_required: 'تعذر إكمال العملية لأن بيانات المراجعة غير مكتملة.',
  stale_revision: 'توجد نسخة أحدث من هذه المسودة. حدّث البيانات قبل متابعة العمل.',
  canonical_position_conflict: 'يوجد تعارض مع موضع المحتوى المعتمد حاليًا. حدّث البيانات أولًا.',
  invalid_revision_id: 'معرّف النسخة غير صالح. أعد فتح المسودة من مساحة العمل.',
};

export function createEmptyTeacherLessonPayload(): LessonRevisionPayload {
  return {
    lesson: {
      unitId: '',
      title: '',
      displayOrder: 1,
      summary: '',
      keyConcepts: [],
      examples: [],
      misconceptions: [],
    },
    objectives: [],
    questions: [],
    games: [],
    experiments: [],
  };
}

export function teacherRevisionStatusLabel(status: LessonRevisionStatus): string {
  return STATUS_LABELS[status];
}

export function teacherDraftsUnavailableMessage(reason: AuthoringUnavailableReason): string {
  return UNAVAILABLE_MESSAGES[reason];
}

export function teacherAuthoringFailureMessage(
  reason: AuthoringRejectionReason | AuthoringUnavailableReason
): string {
  if (reason in REJECTION_MESSAGES) {
    return REJECTION_MESSAGES[reason as AuthoringRejectionReason];
  }
  return UNAVAILABLE_MESSAGES[reason as AuthoringUnavailableReason];
}

export function filterTeacherRevisions(
  revisions: readonly LessonRevision[],
  filter: TeacherRevisionFilter
): readonly LessonRevision[] {
  if (filter === 'all') return revisions;
  return revisions.filter((revision) => revision.status === filter);
}

export function formatTeacherRevisionUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير متاح';
  return new Intl.DateTimeFormat('ar-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

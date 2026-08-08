import type {
  AuthoringRejectionReason,
  AuthoringUnavailableReason,
  LessonRevision,
} from '@services/authoring';

const UNAVAILABLE_MESSAGES: Record<AuthoringUnavailableReason, string> = {
  network_error: 'تعذر الاتصال بخدمة المراجعة. تحقق من الاتصال ثم حاول مجددًا.',
  service_unavailable: 'خدمة المراجعة غير متاحة حاليًا. حاول لاحقًا.',
  unknown: 'تعذر إكمال عملية المراجعة بسبب خطأ غير متوقع. حاول مجددًا.',
};

const REJECTION_MESSAGES: Record<AuthoringRejectionReason, string> = {
  not_authenticated: 'انتهت جلسة الدخول أو لم تعد صالحة. سجّل الدخول ثم حاول مجددًا.',
  not_authorized: 'لا تملك صلاحية تنفيذ قرار المراجعة هذا.',
  invalid_payload: 'بيانات الطلب غير صالحة لإتمام المراجعة.',
  unit_not_available: 'الوحدة المرتبطة بهذه النسخة لم تعد متاحة.',
  lesson_not_available: 'الدرس المرتبط بهذه النسخة لم يعد متاحًا.',
  source_revision_not_available: 'النسخة المصدر لم تعد متاحة.',
  source_revision_mismatch: 'بيانات النسخة المصدر لم تعد متطابقة مع الطلب الحالي.',
  revision_not_editable: 'هذه النسخة ليست قابلة للتحرير.',
  revision_not_submittable: 'هذه النسخة ليست قابلة للإرسال للمراجعة.',
  revision_not_reviewable: 'هذه النسخة لم تعد قابلة للمراجعة. حدّث قائمة المراجعة.',
  invalid_decision: 'قرار المراجعة غير صالح.',
  review_note_required: 'اكتب ملاحظة واضحة قبل رفض النسخة.',
  stale_revision: 'تغيّرت حالة النسخة منذ فتحها. حدّث قائمة المراجعة قبل اتخاذ قرار جديد.',
  canonical_position_conflict: 'تعذر اعتماد النسخة بسبب تعارض في موضع المحتوى المنشور.',
  invalid_revision_id: 'معرّف النسخة غير صالح للمراجعة.',
};

export function reviewerPendingUnavailableMessage(reason: AuthoringUnavailableReason): string {
  return UNAVAILABLE_MESSAGES[reason];
}

export function reviewerReviewRejectionMessage(reason: AuthoringRejectionReason): string {
  return REJECTION_MESSAGES[reason];
}

export function reviewerReviewUnavailableMessage(reason: AuthoringUnavailableReason): string {
  return UNAVAILABLE_MESSAGES[reason];
}

export function reviewerReviewIdentityMismatchMessage(): string {
  return 'تعذر تأكيد نتيجة المراجعة لأن معرّف النسخة في الاستجابة لا يطابق النسخة المفتوحة. حدّث القائمة وحاول مجددًا.';
}

export function reviewerReviewUnexpectedSuccessMessage(): string {
  return 'أعادت خدمة المراجعة نتيجة نجاح غير متوافقة مع القرار المطلوب. لم تُعتمد النتيجة محليًا.';
}

export function formatReviewerSubmittedAt(revision: LessonRevision): string {
  const value = revision.submittedAt ?? revision.updatedAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير متاح';
  return new Intl.DateTimeFormat('ar-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

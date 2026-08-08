import type { AuthoringUnavailableReason, LessonRevision } from '@services/authoring';

const UNAVAILABLE_MESSAGES: Record<AuthoringUnavailableReason, string> = {
  network_error: 'تعذر الاتصال بخدمة المراجعة. تحقق من الاتصال ثم حاول مجددًا.',
  service_unavailable: 'خدمة المراجعة غير متاحة حاليًا. حاول لاحقًا.',
  unknown: 'تعذر تحميل قائمة المراجعة بسبب خطأ غير متوقع. حاول مجددًا.',
};

export function reviewerPendingUnavailableMessage(reason: AuthoringUnavailableReason): string {
  return UNAVAILABLE_MESSAGES[reason];
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

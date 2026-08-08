import type {
  AuthoringUnavailableReason,
  LessonRevision,
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
  unknown: 'تعذر تحميل مسوداتك بسبب خطأ غير متوقع. حاول مجددًا.',
};

export function teacherRevisionStatusLabel(status: LessonRevisionStatus): string {
  return STATUS_LABELS[status];
}

export function teacherDraftsUnavailableMessage(reason: AuthoringUnavailableReason): string {
  return UNAVAILABLE_MESSAGES[reason];
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

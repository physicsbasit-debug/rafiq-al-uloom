import type { ChangeEvent } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevision, ReviewService } from '@services/authoring';

import type { ReviewerDecisionCommitted } from './reviewer-workspace.types';
import { useReviewerRevisionReview } from './useReviewerRevisionReview';

interface ReviewerRevisionReviewProps {
  readonly service: ReviewService;
  readonly revision: LessonRevision;
  readonly onBack: () => void;
  readonly onDecisionCommitted: (outcome: ReviewerDecisionCommitted) => void;
}

function lines(value: readonly string[]): string {
  return value.length ? value.join('، ') : 'لا يوجد';
}

export function ReviewerRevisionReview({
  service,
  revision,
  onBack,
  onDecisionCommitted,
}: ReviewerRevisionReviewProps) {
  const {
    reviewRevisionId,
    reviewNote,
    isReviewLocked,
    setReviewNote,
    validateRejectNote,
    review,
    isReviewing,
    error,
  } = useReviewerRevisionReview({ service, revision, onDecisionCommitted });

  const requestApprove = () => {
    if (isReviewLocked()) return;
    const confirmed = window.confirm('اعتماد هذه النسخة ونشرها؟');
    if (!confirmed) return;
    void review('approve');
  };

  const requestReject = () => {
    if (isReviewLocked() || !validateRejectNote()) return;
    const confirmed = window.confirm('رفض هذه النسخة وإعادتها للمعلم مع الملاحظة المكتوبة؟');
    if (!confirmed) return;
    void review('reject');
  };

  return (
    <section aria-labelledby="reviewer-revision-review-title">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 id="reviewer-revision-review-title" style={{ margin: 0 }}>
            مراجعة: {revision.payload.lesson.title}
          </h2>
          <p style={{ margin: '0.35rem 0 0' }}>
            راجع النسخة المرسلة ثم اعتمدها أو أعدها للمعلم مع ملاحظة واضحة.
          </p>
        </div>
        <div style={{ width: '150px' }}>
          <AppButton label="العودة للقائمة" variant="secondary" onClick={() => { if (!isReviewLocked()) onBack(); }} disabled={isReviewing} />
        </div>
      </div>

      {error ? (
        <div role="alert" style={{ marginBottom: '1rem' }}>
          {error.message}
        </div>
      ) : null}

      <dl>
        <dt>معرّف النسخة قيد المراجعة</dt>
        <dd>{reviewRevisionId}</dd>
        <dt>رقم الإصدار</dt>
        <dd>{revision.revisionNumber}</dd>
        <dt>الحالة</dt>
        <dd>قيد المراجعة</dd>
      </dl>

      <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }}>
        <div>
          <strong>الوحدة:</strong> {revision.payload.lesson.unitId}
        </div>
        <div>
          <strong>ملخص الدرس:</strong> {revision.payload.lesson.summary || 'لا يوجد'}
        </div>
        <div>
          <strong>المفاهيم الأساسية:</strong> {lines(revision.payload.lesson.keyConcepts)}
        </div>
        <div>
          <strong>الأمثلة:</strong> {lines(revision.payload.lesson.examples)}
        </div>
        <div>
          <strong>التصورات البديلة:</strong> {lines(revision.payload.lesson.misconceptions)}
        </div>
        <div>
          <strong>المحتوى البنيوي:</strong> {revision.payload.objectives.length} أهداف،{' '}
          {revision.payload.questions.length} أسئلة، {revision.payload.games.length} ألعاب،{' '}
          {revision.payload.experiments.length} تجارب.
        </div>
      </div>

      <label style={{ display: 'grid', gap: '0.35rem', marginTop: '1rem' }}>
        ملاحظة الرفض
        <textarea
          aria-label="ملاحظة الرفض"
          value={reviewNote}
          disabled={isReviewing}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setReviewNote(event.target.value)}
          placeholder="مطلوبة عند رفض النسخة"
        />
      </label>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <div style={{ width: '180px' }}>
          <AppButton
            label={isReviewing ? 'جارٍ تنفيذ القرار...' : 'اعتماد النسخة'}
            onClick={requestApprove}
            disabled={isReviewing}
          />
        </div>
        <div style={{ width: '180px' }}>
          <AppButton
            label={isReviewing ? 'جارٍ تنفيذ القرار...' : 'رفض وإعادة للتعديل'}
            variant="secondary"
            onClick={requestReject}
            disabled={isReviewing}
          />
        </div>
      </div>
    </section>
  );
}

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

function difficultyLabel(
  value: LessonRevision['payload']['questions'][number]['difficulty']
): string {
  switch (value) {
    case 'easy':
      return 'سهل';
    case 'medium':
      return 'متوسط';
    case 'hard':
      return 'صعب';
  }
}

function purposeLabel(value: LessonRevision['payload']['questions'][number]['purpose']): string {
  return value === 'mastery' ? 'إتقان' : 'مراجعة';
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

  const objectiveTextByKey = new Map(
    revision.payload.objectives.map((objective) => [objective.key, objective.text] as const)
  );

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
          <AppButton
            label="العودة للقائمة"
            variant="secondary"
            onClick={() => {
              if (!isReviewLocked()) onBack();
            }}
            disabled={isReviewing}
          />
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
      </div>

      <section aria-labelledby="reviewer-objectives-title" style={{ marginTop: '1.25rem' }}>
        <h3 id="reviewer-objectives-title">أهداف التعلم</h3>
        {revision.payload.objectives.length === 0 ? (
          <p>لا توجد أهداف تعلم في هذه النسخة.</p>
        ) : (
          <ol>
            {revision.payload.objectives.map((objective, index) => (
              <li key={objective.key}>
                <strong>الهدف {index + 1}:</strong> {objective.text}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="reviewer-questions-title" style={{ marginTop: '1.25rem' }}>
        <h3 id="reviewer-questions-title">أسئلة الدرس</h3>
        {revision.payload.questions.length === 0 ? (
          <p>لا توجد أسئلة في هذه النسخة.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {revision.payload.questions.map((question, index) => {
              const correctAnswer = question.choices[question.correctAnswerIndex] ?? 'غير محددة';
              const linkedObjective = objectiveTextByKey.get(question.objectiveKey) ?? 'غير موجود';

              return (
                <article
                  key={question.key}
                  aria-label={`تفاصيل السؤال ${index + 1}`}
                  style={{
                    border: '1px solid currentColor',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <div>
                    <strong>الغرض:</strong> {purposeLabel(question.purpose)}
                  </div>
                  <div>
                    <strong>نص السؤال:</strong> {question.prompt}
                  </div>
                  <div>
                    <strong>الاختيارات:</strong>
                    <ol>
                      {question.choices.map((choice, choiceIndex) => (
                        <li key={choiceIndex}>
                          {choice}
                          {choiceIndex === question.correctAnswerIndex ? ' — الإجابة الصحيحة' : ''}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <strong>الإجابة الصحيحة:</strong> {correctAnswer}
                  </div>
                  <div>
                    <strong>شرح الإجابة:</strong> {question.explanation}
                  </div>
                  <div>
                    <strong>الصعوبة:</strong> {difficultyLabel(question.difficulty)}
                  </div>
                  <div>
                    <strong>الهدف المرتبط:</strong> {linkedObjective}
                  </div>
                  <div>
                    <strong>مفتاح الهدف المرتبط:</strong> <code>{question.objectiveKey}</code>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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

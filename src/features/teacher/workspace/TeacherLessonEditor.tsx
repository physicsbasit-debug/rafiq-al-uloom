import type { ChangeEvent } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import { AppCard } from '@design-system/components/AppCard';
import type { AuthoringService, LessonRevision, LessonRevisionPayload } from '@services/authoring';

import { TeacherObjectivesEditor } from './TeacherObjectivesEditor';
import { TeacherQuestionsEditor } from './TeacherQuestionsEditor';
import { getQuestionStateIssue } from './teacher-lesson-structure';
import {
  getLessonSubmissionReadiness,
  type SubmissionReadinessReason,
} from './teacher-submission-readiness';
import { useTeacherLessonEditor } from './useTeacherLessonEditor';
import './teacher-workspace.css';

interface TeacherLessonEditorProps {
  readonly service: AuthoringService;
  readonly revision?: LessonRevision | null;
  readonly onBack: () => void;
}

function linesToArray(value: string): readonly string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToLines(value: readonly string[]): string {
  return value.join('\n');
}

const SUBMISSION_REASON_MESSAGES: Readonly<Record<SubmissionReadinessReason, string>> = {
  missing_objective: 'أضف هدفًا تعليميًا واحدًا على الأقل.',
  missing_question: 'أضف سؤالًا واحدًا على الأقل.',
  missing_mastery_question: 'يجب أن يتضمن الدرس سؤال إتقان واحدًا على الأقل.',
  dangling_objective: 'أصلح ارتباط السؤال بهدف تعلم موجود قبل الإرسال.',
  invalid_question_structure: 'صحّح بيانات الأسئلة الحالية قبل الإرسال.',
};

export function TeacherLessonEditor({
  service,
  revision = null,
  onBack,
}: TeacherLessonEditorProps) {
  const { payload, updatePayload, save, submit, error, session } = useTeacherLessonEditor({
    service,
    revision,
  });

  const updateLesson = <K extends keyof LessonRevisionPayload['lesson']>(
    key: K,
    value: LessonRevisionPayload['lesson'][K]
  ) => {
    updatePayload({
      ...payload,
      lesson: {
        ...payload.lesson,
        [key]: value,
      },
    });
  };

  const readOnly = session.isReadOnly;
  const questionStateIssue = getQuestionStateIssue(payload.questions, payload.objectives);
  const submissionReadiness = getLessonSubmissionReadiness(payload);
  const submitActionReady = session.canSubmit && submissionReadiness.ready;
  const requestBack = () => {
    if (session.isSaving || session.isSubmitting) return;
    if (session.dirty && !window.confirm('لديك تغييرات غير محفوظة. هل تريد العودة دون حفظها؟')) {
      return;
    }
    onBack();
  };

  const requestSubmit = () => {
    if (!submitActionReady) return;
    const confirmed = window.confirm(
      'إرسال الدرس للمراجعة؟ بعد الإرسال ستصبح هذه النسخة قيد المراجعة ولن تكون قابلة للتحرير في مكانها.'
    );
    if (!confirmed) return;
    void submit();
  };

  const title =
    session.mode === 'new'
      ? 'إنشاء درس جديد'
      : session.mode === 'revise_rejected'
        ? 'تعديل نسخة مرفوضة'
        : readOnly
          ? 'عرض نسخة الدرس'
          : 'تحرير مسودة الدرس';

  return (
    <section className="teacher-editor-shell" aria-labelledby="teacher-lesson-editor-title">
      <div className="teacher-editor-header">
        <div className="teacher-editor-heading-copy">
          <span className="teacher-editor-eyebrow">مساحة تأليف الدرس</span>
          <h2 id="teacher-lesson-editor-title">{title}</h2>
          <p>
            {session.mode === 'revise_rejected'
              ? 'سيُنشأ إصدار مسودة جديد عند أول حفظ ناجح. النسخة المرفوضة الأصلية لن تُعدّل.'
              : session.mode === 'readonly_pending_review'
                ? 'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.'
                : session.mode === 'readonly_approved'
                  ? 'هذه النسخة معتمدة وتُعرض للقراءة فقط في هذه المرحلة.'
                  : 'احفظ يدويًا عندما تنتهي من تعديلاتك.'}
          </p>
        </div>
        <div className="teacher-editor-back-action">
          <AppButton
            label="العودة"
            variant="secondary"
            onClick={requestBack}
            disabled={session.isSaving || session.isSubmitting}
          />
        </div>
      </div>

      {error ? (
        <div className="teacher-alert teacher-alert--error" role="alert">
          {error.message}
        </div>
      ) : null}

      <div className="teacher-editor-stack">
        <AppCard
          title="بيانات الدرس"
          subtitle="عرّف الدرس ومحتواه الأساسي. الحقول الطويلة تقبل أكثر من سطر عند الحاجة."
        >
          <div className="teacher-lesson-fields">
            <label className="teacher-field">
              <span className="teacher-field-label">معرف الوحدة</span>
              <input
                aria-label="معرف الوحدة"
                value={payload.lesson.unitId}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateLesson('unitId', event.target.value)
                }
              />
            </label>

            <label className="teacher-field teacher-field--wide">
              <span className="teacher-field-label">عنوان الدرس</span>
              <input
                aria-label="عنوان الدرس"
                value={payload.lesson.title}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateLesson('title', event.target.value)
                }
              />
            </label>

            <label className="teacher-field">
              <span className="teacher-field-label">ترتيب العرض</span>
              <input
                aria-label="ترتيب العرض"
                type="number"
                min={1}
                value={payload.lesson.displayOrder}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateLesson('displayOrder', Number(event.target.value))
                }
              />
            </label>

            <label className="teacher-field teacher-field--full">
              <span className="teacher-field-label">ملخص الدرس</span>
              <textarea
                aria-label="ملخص الدرس"
                value={payload.lesson.summary}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  updateLesson('summary', event.target.value)
                }
              />
            </label>

            <label className="teacher-field teacher-field--full">
              <span className="teacher-field-label">المفاهيم الأساسية</span>
              <span className="teacher-field-hint">اكتب مفهومًا واحدًا في كل سطر.</span>
              <textarea
                aria-label="المفاهيم الأساسية"
                value={arrayToLines(payload.lesson.keyConcepts)}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  updateLesson('keyConcepts', linesToArray(event.target.value))
                }
              />
            </label>

            <label className="teacher-field teacher-field--full">
              <span className="teacher-field-label">الأمثلة</span>
              <span className="teacher-field-hint">اكتب مثالًا واحدًا في كل سطر.</span>
              <textarea
                aria-label="الأمثلة"
                value={arrayToLines(payload.lesson.examples)}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  updateLesson('examples', linesToArray(event.target.value))
                }
              />
            </label>

            <label className="teacher-field teacher-field--full">
              <span className="teacher-field-label">التصورات البديلة</span>
              <span className="teacher-field-hint">اكتب تصورًا واحدًا في كل سطر.</span>
              <textarea
                aria-label="التصورات البديلة"
                value={arrayToLines(payload.lesson.misconceptions)}
                disabled={readOnly || session.isSaving || session.isSubmitting}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  updateLesson('misconceptions', linesToArray(event.target.value))
                }
              />
            </label>
          </div>
        </AppCard>

        <TeacherObjectivesEditor
          objectives={payload.objectives}
          questions={payload.questions}
          readOnly={readOnly}
          disabled={session.isSaving || session.isSubmitting}
          onChange={(objectives) => updatePayload({ ...payload, objectives })}
        />

        <TeacherQuestionsEditor
          objectives={payload.objectives}
          questions={payload.questions}
          readOnly={readOnly}
          disabled={session.isSaving || session.isSubmitting}
          onChange={(questions) => updatePayload({ ...payload, questions })}
        />

        <div className="teacher-structure-summary" aria-label="ملخص محتوى المسودة">
          <span>
            <strong>{payload.objectives.length}</strong> أهداف
          </span>
          <span>
            <strong>{payload.questions.length}</strong> أسئلة
          </span>
          <span>
            <strong>{payload.games.length}</strong> ألعاب
          </span>
          <span>
            <strong>{payload.experiments.length}</strong> تجارب
          </span>
        </div>

        {!readOnly ? (
          <section
            className={`teacher-readiness-card ${submissionReadiness.ready ? 'teacher-readiness-card--ready' : ''}`}
            aria-labelledby="teacher-submission-readiness-title"
          >
            <div className="teacher-section-heading-row">
              <div>
                <span className="teacher-section-kicker">قبل الإرسال</span>
                <h3 id="teacher-submission-readiness-title">جاهزية الإرسال</h3>
              </div>
              <span className="teacher-readiness-state">
                {submissionReadiness.ready ? 'جاهز' : 'يحتاج استكمالًا'}
              </span>
            </div>

            {submissionReadiness.ready ? (
              <p className="teacher-readiness-message">المحتوى مكتمل للإرسال.</p>
            ) : (
              <>
                <p className="teacher-readiness-message">
                  أكمل النقاط التالية قبل الإرسال للمراجعة:
                </p>
                <ul className="teacher-readiness-list">
                  {submissionReadiness.reasons.map((reason) => (
                    <li key={reason}>{SUBMISSION_REASON_MESSAGES[reason]}</li>
                  ))}
                </ul>
              </>
            )}
            {session.dirty ? (
              <p className="teacher-readiness-dirty">احفظ التغييرات قبل الإرسال للمراجعة.</p>
            ) : null}
          </section>
        ) : null}

        {!readOnly ? (
          <div className="teacher-editor-actions">
            <div className="teacher-editor-action">
              <AppButton
                label={session.isSaving ? 'جارٍ الحفظ...' : 'حفظ المسودة'}
                onClick={() => void save()}
                disabled={
                  !session.dirty ||
                  session.isSaving ||
                  session.isSubmitting ||
                  questionStateIssue !== null
                }
              />
            </div>
            <div className="teacher-editor-action">
              <AppButton
                label={session.isSubmitting ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}
                variant="secondary"
                onClick={requestSubmit}
                disabled={!submitActionReady}
              />
            </div>
          </div>
        ) : null}

        <dl className="teacher-revision-metadata">
          <div>
            <dt>النسخة الأصلية</dt>
            <dd>{session.originRevisionId ?? 'جديدة'}</dd>
          </div>
          <div>
            <dt>المسودة العاملة</dt>
            <dd>{session.workingRevisionId ?? 'لم تُنشأ بعد'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

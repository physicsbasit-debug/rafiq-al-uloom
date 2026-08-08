import type { ChangeEvent } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { AuthoringService, LessonRevision, LessonRevisionPayload } from '@services/authoring';

import { useTeacherLessonEditor } from './useTeacherLessonEditor';

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
  const requestBack = () => {
    if (session.isSaving || session.isSubmitting) return;
    if (session.dirty && !window.confirm('لديك تغييرات غير محفوظة. هل تريد العودة دون حفظها؟')) {
      return;
    }
    onBack();
  };

  const requestSubmit = () => {
    if (!session.canSubmit) return;
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
    <section aria-labelledby="teacher-lesson-editor-title">
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
          <h2 id="teacher-lesson-editor-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <p style={{ margin: '0.35rem 0 0' }}>
            {session.mode === 'revise_rejected'
              ? 'سيُنشأ إصدار مسودة جديد عند أول حفظ ناجح. النسخة المرفوضة الأصلية لن تُعدّل.'
              : session.mode === 'readonly_pending_review'
                ? 'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.'
                : session.mode === 'readonly_approved'
                  ? 'هذه النسخة معتمدة وتُعرض للقراءة فقط في هذه المرحلة.'
                  : 'احفظ يدويًا عندما تنتهي من تعديلاتك.'}
          </p>
        </div>
        <div style={{ width: '150px' }}>
          <AppButton
            label="العودة"
            variant="secondary"
            onClick={requestBack}
            disabled={session.isSaving || session.isSubmitting}
          />
        </div>
      </div>

      {error ? (
        <div role="alert" style={{ marginBottom: '1rem' }}>
          {error.message}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <label>
          معرف الوحدة
          <input
            aria-label="معرف الوحدة"
            value={payload.lesson.unitId}
            disabled={readOnly || session.isSaving || session.isSubmitting}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateLesson('unitId', event.target.value)
            }
          />
        </label>

        <label>
          عنوان الدرس
          <input
            aria-label="عنوان الدرس"
            value={payload.lesson.title}
            disabled={readOnly || session.isSaving || session.isSubmitting}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateLesson('title', event.target.value)
            }
          />
        </label>

        <label>
          ترتيب العرض
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

        <label>
          ملخص الدرس
          <textarea
            aria-label="ملخص الدرس"
            value={payload.lesson.summary}
            disabled={readOnly || session.isSaving || session.isSubmitting}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              updateLesson('summary', event.target.value)
            }
          />
        </label>

        <label>
          المفاهيم الأساسية، مفهوم في كل سطر
          <textarea
            aria-label="المفاهيم الأساسية"
            value={arrayToLines(payload.lesson.keyConcepts)}
            disabled={readOnly || session.isSaving || session.isSubmitting}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              updateLesson('keyConcepts', linesToArray(event.target.value))
            }
          />
        </label>

        <label>
          الأمثلة، مثال في كل سطر
          <textarea
            aria-label="الأمثلة"
            value={arrayToLines(payload.lesson.examples)}
            disabled={readOnly || session.isSaving || session.isSubmitting}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              updateLesson('examples', linesToArray(event.target.value))
            }
          />
        </label>

        <label>
          التصورات البديلة، تصور في كل سطر
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

      <div style={{ marginTop: '1rem' }}>
        <p>
          المحتوى البنيوي المحفوظ: {payload.objectives.length} أهداف، {payload.questions.length}{' '}
          أسئلة، {payload.games.length} ألعاب، {payload.experiments.length} تجارب. تبقى هذه العناصر
          كما هي ولا تُحذف أثناء الحفظ أو الإرسال.
        </p>
      </div>

      {!readOnly ? (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: '190px' }}>
            <AppButton
              label={session.isSaving ? 'جارٍ الحفظ...' : 'حفظ المسودة'}
              onClick={() => void save()}
              disabled={!session.dirty || session.isSaving || session.isSubmitting}
            />
          </div>
          <div style={{ width: '190px' }}>
            <AppButton
              label={session.isSubmitting ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}
              variant="secondary"
              onClick={requestSubmit}
              disabled={!session.canSubmit}
            />
          </div>
        </div>
      ) : null}

      {!readOnly && session.dirty ? (
        <p role="status" style={{ marginTop: '0.75rem' }}>
          احفظ التعديلات أولًا قبل إرسال الدرس للمراجعة.
        </p>
      ) : null}

      <dl style={{ marginTop: '1rem' }}>
        <dt>النسخة الأصلية</dt>
        <dd>{session.originRevisionId ?? 'جديدة'}</dd>
        <dt>المسودة العاملة</dt>
        <dd>{session.workingRevisionId ?? 'لم تُنشأ بعد'}</dd>
      </dl>
    </section>
  );
}

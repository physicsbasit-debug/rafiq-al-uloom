import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import {
  createTeacherActivityKey,
  removeByKey,
  replaceByKey,
  toggleObjectiveKey,
  validateInquiryDraft,
} from './teacher-activity-editor-utils';

type InquiryDraft = LessonRevisionPayload['inquiries'][number];

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];

type InquiryFormDraft = Omit<InquiryDraft, 'key'>;

type InquiryEditorState =
  | {
      readonly mode: 'add';
      readonly form: InquiryFormDraft;
    }
  | {
      readonly mode: 'edit';
      readonly key: string;
      readonly form: InquiryFormDraft;
    }
  | null;

interface TeacherInquiriesEditorProps {
  readonly inquiries: readonly InquiryDraft[];
  readonly objectives: readonly ObjectiveDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (inquiries: readonly InquiryDraft[]) => void;
}

function emptyInquiryForm(): InquiryFormDraft {
  return {
    title: '',
    instructions: '',
    objectiveKeys: [],
    context: '',
    drivingQuestion: '',
    hypothesisPrompt: '',
    observationPrompt: '',
    conclusionPrompt: '',
  };
}

function formFromInquiry(inquiry: InquiryDraft): InquiryFormDraft {
  return {
    title: inquiry.title,
    instructions: inquiry.instructions,
    objectiveKeys: [...inquiry.objectiveKeys],
    context: inquiry.context,
    drivingQuestion: inquiry.drivingQuestion,
    hypothesisPrompt: inquiry.hypothesisPrompt,
    observationPrompt: inquiry.observationPrompt,
    conclusionPrompt: inquiry.conclusionPrompt,
  };
}

function validationMessage(
  reason: Exclude<ReturnType<typeof validateInquiryDraft>, { readonly valid: true }>['reason']
): string {
  switch (reason) {
    case 'empty_title':
      return 'اكتب عنوانًا لنشاط الاستقصاء.';
    case 'empty_instructions':
      return 'اكتب تعليمات واضحة لنشاط الاستقصاء.';
    case 'empty_context':
      return 'اكتب السياق العلمي للاستقصاء.';
    case 'empty_driving_question':
      return 'اكتب السؤال المحوري للاستقصاء.';
    case 'empty_hypothesis_prompt':
      return 'اكتب موجه صياغة الفرضية.';
    case 'empty_observation_prompt':
      return 'اكتب موجه تسجيل الملاحظة.';
    case 'empty_conclusion_prompt':
      return 'اكتب موجه صياغة الاستنتاج.';
  }
}

export function TeacherInquiriesEditor({
  inquiries,
  objectives,
  readOnly,
  disabled,
  onChange,
}: TeacherInquiriesEditorProps) {
  const [editor, setEditor] = useState<InquiryEditorState>(null);

  const [message, setMessage] = useState<string | null>(null);

  const controlsDisabled = readOnly || disabled;

  const startAdd = () => {
    if (controlsDisabled) return;

    setEditor({
      mode: 'add',
      form: emptyInquiryForm(),
    });

    setMessage(null);
  };

  const startEdit = (inquiry: InquiryDraft) => {
    if (controlsDisabled) return;

    setEditor({
      mode: 'edit',
      key: inquiry.key,
      form: formFromInquiry(inquiry),
    });

    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;

    setEditor(null);
    setMessage(null);
  };

  const updateForm = (update: (current: InquiryFormDraft) => InquiryFormDraft) => {
    if (controlsDisabled) return;

    setEditor((current) =>
      current
        ? {
            ...current,
            form: update(current.form),
          }
        : current
    );
  };

  const toggleObjective = (objectiveKey: string) => {
    updateForm((form) => ({
      ...form,
      objectiveKeys: toggleObjectiveKey(form.objectiveKeys, objectiveKey),
    }));
  };

  const applyEdit = () => {
    if (!editor || controlsDisabled) return;

    const validation = validateInquiryDraft(editor.form);

    if (!validation.valid) {
      setMessage(validationMessage(validation.reason));
      return;
    }

    if (editor.mode === 'add') {
      const key = createTeacherActivityKey(
        'inquiry',
        inquiries.map((inquiry) => inquiry.key)
      );

      onChange([
        ...inquiries,
        {
          key,
          ...validation.inquiry,
        },
      ]);
    } else {
      onChange(
        replaceByKey(inquiries, editor.key, {
          key: editor.key,
          ...validation.inquiry,
        })
      );
    }

    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (inquiry: InquiryDraft) => {
    if (controlsDisabled) return;

    onChange(removeByKey(inquiries, inquiry.key));

    if (editor?.mode === 'edit' && editor.key === inquiry.key) {
      setEditor(null);
    }

    setMessage(null);
  };

  const objectiveLabel = (key: string): string =>
    objectives.find((objective) => objective.key === key)?.text ?? `هدف غير موجود: ${key}`;

  return (
    <section className="teacher-editor-card-section" aria-labelledby="teacher-inquiries-title">
      <div className="teacher-section-heading-row">
        <div className="teacher-section-heading-copy">
          <span className="teacher-section-kicker">الأنشطة العلمية</span>

          <h3 id="teacher-inquiries-title">أنشطة الاستقصاء</h3>

          <p>ابنِ موقفًا علميًا يقود الطالب من السؤال إلى الفرضية والملاحظة والاستنتاج.</p>
        </div>

        <span className="teacher-count-badge">{inquiries.length} استقصاء</span>
      </div>

      {message ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {message}
        </div>
      ) : null}

      {inquiries.length === 0 ? (
        <div className="teacher-empty-state">لا توجد أنشطة استقصاء في هذه المسودة بعد.</div>
      ) : (
        <ol className="teacher-item-list">
          {inquiries.map((inquiry, index) => (
            <li key={inquiry.key} className="teacher-item-card">
              <div className="teacher-item-card-main">
                <span className="teacher-item-number" aria-hidden="true">
                  {index + 1}
                </span>

                <div>
                  <strong className="teacher-item-title">{inquiry.title}</strong>

                  <p>{inquiry.drivingQuestion}</p>
                </div>
              </div>

              <div className="teacher-question-meta">
                <span>
                  الأهداف:{' '}
                  {inquiry.objectiveKeys.length > 0
                    ? inquiry.objectiveKeys.map(objectiveLabel).join('، ')
                    : 'لم تربط بعد'}
                </span>
              </div>

              {!readOnly ? (
                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action"
                    aria-label={`تعديل الاستقصاء ${index + 1}`}
                    disabled={disabled}
                    onClick={() => startEdit(inquiry)}
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف الاستقصاء ${index + 1}`}
                    disabled={disabled}
                    onClick={() => requestDelete(inquiry)}
                  >
                    حذف
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && !editor ? (
        <div className="teacher-section-primary-action">
          <AppButton label="إضافة نشاط استقصاء" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          className="teacher-form-panel"
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة نشاط استقصاء' : 'تعديل نشاط استقصاء'}
        >
          <div className="teacher-form-panel-heading">
            <strong>{editor.mode === 'add' ? 'نشاط استقصاء جديد' : 'تعديل نشاط الاستقصاء'}</strong>

            <span>يبقى النشاط داخل Form Buffer حتى تطبيقه على المسودة.</span>
          </div>

          <label className="teacher-field">
            <span className="teacher-field-label">عنوان الاستقصاء</span>

            <input
              aria-label="عنوان الاستقصاء"
              value={editor.form.title}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  title: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">تعليمات الاستقصاء</span>

            <textarea
              aria-label="تعليمات الاستقصاء"
              value={editor.form.instructions}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  instructions: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">السياق العلمي</span>

            <textarea
              aria-label="السياق العلمي"
              value={editor.form.context}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  context: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">السؤال المحوري</span>

            <textarea
              aria-label="السؤال المحوري"
              value={editor.form.drivingQuestion}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  drivingQuestion: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">موجه الفرضية</span>

            <textarea
              aria-label="موجه الفرضية"
              value={editor.form.hypothesisPrompt}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  hypothesisPrompt: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">موجه الملاحظة</span>

            <textarea
              aria-label="موجه الملاحظة"
              value={editor.form.observationPrompt}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  observationPrompt: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">موجه الاستنتاج</span>

            <textarea
              aria-label="موجه الاستنتاج"
              value={editor.form.conclusionPrompt}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  conclusionPrompt: event.target.value,
                }))
              }
            />
          </label>

          <fieldset className="teacher-choice-fieldset">
            <legend>أهداف التعلم المرتبطة</legend>

            {objectives.length === 0 ? (
              <div className="teacher-empty-state">
                أضف أهداف التعلم أولًا ثم اربط الاستقصاء بها.
              </div>
            ) : (
              <div className="teacher-inline-actions">
                {objectives.map((objective) => {
                  const selected = editor.form.objectiveKeys.includes(objective.key);

                  return (
                    <button
                      key={objective.key}
                      type="button"
                      className="teacher-inline-action"
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => toggleObjective(objective.key)}
                    >
                      {selected ? '✓ ' : ''}
                      {objective.text}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="teacher-editor-actions teacher-editor-actions--compact">
            <div className="teacher-editor-action">
              <AppButton
                label={editor.mode === 'add' ? 'إضافة الاستقصاء' : 'حفظ تعديل الاستقصاء'}
                onClick={applyEdit}
                disabled={disabled}
              />
            </div>

            <div className="teacher-editor-action teacher-editor-action--secondary">
              <AppButton
                label="إلغاء"
                variant="secondary"
                onClick={cancelEdit}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

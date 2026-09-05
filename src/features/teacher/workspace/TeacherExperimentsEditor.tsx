import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import {
  createTeacherActivityKey,
  linesToEditableArray,
  removeByKey,
  replaceByKey,
  toggleObjectiveKey,
  trimmedArrayToLines,
  validateExperimentDraft,
} from './teacher-activity-editor-utils';

type ExperimentDraft = LessonRevisionPayload['experiments'][number];
type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type ExperimentFormDraft = Omit<ExperimentDraft, 'key'>;

type ExperimentEditorState =
  | {
      readonly mode: 'add';
      readonly form: ExperimentFormDraft;
    }
  | {
      readonly mode: 'edit';
      readonly key: string;
      readonly form: ExperimentFormDraft;
    }
  | null;

interface TeacherExperimentsEditorProps {
  readonly experiments: readonly ExperimentDraft[];
  readonly objectives: readonly ObjectiveDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (experiments: readonly ExperimentDraft[]) => void;
}

function emptyExperimentForm(): ExperimentFormDraft {
  return {
    title: '',
    objective: '',
    objectiveKeys: [],
    tools: [],
    steps: [],
    safetyNotes: [],
    safetyLevel: 'teacher_supervised',
    observationPrompt: '',
    conclusionPrompt: '',
    homeAlternative: null,
  };
}

function formFromExperiment(experiment: ExperimentDraft): ExperimentFormDraft {
  return {
    title: experiment.title,
    objective: experiment.objective,
    objectiveKeys: [...experiment.objectiveKeys],
    tools: [...experiment.tools],
    steps: [...experiment.steps],
    safetyNotes: [...experiment.safetyNotes],
    safetyLevel: experiment.safetyLevel,
    observationPrompt: experiment.observationPrompt,
    conclusionPrompt: experiment.conclusionPrompt,
    homeAlternative: experiment.homeAlternative,
  };
}

function validationMessage(
  reason: Exclude<ReturnType<typeof validateExperimentDraft>, { readonly valid: true }>['reason']
): string {
  switch (reason) {
    case 'empty_title':
      return 'اكتب عنوانًا للتجربة.';
    case 'empty_objective':
      return 'اكتب الهدف الوصفي للتجربة.';
    case 'missing_step':
      return 'أضف خطوة تنفيذ واحدة على الأقل.';
    case 'empty_observation_prompt':
      return 'اكتب سؤال الملاحظة.';
    case 'empty_conclusion_prompt':
      return 'اكتب سؤال الاستنتاج.';
  }
}

const SAFETY_LEVEL_LABELS: Readonly<Record<ExperimentDraft['safetyLevel'], string>> = {
  safe_home: 'آمنة منزليًا',
  teacher_supervised: 'بإشراف المعلم',
  lab_only: 'داخل المختبر فقط',
  not_allowed: 'غير مسموح بها',
};

export function TeacherExperimentsEditor({
  experiments,
  objectives,
  readOnly,
  disabled,
  onChange,
}: TeacherExperimentsEditorProps) {
  const [editor, setEditor] = useState<ExperimentEditorState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const controlsDisabled = readOnly || disabled;

  const startAdd = () => {
    if (controlsDisabled) return;
    setEditor({
      mode: 'add',
      form: emptyExperimentForm(),
    });
    setMessage(null);
  };

  const startEdit = (experiment: ExperimentDraft) => {
    if (controlsDisabled) return;
    setEditor({
      mode: 'edit',
      key: experiment.key,
      form: formFromExperiment(experiment),
    });
    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;
    setEditor(null);
    setMessage(null);
  };

  const updateForm = (update: (current: ExperimentFormDraft) => ExperimentFormDraft) => {
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

    const validation = validateExperimentDraft(editor.form);

    if (!validation.valid) {
      setMessage(validationMessage(validation.reason));
      return;
    }

    if (editor.mode === 'add') {
      const key = createTeacherActivityKey(
        'experiment',
        experiments.map((experiment) => experiment.key)
      );

      onChange([
        ...experiments,
        {
          key,
          ...validation.experiment,
        },
      ]);
    } else {
      onChange(
        replaceByKey(experiments, editor.key, {
          key: editor.key,
          ...validation.experiment,
        })
      );
    }

    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (experiment: ExperimentDraft) => {
    if (controlsDisabled) return;

    onChange(removeByKey(experiments, experiment.key));

    if (editor?.mode === 'edit' && editor.key === experiment.key) {
      setEditor(null);
    }

    setMessage(null);
  };

  const objectiveLabel = (key: string): string =>
    objectives.find((objective) => objective.key === key)?.text ?? `هدف غير موجود: ${key}`;

  return (
    <section className="teacher-editor-card-section" aria-labelledby="teacher-experiments-title">
      <div className="teacher-section-heading-row">
        <div className="teacher-section-heading-copy">
          <span className="teacher-section-kicker">الأنشطة العلمية</span>
          <h3 id="teacher-experiments-title">التجارب</h3>
          <p>أضف تجربة واضحة وآمنة واربطها بأهداف التعلم.</p>
        </div>

        <span className="teacher-count-badge">{experiments.length} تجارب</span>
      </div>

      {message ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {message}
        </div>
      ) : null}

      {experiments.length === 0 ? (
        <div className="teacher-empty-state">لا توجد تجارب في هذه المسودة بعد.</div>
      ) : (
        <ol className="teacher-item-list">
          {experiments.map((experiment, index) => (
            <li className="teacher-item-card" key={experiment.key}>
              <div className="teacher-item-card-main">
                <span className="teacher-item-number" aria-hidden="true">
                  {index + 1}
                </span>

                <div>
                  <strong className="teacher-item-title">{experiment.title}</strong>
                  <p>{experiment.objective}</p>
                </div>
              </div>

              <div className="teacher-question-meta">
                <span>السلامة: {SAFETY_LEVEL_LABELS[experiment.safetyLevel]}</span>

                <span>الخطوات: {experiment.steps.length}</span>

                <span>
                  الأهداف:{' '}
                  {experiment.objectiveKeys.length > 0
                    ? experiment.objectiveKeys.map(objectiveLabel).join('، ')
                    : 'لم تربط بعد'}
                </span>
              </div>

              {!readOnly ? (
                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action"
                    aria-label={`تعديل التجربة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => startEdit(experiment)}
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف التجربة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => requestDelete(experiment)}
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
          <AppButton label="إضافة تجربة" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          className="teacher-form-panel"
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة تجربة' : 'تعديل تجربة'}
        >
          <div className="teacher-form-panel-heading">
            <strong>{editor.mode === 'add' ? 'تجربة جديدة' : 'تعديل التجربة'}</strong>
            <span>الروابط البنيوية بالأهداف مستقلة عن الوصف النصي لهدف التجربة.</span>
          </div>

          <div className="teacher-question-form-grid">
            <label className="teacher-field">
              <span className="teacher-field-label">عنوان التجربة</span>
              <input
                aria-label="عنوان التجربة"
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
              <span className="teacher-field-label">مستوى السلامة</span>
              <select
                aria-label="مستوى السلامة"
                value={editor.form.safetyLevel}
                disabled={disabled}
                onChange={(event) =>
                  updateForm((form) => ({
                    ...form,
                    safetyLevel: event.target.value as ExperimentDraft['safetyLevel'],
                  }))
                }
              >
                <option value="safe_home">آمنة منزليًا</option>
                <option value="teacher_supervised">بإشراف المعلم</option>
                <option value="lab_only">داخل المختبر فقط</option>
                <option value="not_allowed">غير مسموح بها</option>
              </select>
            </label>
          </div>

          <label className="teacher-field">
            <span className="teacher-field-label">الهدف الوصفي للتجربة</span>
            <textarea
              aria-label="الهدف الوصفي للتجربة"
              value={editor.form.objective}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  objective: event.target.value,
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">الأدوات</span>
            <span className="teacher-field-hint">اكتب أداة واحدة في كل سطر.</span>
            <textarea
              aria-label="أدوات التجربة"
              value={trimmedArrayToLines(editor.form.tools)}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  tools: linesToEditableArray(event.target.value),
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">خطوات التنفيذ</span>
            <span className="teacher-field-hint">اكتب خطوة واحدة في كل سطر.</span>
            <textarea
              aria-label="خطوات التجربة"
              value={trimmedArrayToLines(editor.form.steps)}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  steps: linesToEditableArray(event.target.value),
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">ملاحظات السلامة</span>
            <span className="teacher-field-hint">اكتب ملاحظة واحدة في كل سطر.</span>
            <textarea
              aria-label="ملاحظات السلامة"
              value={trimmedArrayToLines(editor.form.safetyNotes)}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  safetyNotes: linesToEditableArray(event.target.value),
                }))
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">سؤال الملاحظة</span>
            <textarea
              aria-label="سؤال الملاحظة"
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
            <span className="teacher-field-label">سؤال الاستنتاج</span>
            <textarea
              aria-label="سؤال الاستنتاج"
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

          <label className="teacher-field">
            <span className="teacher-field-label">البديل المنزلي</span>
            <span className="teacher-field-hint">اختياري.</span>
            <textarea
              aria-label="البديل المنزلي"
              value={editor.form.homeAlternative ?? ''}
              disabled={disabled}
              onChange={(event) =>
                updateForm((form) => ({
                  ...form,
                  homeAlternative: event.target.value,
                }))
              }
            />
          </label>

          <fieldset className="teacher-choice-fieldset">
            <legend>أهداف التعلم المرتبطة</legend>

            {objectives.length === 0 ? (
              <div className="teacher-empty-state">أضف أهداف التعلم أولًا ثم اربط التجربة بها.</div>
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
                label={editor.mode === 'add' ? 'إضافة التجربة' : 'حفظ تعديل التجربة'}
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

import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import { TeacherDataActivityFormFields } from './TeacherDataActivityFormFields';

import {
  buildTeacherDataActivityDraft,
  createEmptyTeacherDataActivityForm,
  createTeacherDataSeriesForm,
  createTeacherDataTaskForm,
  teacherDataActivityFormFromDraft,
  type TeacherDataActivityForm,
} from './teacher-data-activity-form';

import {
  createTeacherActivityKey,
  removeByKey,
  replaceByKey,
  toggleObjectiveKey,
} from './teacher-activity-editor-utils';

type DataActivityDraft = LessonRevisionPayload['dataActivities'][number];

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];

type DataActivityEditorState =
  | {
      readonly mode: 'add';
      readonly form: TeacherDataActivityForm;
    }
  | {
      readonly mode: 'edit';
      readonly key: string;
      readonly form: TeacherDataActivityForm;
    }
  | null;

interface TeacherDataActivitiesEditorProps {
  readonly dataActivities: readonly DataActivityDraft[];
  readonly objectives: readonly ObjectiveDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (dataActivities: readonly DataActivityDraft[]) => void;
}

function validationMessage(
  reason: Exclude<
    ReturnType<typeof buildTeacherDataActivityDraft>,
    { readonly valid: true }
  >['reason']
): string {
  switch (reason) {
    case 'empty_title':
      return 'اكتب عنوانًا لنشاط البيانات.';

    case 'empty_instructions':
      return 'اكتب تعليمات واضحة لنشاط البيانات.';

    case 'invalid_numeric_input':
      return 'تحقق من القيم الرقمية والفهارس المدخلة.';

    case 'invalid_config':
      return 'تحقق من بنية البيانات والسلاسل والمهام وروابطها.';
  }
}

function presentationLabel(mode: DataActivityDraft['config']['presentation']['mode']): string {
  switch (mode) {
    case 'table':
      return 'جدول';

    case 'line_graph':
      return 'رسم خطي';

    case 'table_and_line_graph':
      return 'جدول ورسم خطي';
  }
}

function taskRuleLabel(task: DataActivityDraft['config']['tasks'][number]): string {
  switch (task.rule.kind) {
    case 'read_value':
      return `قراءة النقطة ${task.rule.pointIndex + 1} من ${task.rule.seriesId}`;

    case 'difference':
      return `الفرق بين النقطتين ${task.rule.leftIndex + 1} و${task.rule.rightIndex + 1} من ${
        task.rule.seriesId
      }`;

    case 'mean':
      return `متوسط النقاط ${task.rule.pointIndices
        .map((index) => index + 1)
        .join('، ')} من ${task.rule.seriesId}`;
  }
}

export function TeacherDataActivitiesEditor({
  dataActivities,
  objectives,
  readOnly,
  disabled,
  onChange,
}: TeacherDataActivitiesEditorProps) {
  const [editor, setEditor] = useState<DataActivityEditorState>(null);

  const [message, setMessage] = useState<string | null>(null);

  const controlsDisabled = readOnly || disabled;

  const startAdd = () => {
    if (controlsDisabled) return;

    setEditor({
      mode: 'add',
      form: createEmptyTeacherDataActivityForm(),
    });

    setMessage(null);
  };

  const startEdit = (activity: DataActivityDraft) => {
    if (controlsDisabled) return;

    setEditor({
      mode: 'edit',
      key: activity.key,
      form: teacherDataActivityFormFromDraft(activity),
    });

    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;

    setEditor(null);
    setMessage(null);
  };

  const updateForm = (update: (current: TeacherDataActivityForm) => TeacherDataActivityForm) => {
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

  const addSeries = () => {
    updateForm((form) => ({
      ...form,
      series: [...form.series, createTeacherDataSeriesForm(form.series.map((series) => series.id))],
    }));
  };

  const addTask = () => {
    updateForm((form) => ({
      ...form,
      tasks: [
        ...form.tasks,
        createTeacherDataTaskForm(
          'read_value',
          form.tasks.map((task) => task.id)
        ),
      ],
    }));
  };

  const applyEdit = () => {
    if (!editor || controlsDisabled) {
      return;
    }

    const validation = buildTeacherDataActivityDraft(editor.form);

    if (!validation.valid) {
      setMessage(validationMessage(validation.reason));

      return;
    }

    if (editor.mode === 'add') {
      const key = createTeacherActivityKey(
        'data-activity',
        dataActivities.map((activity) => activity.key)
      );

      onChange([
        ...dataActivities,
        {
          key,
          ...validation.dataActivity,
        },
      ]);
    } else {
      onChange(
        replaceByKey(dataActivities, editor.key, {
          key: editor.key,
          ...validation.dataActivity,
        })
      );
    }

    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (activity: DataActivityDraft) => {
    if (controlsDisabled) return;

    onChange(removeByKey(dataActivities, activity.key));

    if (editor?.mode === 'edit' && editor.key === activity.key) {
      setEditor(null);
    }

    setMessage(null);
  };

  const objectiveLabel = (key: string): string =>
    objectives.find((objective) => objective.key === key)?.text ?? `هدف غير موجود: ${key}`;

  return (
    <section
      className="teacher-editor-card-section"
      aria-labelledby="teacher-data-activities-title"
    >
      <div className="teacher-section-heading-row">
        <div className="teacher-section-heading-copy">
          <span className="teacher-section-kicker">الأنشطة العلمية</span>

          <h3 id="teacher-data-activities-title">أنشطة البيانات والرسوم</h3>

          <p>أنشئ مجموعة بيانات رقمية منظمة ومهام قراءة وتحليل دون صيغ حرة.</p>
        </div>

        <span className="teacher-count-badge">{dataActivities.length} نشاط بيانات</span>
      </div>

      {message ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {message}
        </div>
      ) : null}

      {dataActivities.length === 0 ? (
        <div className="teacher-empty-state">لا توجد أنشطة بيانات في هذه المسودة بعد.</div>
      ) : (
        <ol className="teacher-item-list">
          {dataActivities.map((activity, index) => (
            <li key={activity.key} className="teacher-item-card">
              <div className="teacher-item-card-main">
                <span className="teacher-item-number" aria-hidden="true">
                  {index + 1}
                </span>

                <div>
                  <strong className="teacher-item-title">{activity.title}</strong>

                  <p>{activity.config.context}</p>
                </div>
              </div>

              <div className="teacher-question-meta">
                <span>العرض: {presentationLabel(activity.config.presentation.mode)}</span>

                <span>
                  المحور x: {activity.config.dataset.x.label}
                  {activity.config.dataset.x.unit ? ` (${activity.config.dataset.x.unit})` : ''}
                </span>

                <span>النقاط: {activity.config.dataset.x.values.length}</span>

                <span>السلاسل: {activity.config.dataset.series.length}</span>

                <span>المهام: {activity.config.tasks.length}</span>

                <span>
                  الأهداف:{' '}
                  {activity.objectiveKeys.length > 0
                    ? activity.objectiveKeys.map(objectiveLabel).join('، ')
                    : 'لم تربط بعد'}
                </span>
              </div>

              <div className="teacher-question-meta">
                {activity.config.dataset.series.map((series) => (
                  <span key={series.id}>
                    {series.label}: {series.values.join('، ')}
                  </span>
                ))}
              </div>

              <div className="teacher-question-meta">
                {activity.config.tasks.map((task) => (
                  <span key={task.id}>
                    {task.prompt} — {taskRuleLabel(task)}
                  </span>
                ))}
              </div>

              {!readOnly ? (
                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action"
                    aria-label={`تعديل نشاط البيانات ${index + 1}`}
                    disabled={disabled}
                    onClick={() => startEdit(activity)}
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف نشاط البيانات ${index + 1}`}
                    disabled={disabled}
                    onClick={() => requestDelete(activity)}
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
          <AppButton label="إضافة نشاط بيانات" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          className="teacher-form-panel"
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة نشاط بيانات' : 'تعديل نشاط بيانات'}
        >
          <div className="teacher-form-panel-heading">
            <strong>{editor.mode === 'add' ? 'نشاط بيانات جديد' : 'تعديل نشاط البيانات'}</strong>

            <span>البيانات والمهام تبقى داخل Form Buffer حتى تطبيق النشاط على المسودة.</span>
          </div>

          <label className="teacher-field">
            <span className="teacher-field-label">عنوان نشاط البيانات</span>

            <input
              aria-label="عنوان نشاط البيانات"
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
            <span className="teacher-field-label">تعليمات نشاط البيانات</span>

            <textarea
              aria-label="تعليمات نشاط البيانات"
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

          <fieldset className="teacher-choice-fieldset">
            <legend>أهداف التعلم المرتبطة</legend>

            {objectives.length === 0 ? (
              <div className="teacher-empty-state">أضف أهداف التعلم أولًا ثم اربط النشاط بها.</div>
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

          <TeacherDataActivityFormFields
            form={editor.form}
            disabled={disabled}
            onChange={(form) => updateForm(() => form)}
          />

          <div className="teacher-inline-actions">
            <button
              type="button"
              className="teacher-inline-action"
              disabled={disabled}
              onClick={addSeries}
            >
              إضافة سلسلة بيانات
            </button>

            <button
              type="button"
              className="teacher-inline-action"
              disabled={disabled}
              onClick={addTask}
            >
              إضافة مهمة
            </button>
          </div>

          <div className="teacher-form-actions">
            <AppButton label="تطبيق نشاط البيانات" onClick={applyEdit} disabled={disabled} />

            <AppButton label="إلغاء" variant="secondary" onClick={cancelEdit} disabled={disabled} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

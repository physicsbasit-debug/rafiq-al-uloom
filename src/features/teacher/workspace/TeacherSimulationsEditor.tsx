import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import {
  createTeacherActivityKey,
  removeByKey,
  replaceByKey,
  toggleObjectiveKey,
  validateSimulationDraft,
} from './teacher-activity-editor-utils';

type SimulationDraft = LessonRevisionPayload['simulations'][number];

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];

interface SimulationNumericForm {
  readonly mediumSpeedMps: string;
  readonly frequencyMin: string;
  readonly frequencyMax: string;
  readonly frequencyStep: string;
  readonly frequencyInitial: string;
  readonly amplitudeMin: string;
  readonly amplitudeMax: string;
  readonly amplitudeStep: string;
  readonly amplitudeInitial: string;
}

interface SimulationFormDraft {
  readonly title: string;
  readonly instructions: string;
  readonly objectiveKeys: readonly string[];
  readonly config: SimulationNumericForm;
}

type SimulationEditorState =
  | {
      readonly mode: 'add';
      readonly form: SimulationFormDraft;
    }
  | {
      readonly mode: 'edit';
      readonly key: string;
      readonly form: SimulationFormDraft;
    }
  | null;

interface TeacherSimulationsEditorProps {
  readonly simulations: readonly SimulationDraft[];
  readonly objectives: readonly ObjectiveDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (simulations: readonly SimulationDraft[]) => void;
}

function emptySimulationForm(): SimulationFormDraft {
  return {
    title: '',
    instructions: '',
    objectiveKeys: [],
    config: {
      mediumSpeedMps: '12',
      frequencyMin: '0.5',
      frequencyMax: '4',
      frequencyStep: '0.5',
      frequencyInitial: '1',
      amplitudeMin: '0.2',
      amplitudeMax: '1',
      amplitudeStep: '0.1',
      amplitudeInitial: '0.5',
    },
  };
}

function formFromSimulation(simulation: SimulationDraft): SimulationFormDraft {
  return {
    title: simulation.title,
    instructions: simulation.instructions,
    objectiveKeys: [...simulation.objectiveKeys],
    config: {
      mediumSpeedMps: String(simulation.config.mediumSpeedMps),
      frequencyMin: String(simulation.config.frequencyHz.min),
      frequencyMax: String(simulation.config.frequencyHz.max),
      frequencyStep: String(simulation.config.frequencyHz.step),
      frequencyInitial: String(simulation.config.frequencyHz.initial),
      amplitudeMin: String(simulation.config.amplitudeM.min),
      amplitudeMax: String(simulation.config.amplitudeM.max),
      amplitudeStep: String(simulation.config.amplitudeM.step),
      amplitudeInitial: String(simulation.config.amplitudeM.initial),
    },
  };
}

function finiteNumber(value: string): number | null {
  if (!value.trim()) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildSimulationDraft(form: SimulationFormDraft): Omit<SimulationDraft, 'key'> | null {
  const mediumSpeedMps = finiteNumber(form.config.mediumSpeedMps);
  const frequencyMin = finiteNumber(form.config.frequencyMin);
  const frequencyMax = finiteNumber(form.config.frequencyMax);
  const frequencyStep = finiteNumber(form.config.frequencyStep);
  const frequencyInitial = finiteNumber(form.config.frequencyInitial);
  const amplitudeMin = finiteNumber(form.config.amplitudeMin);
  const amplitudeMax = finiteNumber(form.config.amplitudeMax);
  const amplitudeStep = finiteNumber(form.config.amplitudeStep);
  const amplitudeInitial = finiteNumber(form.config.amplitudeInitial);

  if (
    mediumSpeedMps === null ||
    frequencyMin === null ||
    frequencyMax === null ||
    frequencyStep === null ||
    frequencyInitial === null ||
    amplitudeMin === null ||
    amplitudeMax === null ||
    amplitudeStep === null ||
    amplitudeInitial === null
  ) {
    return null;
  }

  return {
    title: form.title,
    instructions: form.instructions,
    objectiveKeys: [...form.objectiveKeys],
    config: {
      engineKind: 'transverse_wave_v1',
      mediumSpeedMps,
      frequencyHz: {
        min: frequencyMin,
        max: frequencyMax,
        step: frequencyStep,
        initial: frequencyInitial,
      },
      amplitudeM: {
        min: amplitudeMin,
        max: amplitudeMax,
        step: amplitudeStep,
        initial: amplitudeInitial,
      },
    },
  };
}

function validationMessage(
  reason: Exclude<ReturnType<typeof validateSimulationDraft>, { readonly valid: true }>['reason']
): string {
  switch (reason) {
    case 'empty_title':
      return 'اكتب عنوانًا للمحاكاة.';
    case 'empty_instructions':
      return 'اكتب تعليمات واضحة للمحاكاة.';
    case 'invalid_config':
      return 'تحقق من إعدادات المحاكاة الرقمية وحدود القيم.';
  }
}

export function TeacherSimulationsEditor({
  simulations,
  objectives,
  readOnly,
  disabled,
  onChange,
}: TeacherSimulationsEditorProps) {
  const [editor, setEditor] = useState<SimulationEditorState>(null);

  const [message, setMessage] = useState<string | null>(null);

  const controlsDisabled = readOnly || disabled;

  const startAdd = () => {
    if (controlsDisabled) return;

    setEditor({
      mode: 'add',
      form: emptySimulationForm(),
    });

    setMessage(null);
  };

  const startEdit = (simulation: SimulationDraft) => {
    if (controlsDisabled) return;

    setEditor({
      mode: 'edit',
      key: simulation.key,
      form: formFromSimulation(simulation),
    });

    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;

    setEditor(null);
    setMessage(null);
  };

  const updateForm = (update: (current: SimulationFormDraft) => SimulationFormDraft) => {
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

  const updateConfig = (key: keyof SimulationNumericForm, value: string) => {
    updateForm((form) => ({
      ...form,
      config: {
        ...form.config,
        [key]: value,
      },
    }));
  };

  const toggleObjective = (objectiveKey: string) => {
    updateForm((form) => ({
      ...form,
      objectiveKeys: toggleObjectiveKey(form.objectiveKeys, objectiveKey),
    }));
  };

  const applyEdit = () => {
    if (!editor || controlsDisabled) return;

    const draft = buildSimulationDraft(editor.form);

    if (!draft) {
      setMessage('أكمل جميع القيم العددية للمحاكاة بقيم صالحة.');
      return;
    }

    const validation = validateSimulationDraft(draft);

    if (!validation.valid) {
      setMessage(validationMessage(validation.reason));
      return;
    }

    if (editor.mode === 'add') {
      const key = createTeacherActivityKey(
        'simulation',
        simulations.map((simulation) => simulation.key)
      );

      onChange([
        ...simulations,
        {
          key,
          ...validation.simulation,
        },
      ]);
    } else {
      onChange(
        replaceByKey(simulations, editor.key, {
          key: editor.key,
          ...validation.simulation,
        })
      );
    }

    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (simulation: SimulationDraft) => {
    if (controlsDisabled) return;

    onChange(removeByKey(simulations, simulation.key));

    if (editor?.mode === 'edit' && editor.key === simulation.key) {
      setEditor(null);
    }

    setMessage(null);
  };

  const objectiveLabel = (key: string): string =>
    objectives.find((objective) => objective.key === key)?.text ?? `هدف غير موجود: ${key}`;

  return (
    <section className="teacher-editor-card-section" aria-labelledby="teacher-simulations-title">
      <div className="teacher-section-heading-row">
        <div className="teacher-section-heading-copy">
          <span className="teacher-section-kicker">الأنشطة العلمية</span>

          <h3 id="teacher-simulations-title">المحاكاة</h3>

          <p>اضبط محاكاة الموجة ضمن الحدود العلمية المعتمدة واربطها بأهداف التعلم.</p>
        </div>

        <span className="teacher-count-badge">{simulations.length} محاكاة</span>
      </div>

      {message ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {message}
        </div>
      ) : null}

      {simulations.length === 0 ? (
        <div className="teacher-empty-state">لا توجد محاكاة في هذه المسودة بعد.</div>
      ) : (
        <ol className="teacher-item-list">
          {simulations.map((simulation, index) => (
            <li key={simulation.key} className="teacher-item-card">
              <div className="teacher-item-card-main">
                <span className="teacher-item-number" aria-hidden="true">
                  {index + 1}
                </span>

                <div>
                  <strong className="teacher-item-title">{simulation.title}</strong>

                  <p>{simulation.instructions}</p>
                </div>
              </div>

              <div className="teacher-question-meta">
                <span>سرعة الوسط: {simulation.config.mediumSpeedMps} m/s</span>

                <span>
                  التردد: {simulation.config.frequencyHz.min}–{simulation.config.frequencyHz.max} Hz
                </span>

                <span>
                  السعة: {simulation.config.amplitudeM.min}–{simulation.config.amplitudeM.max} m
                </span>

                <span>
                  الأهداف:{' '}
                  {simulation.objectiveKeys.length > 0
                    ? simulation.objectiveKeys.map(objectiveLabel).join('، ')
                    : 'لم تربط بعد'}
                </span>
              </div>

              {!readOnly ? (
                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action"
                    aria-label={`تعديل المحاكاة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => startEdit(simulation)}
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف المحاكاة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => requestDelete(simulation)}
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
          <AppButton label="إضافة محاكاة" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          className="teacher-form-panel"
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة محاكاة' : 'تعديل محاكاة'}
        >
          <div className="teacher-form-panel-heading">
            <strong>{editor.mode === 'add' ? 'محاكاة جديدة' : 'تعديل المحاكاة'}</strong>

            <span>المحرك المتاح حاليًا هو محاكاة الموجة المستعرضة.</span>
          </div>

          <label className="teacher-field">
            <span className="teacher-field-label">عنوان المحاكاة</span>

            <input
              aria-label="عنوان المحاكاة"
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
            <span className="teacher-field-label">تعليمات المحاكاة</span>

            <textarea
              aria-label="تعليمات المحاكاة"
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
            <legend>إعدادات الموجة المستعرضة</legend>

            <div className="teacher-question-form-grid">
              <label className="teacher-field">
                <span className="teacher-field-label">سرعة الوسط m/s</span>

                <input
                  aria-label="سرعة الوسط"
                  inputMode="decimal"
                  value={editor.form.config.mediumSpeedMps}
                  disabled={disabled}
                  onChange={(event) => updateConfig('mediumSpeedMps', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">أقل تردد Hz</span>

                <input
                  aria-label="أقل تردد"
                  inputMode="decimal"
                  value={editor.form.config.frequencyMin}
                  disabled={disabled}
                  onChange={(event) => updateConfig('frequencyMin', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">أعلى تردد Hz</span>

                <input
                  aria-label="أعلى تردد"
                  inputMode="decimal"
                  value={editor.form.config.frequencyMax}
                  disabled={disabled}
                  onChange={(event) => updateConfig('frequencyMax', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">خطوة التردد</span>

                <input
                  aria-label="خطوة التردد"
                  inputMode="decimal"
                  value={editor.form.config.frequencyStep}
                  disabled={disabled}
                  onChange={(event) => updateConfig('frequencyStep', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">التردد الابتدائي</span>

                <input
                  aria-label="التردد الابتدائي"
                  inputMode="decimal"
                  value={editor.form.config.frequencyInitial}
                  disabled={disabled}
                  onChange={(event) => updateConfig('frequencyInitial', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">أقل سعة m</span>

                <input
                  aria-label="أقل سعة"
                  inputMode="decimal"
                  value={editor.form.config.amplitudeMin}
                  disabled={disabled}
                  onChange={(event) => updateConfig('amplitudeMin', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">أعلى سعة m</span>

                <input
                  aria-label="أعلى سعة"
                  inputMode="decimal"
                  value={editor.form.config.amplitudeMax}
                  disabled={disabled}
                  onChange={(event) => updateConfig('amplitudeMax', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">خطوة السعة</span>

                <input
                  aria-label="خطوة السعة"
                  inputMode="decimal"
                  value={editor.form.config.amplitudeStep}
                  disabled={disabled}
                  onChange={(event) => updateConfig('amplitudeStep', event.target.value)}
                />
              </label>

              <label className="teacher-field">
                <span className="teacher-field-label">السعة الابتدائية</span>

                <input
                  aria-label="السعة الابتدائية"
                  inputMode="decimal"
                  value={editor.form.config.amplitudeInitial}
                  disabled={disabled}
                  onChange={(event) => updateConfig('amplitudeInitial', event.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="teacher-choice-fieldset">
            <legend>أهداف التعلم المرتبطة</legend>

            {objectives.length === 0 ? (
              <div className="teacher-empty-state">
                أضف أهداف التعلم أولًا ثم اربط المحاكاة بها.
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
                label={editor.mode === 'add' ? 'إضافة المحاكاة' : 'حفظ تعديل المحاكاة'}
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

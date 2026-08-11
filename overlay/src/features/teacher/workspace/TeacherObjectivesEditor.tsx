import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import {
  createObjectiveKey,
  getObjectiveStateIssue,
  isObjectiveReferenced,
  removeObjectiveByKey,
  replaceObjectiveText,
  validateObjectiveDraft,
} from './teacher-lesson-structure';

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type QuestionDraft = LessonRevisionPayload['questions'][number];

type ObjectiveEditorState =
  | { readonly mode: 'add'; readonly text: string }
  | { readonly mode: 'edit'; readonly key: string; readonly text: string }
  | null;

interface TeacherObjectivesEditorProps {
  readonly objectives: readonly ObjectiveDraft[];
  readonly questions: readonly QuestionDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (objectives: readonly ObjectiveDraft[]) => void;
}

export function TeacherObjectivesEditor({
  objectives,
  questions,
  readOnly,
  disabled,
  onChange,
}: TeacherObjectivesEditorProps) {
  const [editor, setEditor] = useState<ObjectiveEditorState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const objectiveStateIssue = getObjectiveStateIssue(objectives);
  const controlsDisabled = readOnly || disabled;

  const startAdd = () => {
    if (controlsDisabled) return;
    setEditor({ mode: 'add', text: '' });
    setMessage(null);
  };

  const startEdit = (objective: ObjectiveDraft) => {
    if (controlsDisabled) return;
    setEditor({ mode: 'edit', key: objective.key, text: objective.text });
    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;
    setEditor(null);
    setMessage(null);
  };

  const applyEdit = () => {
    if (!editor || controlsDisabled) return;

    const validation = validateObjectiveDraft(editor.text);
    if (!validation.valid) {
      setMessage('اكتب نص هدف تعلم قبل إضافته إلى الدرس.');
      return;
    }

    if (editor.mode === 'add') {
      onChange([
        ...objectives,
        {
          key: createObjectiveKey(objectives),
          text: validation.text,
        },
      ]);
    } else {
      onChange(replaceObjectiveText(objectives, editor.key, validation.text));
    }

    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (objective: ObjectiveDraft) => {
    if (controlsDisabled) return;

    if (isObjectiveReferenced(objective.key, questions)) {
      setMessage(
        'لا يمكن حذف هذا الهدف لأنه مرتبط بأسئلة موجودة. أعد ربط هذه الأسئلة بهدف آخر أو احذفها أولًا.'
      );
      return;
    }

    onChange(removeObjectiveByKey(objectives, objective.key));
    if (editor?.mode === 'edit' && editor.key === objective.key) {
      setEditor(null);
    }
    setMessage(null);
  };

  return (
    <section
      className="teacher-editor-card-section"
      aria-labelledby="teacher-objectives-title"
    >
      <div className="teacher-section-heading-row">
        <div className="teacher-section-heading-copy">
          <span className="teacher-section-kicker">المكوّن الثاني</span>
          <h3 id="teacher-objectives-title">أهداف التعلم</h3>
          <p>ترتبط الأسئلة لاحقًا بمفتاح داخلي ثابت لكل هدف. يظهر للمعلم نص الهدف فقط.</p>
        </div>
        <span className="teacher-count-badge">{objectives.length} أهداف</span>
      </div>

      {objectiveStateIssue ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          بيانات أهداف التعلم الحالية تحتاج إلى تصحيح قبل اعتمادها للحفظ.
        </div>
      ) : null}

      {message ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {message}
        </div>
      ) : null}

      {objectives.length === 0 ? (
        <div className="teacher-empty-state">لا توجد أهداف تعلم في هذه المسودة بعد.</div>
      ) : (
        <ol className="teacher-item-list teacher-objective-list">
          {objectives.map((objective, index) => (
            <li className="teacher-item-card" key={objective.key}>
              <div className="teacher-item-card-main">
                <span className="teacher-item-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="teacher-item-title">{objective.text}</span>
              </div>
              {!readOnly ? (
                <div className="teacher-inline-actions">
                  <button
                    className="teacher-inline-action"
                    type="button"
                    aria-label={`تعديل الهدف ${index + 1}`}
                    disabled={disabled}
                    onClick={() => startEdit(objective)}
                  >
                    تعديل
                  </button>
                  <button
                    className="teacher-inline-action teacher-inline-action--danger"
                    type="button"
                    aria-label={`حذف الهدف ${index + 1}`}
                    disabled={disabled}
                    onClick={() => requestDelete(objective)}
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
          <AppButton label="إضافة هدف" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          className="teacher-form-panel"
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة هدف تعلم' : 'تعديل هدف تعلم'}
        >
          <div className="teacher-form-panel-heading">
            <strong>{editor.mode === 'add' ? 'هدف تعلم جديد' : 'تعديل هدف التعلم'}</strong>
            <span>اكتب الهدف بصياغة واضحة ومباشرة.</span>
          </div>

          <label className="teacher-field">
            <span className="teacher-field-label">نص هدف التعلم</span>
            <input
              aria-label="نص هدف التعلم"
              value={editor.text}
              disabled={disabled}
              onChange={(event) =>
                setEditor((current) =>
                  current ? { ...current, text: event.target.value } : current
                )
              }
            />
          </label>

          <div className="teacher-editor-actions teacher-editor-actions--compact">
            <div className="teacher-editor-action">
              <AppButton
                label={editor.mode === 'add' ? 'إضافة الهدف' : 'حفظ تعديل الهدف'}
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

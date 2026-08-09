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
    <section aria-labelledby="teacher-objectives-title" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
        <h3 id="teacher-objectives-title" style={{ margin: 0 }}>
          أهداف التعلم
        </h3>
        <p style={{ margin: 0 }}>
          ترتبط الأسئلة لاحقًا بمفتاح داخلي ثابت لكل هدف. يظهر للمعلم نص الهدف فقط.
        </p>
      </div>

      {objectiveStateIssue ? (
        <div role="alert" style={{ marginBottom: '0.75rem' }}>
          بيانات أهداف التعلم الحالية تحتاج إلى تصحيح قبل اعتمادها للحفظ.
        </div>
      ) : null}

      {message ? (
        <div role="alert" style={{ marginBottom: '0.75rem' }}>
          {message}
        </div>
      ) : null}

      {objectives.length === 0 ? (
        <p>لا توجد أهداف تعلم في هذه المسودة بعد.</p>
      ) : (
        <ol style={{ display: 'grid', gap: '0.75rem', paddingInlineStart: '1.5rem' }}>
          {objectives.map((objective, index) => (
            <li key={objective.key}>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <span>{objective.text}</span>
                {!readOnly ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      aria-label={`تعديل الهدف ${index + 1}`}
                      disabled={disabled}
                      onClick={() => startEdit(objective)}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      aria-label={`حذف الهدف ${index + 1}`}
                      disabled={disabled}
                      onClick={() => requestDelete(objective)}
                    >
                      حذف
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {!readOnly && !editor ? (
        <div style={{ width: '180px', marginTop: '0.75rem' }}>
          <AppButton label="إضافة هدف" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة هدف تعلم' : 'تعديل هدف تعلم'}
          style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}
        >
          <label>
            نص هدف التعلم
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

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ width: '180px' }}>
              <AppButton
                label={editor.mode === 'add' ? 'إضافة الهدف' : 'حفظ تعديل الهدف'}
                onClick={applyEdit}
                disabled={disabled}
              />
            </div>
            <div style={{ width: '140px' }}>
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

import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import {
  createTeacherActivityKey,
  removeByKey,
  replaceByKey,
  toggleObjectiveKey,
  validateMatchingGameDraft,
} from './teacher-activity-editor-utils';

type GameDraft = LessonRevisionPayload['games'][number];
type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type GameFormDraft = Omit<GameDraft, 'key'>;

type GameEditorState =
  | {
      readonly mode: 'add';
      readonly form: GameFormDraft;
    }
  | {
      readonly mode: 'edit';
      readonly key: string;
      readonly form: GameFormDraft;
    }
  | null;

interface TeacherMatchingGamesEditorProps {
  readonly games: readonly GameDraft[];
  readonly objectives: readonly ObjectiveDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (games: readonly GameDraft[]) => void;
}

function emptyGameForm(): GameFormDraft {
  return {
    type: 'matching',
    title: '',
    instructions: '',
    items: [
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    objectiveKeys: [],
  };
}

function formFromGame(game: GameDraft): GameFormDraft {
  return {
    type: 'matching',
    title: game.title,
    instructions: game.instructions,
    items: game.items.map((item) => ({ ...item })),
    objectiveKeys: [...game.objectiveKeys],
  };
}

function validationMessage(
  reason: Exclude<ReturnType<typeof validateMatchingGameDraft>, { readonly valid: true }>['reason']
): string {
  switch (reason) {
    case 'empty_title':
      return 'اكتب عنوانًا للعبة.';
    case 'empty_instructions':
      return 'اكتب تعليمات واضحة للعبة.';
    case 'too_few_items':
      return 'أضف زوجين على الأقل إلى لعبة المطابقة.';
    case 'empty_item':
      return 'أكمل طرفي كل زوج قبل إضافته إلى اللعبة.';
  }
}

export function TeacherMatchingGamesEditor({
  games,
  objectives,
  readOnly,
  disabled,
  onChange,
}: TeacherMatchingGamesEditorProps) {
  const [editor, setEditor] = useState<GameEditorState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const controlsDisabled = readOnly || disabled;

  const startAdd = () => {
    if (controlsDisabled) return;
    setEditor({
      mode: 'add',
      form: emptyGameForm(),
    });
    setMessage(null);
  };

  const startEdit = (game: GameDraft) => {
    if (controlsDisabled) return;
    setEditor({
      mode: 'edit',
      key: game.key,
      form: formFromGame(game),
    });
    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;
    setEditor(null);
    setMessage(null);
  };

  const updateForm = (update: (current: GameFormDraft) => GameFormDraft) => {
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

  const updateItem = (index: number, field: 'left' | 'right', value: string) => {
    updateForm((form) => ({
      ...form,
      items: form.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const addItem = () => {
    updateForm((form) => ({
      ...form,
      items: [...form.items, { left: '', right: '' }],
    }));
  };

  const removeItem = (index: number) => {
    updateForm((form) => ({
      ...form,
      items: form.items.filter((_, itemIndex) => itemIndex !== index),
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

    const validation = validateMatchingGameDraft(editor.form);

    if (!validation.valid) {
      setMessage(validationMessage(validation.reason));
      return;
    }

    if (editor.mode === 'add') {
      const key = createTeacherActivityKey(
        'game',
        games.map((game) => game.key)
      );

      onChange([
        ...games,
        {
          key,
          ...validation.game,
        },
      ]);
    } else {
      onChange(
        replaceByKey(games, editor.key, {
          key: editor.key,
          ...validation.game,
        })
      );
    }

    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (game: GameDraft) => {
    if (controlsDisabled) return;

    onChange(removeByKey(games, game.key));

    if (editor?.mode === 'edit' && editor.key === game.key) {
      setEditor(null);
    }

    setMessage(null);
  };

  const objectiveLabel = (key: string): string =>
    objectives.find((objective) => objective.key === key)?.text ?? `هدف غير موجود: ${key}`;

  return (
    <section className="teacher-editor-card-section" aria-labelledby="teacher-matching-games-title">
      <div className="teacher-section-heading-row">
        <div className="teacher-section-heading-copy">
          <span className="teacher-section-kicker">الأنشطة العلمية</span>
          <h3 id="teacher-matching-games-title">ألعاب المطابقة</h3>
          <p>أنشئ أزواج مطابقة واربط اللعبة بأهداف التعلم المناسبة.</p>
        </div>

        <span className="teacher-count-badge">{games.length} ألعاب</span>
      </div>

      {message ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {message}
        </div>
      ) : null}

      {games.length === 0 ? (
        <div className="teacher-empty-state">لا توجد ألعاب مطابقة في هذه المسودة بعد.</div>
      ) : (
        <ol className="teacher-item-list">
          {games.map((game, index) => (
            <li className="teacher-item-card" key={game.key}>
              <div className="teacher-item-card-main">
                <span className="teacher-item-number" aria-hidden="true">
                  {index + 1}
                </span>

                <div>
                  <strong className="teacher-item-title">{game.title}</strong>
                  <p>{game.instructions}</p>
                </div>
              </div>

              <div className="teacher-question-meta">
                <span>{game.items.length} أزواج</span>
                <span>
                  الأهداف:{' '}
                  {game.objectiveKeys.length > 0
                    ? game.objectiveKeys.map(objectiveLabel).join('، ')
                    : 'لم تربط بعد'}
                </span>
              </div>

              {!readOnly ? (
                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action"
                    aria-label={`تعديل اللعبة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => startEdit(game)}
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف اللعبة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => requestDelete(game)}
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
          <AppButton label="إضافة لعبة مطابقة" onClick={startAdd} disabled={disabled} />
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          className="teacher-form-panel"
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة لعبة مطابقة' : 'تعديل لعبة مطابقة'}
        >
          <div className="teacher-form-panel-heading">
            <strong>{editor.mode === 'add' ? 'لعبة مطابقة جديدة' : 'تعديل لعبة المطابقة'}</strong>
            <span>تبقى التعديلات داخل Form Buffer حتى تطبيقها.</span>
          </div>

          <label className="teacher-field">
            <span className="teacher-field-label">عنوان اللعبة</span>
            <input
              aria-label="عنوان اللعبة"
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
            <span className="teacher-field-label">تعليمات اللعبة</span>
            <textarea
              aria-label="تعليمات اللعبة"
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
            <legend>أزواج المطابقة</legend>

            <div className="teacher-choice-editor-list">
              {editor.form.items.map((item, index) => (
                <div className="teacher-item-card" key={`matching-item-${index}`}>
                  <div className="teacher-question-form-grid">
                    <label className="teacher-field">
                      <span className="teacher-field-label">الطرف الأول {index + 1}</span>
                      <input
                        aria-label={`الطرف الأول ${index + 1}`}
                        value={item.left}
                        disabled={disabled}
                        onChange={(event) => updateItem(index, 'left', event.target.value)}
                      />
                    </label>

                    <label className="teacher-field">
                      <span className="teacher-field-label">الطرف المقابل {index + 1}</span>
                      <input
                        aria-label={`الطرف المقابل ${index + 1}`}
                        value={item.right}
                        disabled={disabled}
                        onChange={(event) => updateItem(index, 'right', event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="teacher-inline-actions">
                    <button
                      type="button"
                      className="teacher-inline-action teacher-inline-action--danger"
                      aria-label={`حذف زوج المطابقة ${index + 1}`}
                      disabled={disabled}
                      onClick={() => removeItem(index)}
                    >
                      حذف الزوج
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="teacher-inline-action"
              disabled={disabled}
              onClick={addItem}
            >
              إضافة زوج
            </button>
          </fieldset>

          <fieldset className="teacher-choice-fieldset">
            <legend>أهداف التعلم المرتبطة</legend>

            {objectives.length === 0 ? (
              <div className="teacher-empty-state">أضف أهداف التعلم أولًا ثم اربط اللعبة بها.</div>
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
                label={editor.mode === 'add' ? 'إضافة اللعبة' : 'حفظ تعديل اللعبة'}
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

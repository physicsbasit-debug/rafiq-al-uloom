import { useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevisionPayload } from '@services/authoring';

import {
  createQuestionKey,
  getAvailableObjectiveOptions,
  getQuestionStateIssue,
  isObjectiveKeyAvailable,
  removeQuestionByKey,
  replaceQuestion,
  validateQuestionDraft,
  type TeacherQuestionFormDraft,
} from './teacher-lesson-structure';

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type QuestionDraft = LessonRevisionPayload['questions'][number];
type Difficulty = QuestionDraft['difficulty'];

type QuestionEditorState =
  | { readonly mode: 'add'; readonly form: TeacherQuestionFormDraft }
  | { readonly mode: 'edit'; readonly key: string; readonly form: TeacherQuestionFormDraft }
  | null;

interface TeacherQuestionsEditorProps {
  readonly objectives: readonly ObjectiveDraft[];
  readonly questions: readonly QuestionDraft[];
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly onChange: (questions: readonly QuestionDraft[]) => void;
}

const DIFFICULTY_OPTIONS: readonly { readonly value: Difficulty; readonly label: string }[] = [
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
];

function emptyQuestionForm(): TeacherQuestionFormDraft {
  return {
    purpose: 'review',
    prompt: '',
    choices: ['', ''],
    correctAnswerIndex: null,
    explanation: '',
    objectiveKey: '',
    difficulty: 'medium',
  };
}

function questionToForm(question: QuestionDraft): TeacherQuestionFormDraft {
  return {
    purpose: question.purpose,
    prompt: question.prompt,
    choices: [...question.choices],
    correctAnswerIndex: question.correctAnswerIndex,
    explanation: question.explanation,
    objectiveKey: question.objectiveKey,
    difficulty: question.difficulty,
  };
}

function validationMessage(reason: string): string {
  switch (reason) {
    case 'empty_prompt':
      return 'اكتب نص السؤال قبل إضافته إلى الدرس.';
    case 'too_few_choices':
      return 'يجب أن يحتوي سؤال الاختيار من متعدد على اختيارين على الأقل.';
    case 'empty_choice':
      return 'لا يمكن أن يحتوي السؤال على اختيار فارغ.';
    case 'missing_correct_answer':
    case 'correct_answer_out_of_range':
      return 'حدّد الإجابة الصحيحة من الاختيارات الحالية.';
    case 'empty_explanation':
      return 'اكتب شرح الإجابة قبل إضافة السؤال.';
    case 'missing_objective':
    case 'objective_not_available':
      return 'اختر هدف تعلم موجودًا حاليًا قبل إضافة السؤال.';
    default:
      return 'راجع بيانات السؤال قبل تطبيقه.';
  }
}

export function TeacherQuestionsEditor({
  objectives,
  questions,
  readOnly,
  disabled,
  onChange,
}: TeacherQuestionsEditorProps) {
  const [editor, setEditor] = useState<QuestionEditorState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previousObjectives, setPreviousObjectives] = useState(objectives);
  const questionStateIssue = getQuestionStateIssue(questions, objectives);
  const controlsDisabled = readOnly || disabled;
  const objectiveOptions = getAvailableObjectiveOptions(objectives);

  if (objectives !== previousObjectives) {
    setPreviousObjectives(objectives);

    if (
      editor?.form.objectiveKey &&
      !isObjectiveKeyAvailable(objectives, editor.form.objectiveKey)
    ) {
      setEditor({
        ...editor,
        form: {
          ...editor.form,
          objectiveKey: '',
        },
      });
      setMessage(
        'الهدف الذي كان مرتبطًا بهذا السؤال لم يعد موجودًا. اختر هدفًا آخر قبل تطبيق السؤال.'
      );
    }
  }

  const updateForm = (next: Partial<TeacherQuestionFormDraft>) => {
    if (controlsDisabled) return;
    setEditor((current) =>
      current
        ? {
            ...current,
            form: {
              ...current.form,
              ...next,
            },
          }
        : current
    );
    setMessage(null);
  };

  const startAdd = () => {
    if (controlsDisabled || objectives.length === 0) return;
    setEditor({ mode: 'add', form: emptyQuestionForm() });
    setMessage(null);
  };

  const startEdit = (question: QuestionDraft) => {
    if (controlsDisabled) return;
    setEditor({ mode: 'edit', key: question.key, form: questionToForm(question) });
    setMessage(null);
  };

  const cancelEdit = () => {
    if (disabled) return;
    setEditor(null);
    setMessage(null);
  };

  const updateChoice = (index: number, value: string) => {
    if (!editor || controlsDisabled) return;
    const choices = editor.form.choices.map((choice, choiceIndex) =>
      choiceIndex === index ? value : choice
    );
    updateForm({ choices });
  };

  const addChoice = () => {
    if (!editor || controlsDisabled) return;
    updateForm({ choices: [...editor.form.choices, ''] });
  };

  const removeChoice = (index: number) => {
    if (!editor || controlsDisabled || editor.form.choices.length <= 2) return;

    const choices = editor.form.choices.filter((_, choiceIndex) => choiceIndex !== index);
    let correctAnswerIndex = editor.form.correctAnswerIndex;

    if (correctAnswerIndex === index) {
      correctAnswerIndex = null;
    } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
      correctAnswerIndex -= 1;
    }

    updateForm({ choices, correctAnswerIndex });
  };

  const applyEdit = () => {
    if (!editor || controlsDisabled) return;

    const validation = validateQuestionDraft(editor.form, objectives);
    if (!validation.valid) {
      setMessage(validationMessage(validation.reason));
      return;
    }

    const question: QuestionDraft = {
      key: editor.mode === 'add' ? createQuestionKey(questions) : editor.key,
      type: 'multiple_choice',
      ...validation.question,
    };

    onChange(
      editor.mode === 'add'
        ? [...questions, question]
        : replaceQuestion(questions, editor.key, question)
    );
    setEditor(null);
    setMessage(null);
  };

  const requestDelete = (question: QuestionDraft) => {
    if (controlsDisabled) return;
    onChange(removeQuestionByKey(questions, question.key));
    if (editor?.mode === 'edit' && editor.key === question.key) {
      setEditor(null);
    }
    setMessage(null);
  };

  return (
    <section aria-labelledby="teacher-questions-title" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
        <h3 id="teacher-questions-title" style={{ margin: 0 }}>
          أسئلة الدرس
        </h3>
        <p style={{ margin: 0 }}>
          كل سؤال اختيار من متعدد يرتبط بهدف تعلم موجود حاليًا داخل نفس المسودة.
        </p>
      </div>

      {questionStateIssue ? (
        <div role="alert" style={{ marginBottom: '0.75rem' }}>
          بيانات الأسئلة الحالية تحتاج إلى تصحيح قبل حفظ هذه الحالة أو إرسالها.
        </div>
      ) : null}

      {message ? (
        <div role="alert" style={{ marginBottom: '0.75rem' }}>
          {message}
        </div>
      ) : null}

      {questions.length === 0 ? (
        <p>لا توجد أسئلة في هذه المسودة بعد.</p>
      ) : (
        <ol style={{ display: 'grid', gap: '0.75rem', paddingInlineStart: '1.5rem' }}>
          {questions.map((question, index) => (
            <li key={question.key}>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <strong>{question.prompt}</strong>
                <span>{question.purpose === 'mastery' ? 'إتقان' : 'مراجعة'}</span>
                <span>
                  الهدف:{' '}
                  {objectiveOptions.find((option) => option.key === question.objectiveKey)?.label ??
                    'غير موجود'}
                </span>
                <ul style={{ margin: 0, paddingInlineStart: '1.5rem' }}>
                  {question.choices.map((choice, choiceIndex) => (
                    <li key={choiceIndex}>
                      {choice}
                      {choiceIndex === question.correctAnswerIndex ? ' — الإجابة الصحيحة' : ''}
                    </li>
                  ))}
                </ul>
                <span>الشرح: {question.explanation}</span>
                <span>
                  الصعوبة:{' '}
                  {DIFFICULTY_OPTIONS.find((option) => option.value === question.difficulty)
                    ?.label ?? question.difficulty}
                </span>
                {!readOnly ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      aria-label={`تعديل السؤال ${index + 1}`}
                      disabled={disabled}
                      onClick={() => startEdit(question)}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      aria-label={`حذف السؤال ${index + 1}`}
                      disabled={disabled}
                      onClick={() => requestDelete(question)}
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
        <div style={{ marginTop: '0.75rem' }}>
          {objectives.length === 0 ? <p>أضف هدف تعلم أولًا حتى يمكن ربط السؤال به.</p> : null}
          <div style={{ width: '180px' }}>
            <AppButton
              label="إضافة سؤال"
              onClick={startAdd}
              disabled={disabled || objectives.length === 0}
            />
          </div>
        </div>
      ) : null}

      {!readOnly && editor ? (
        <div
          role="group"
          aria-label={editor.mode === 'add' ? 'إضافة سؤال' : 'تعديل سؤال'}
          style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}
        >
          <label>
            الغرض
            <select
              aria-label="غرض السؤال"
              value={editor.form.purpose}
              disabled={disabled}
              onChange={(event) =>
                updateForm({ purpose: event.target.value as QuestionDraft['purpose'] })
              }
            >
              <option value="review">مراجعة</option>
              <option value="mastery">إتقان</option>
            </select>
          </label>

          <label>
            نص السؤال
            <textarea
              aria-label="نص السؤال"
              value={editor.form.prompt}
              disabled={disabled}
              onChange={(event) => updateForm({ prompt: event.target.value })}
            />
          </label>

          <fieldset disabled={disabled}>
            <legend>الاختيارات</legend>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {editor.form.choices.map((choice, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label>
                    الاختيار {index + 1}
                    <input
                      aria-label={`الاختيار ${index + 1}`}
                      value={choice}
                      onChange={(event) => updateChoice(index, event.target.value)}
                    />
                  </label>
                  {editor.form.choices.length > 2 ? (
                    <button
                      type="button"
                      aria-label={`حذف الاختيار ${index + 1}`}
                      onClick={() => removeChoice(index)}
                    >
                      حذف الاختيار
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button type="button" onClick={addChoice}>
              إضافة اختيار
            </button>
          </fieldset>

          <label>
            الإجابة الصحيحة
            <select
              aria-label="الإجابة الصحيحة"
              value={editor.form.correctAnswerIndex ?? ''}
              disabled={disabled}
              onChange={(event) =>
                updateForm({
                  correctAnswerIndex: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            >
              <option value="">اختر الإجابة الصحيحة</option>
              {editor.form.choices.map((choice, index) => (
                <option key={index} value={index}>
                  {`الاختيار ${index + 1}${choice.trim() ? `: ${choice}` : ''}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            شرح الإجابة
            <textarea
              aria-label="شرح الإجابة"
              value={editor.form.explanation}
              disabled={disabled}
              onChange={(event) => updateForm({ explanation: event.target.value })}
            />
          </label>

          <label>
            الهدف المرتبط
            <select
              aria-label="الهدف المرتبط بالسؤال"
              value={editor.form.objectiveKey}
              disabled={disabled}
              onChange={(event) => updateForm({ objectiveKey: event.target.value })}
            >
              <option value="">اختر هدف تعلم</option>
              {objectiveOptions.map((objective) => (
                <option key={objective.key} value={objective.key}>
                  {objective.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            الصعوبة
            <select
              aria-label="صعوبة السؤال"
              value={editor.form.difficulty}
              disabled={disabled}
              onChange={(event) => updateForm({ difficulty: event.target.value as Difficulty })}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ width: '180px' }}>
              <AppButton
                label={editor.mode === 'add' ? 'إضافة السؤال' : 'حفظ تعديل السؤال'}
                onClick={applyEdit}
                disabled={disabled || !editor.form.objectiveKey}
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

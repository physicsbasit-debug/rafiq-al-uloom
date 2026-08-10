// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherQuestionsEditor } from '@features/teacher/workspace/TeacherQuestionsEditor';
import type { LessonRevisionPayload } from '@services/authoring';

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type QuestionDraft = LessonRevisionPayload['questions'][number];

const objectiveA: ObjectiveDraft = {
  key: 'teacher-objective-1',
  text: 'يفسر انعكاس الموجات',
};

const objectiveB: ObjectiveDraft = {
  key: 'teacher-objective-2',
  text: 'يفسر انكسار الموجات',
};

const question: QuestionDraft = {
  key: 'teacher-question-1',
  purpose: 'review',
  type: 'multiple_choice',
  prompt: 'ما معنى الانعكاس؟',
  choices: ['ارتداد الموجة', 'تغيّر ترددها'],
  correctAnswerIndex: 0,
  explanation: 'الانعكاس هو ارتداد الموجة عن حاجز.',
  objectiveKey: objectiveA.key,
  difficulty: 'easy',
};

function fillValidQuestion(objectiveKey = objectiveA.key) {
  fireEvent.change(screen.getByRole('combobox', { name: 'غرض السؤال' }), {
    target: { value: 'mastery' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'نص السؤال' }), {
    target: { value: '  ما أثر زيادة التردد؟  ' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
    target: { value: 'يزداد عدد الاهتزازات' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 2' }), {
    target: { value: 'ينعدم الزمن الدوري' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' }), {
    target: { value: '0' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'شرح الإجابة' }), {
    target: { value: '  التردد هو عدد الاهتزازات في الثانية.  ' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
    target: { value: objectiveKey },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'صعوبة السؤال' }), {
    target: { value: 'hard' },
  });
}

describe('TeacherQuestionsEditor', () => {
  it('لا يسمح ببدء سؤال دون Objective موجودة', () => {
    render(
      <TeacherQuestionsEditor
        objectives={[]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('أضف هدف تعلم أولًا حتى يمكن ربط السؤال به.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إضافة سؤال' })).toBeDisabled();
  });

  it('يبقي السؤال داخل Form Buffer حتى Apply ثم ينشئ key وtype داخليين ويربط objectiveKey الحالي', () => {
    const onChange = vi.fn();
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fillValidQuestion();

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /مفتاح السؤال/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

    expect(onChange).toHaveBeenCalledWith([
      {
        key: 'teacher-question-1',
        purpose: 'mastery',
        type: 'multiple_choice',
        prompt: 'ما أثر زيادة التردد؟',
        choices: ['يزداد عدد الاهتزازات', 'ينعدم الزمن الدوري'],
        correctAnswerIndex: 0,
        explanation: 'التردد هو عدد الاهتزازات في الثانية.',
        objectiveKey: objectiveA.key,
        difficulty: 'hard',
      },
    ]);
  });

  it('يعدل Question موجودة مع الحفاظ على key وعدم commit قبل Apply', () => {
    const onChange = vi.fn();
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[question]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'تعديل السؤال 1' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص السؤال' }), {
      target: { value: 'ما تعريف انعكاس الموجة؟' },
    });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ تعديل السؤال' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        key: question.key,
        prompt: 'ما تعريف انعكاس الموجة؟',
        objectiveKey: objectiveA.key,
      }),
    ]);
  });

  it('يحذف Question محليًا دون أي علاقة حذف بالهدف', () => {
    const onChange = vi.fn();
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[question]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'حذف السؤال 1' }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(screen.getByRole('button', { name: 'إضافة سؤال' })).toBeEnabled();
  });

  it('يحافظ على Form Buffer عند اختفاء Objective المختارة ويفرغ objectiveKey فقط حتى إعادة الربط', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TeacherQuestionsEditor
        objectives={[objectiveA, objectiveB]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fillValidQuestion(objectiveA.key);

    rerender(
      <TeacherQuestionsEditor
        objectives={[objectiveB]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('textbox', { name: 'نص السؤال' })).toHaveValue('  ما أثر زيادة التردد؟  ');
    expect(screen.getByRole('textbox', { name: 'الاختيار 1' })).toHaveValue('يزداد عدد الاهتزازات');
    expect(screen.getByRole('textbox', { name: 'شرح الإجابة' })).toHaveValue(
      '  التردد هو عدد الاهتزازات في الثانية.  '
    );
    expect(screen.getByRole('combobox', { name: 'غرض السؤال' })).toHaveValue('mastery');
    expect(screen.getByRole('combobox', { name: 'صعوبة السؤال' })).toHaveValue('hard');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' })).toHaveValue('')
    );
    expect(screen.getByRole('alert')).toHaveTextContent('لم يعد موجودًا');
    expect(screen.getByRole('button', { name: 'إضافة السؤال' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
      target: { value: objectiveB.key },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        key: 'teacher-question-1',
        purpose: 'mastery',
        prompt: 'ما أثر زيادة التردد؟',
        choices: ['يزداد عدد الاهتزازات', 'ينعدم الزمن الدوري'],
        correctAnswerIndex: 0,
        explanation: 'التردد هو عدد الاهتزازات في الثانية.',
        objectiveKey: objectiveB.key,
        difficulty: 'hard',
      }),
    ]);
  });

  it('إزالة الاختيار الصحيح تفرغ correctAnswerIndex بدل اختيار إجابة بديلة صامتة', () => {
    const onChange = vi.fn();
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fireEvent.click(screen.getByRole('button', { name: 'إضافة اختيار' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' }), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'حذف الاختيار 3' }));

    expect(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' })).toHaveValue('');
  });

  it('حذف اختيار يسبق الإجابة الصحيحة يخفض correctAnswerIndex ويحافظ على نفس الإجابة', () => {
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
      target: { value: 'أ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 2' }), {
      target: { value: 'ب' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة اختيار' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 3' }), {
      target: { value: 'ج' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' }), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'حذف الاختيار 1' }));

    expect(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: 'الاختيار 2' })).toHaveValue('ج');
  });

  it('يعرض difficulty العربية ويحفظ القيم الإنجليزية الثلاث لعقد TypeScript فقط', () => {
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    const difficulty = screen.getByRole('combobox', { name: 'صعوبة السؤال' });
    expect(difficulty).toHaveValue('medium');
    expect(screen.getByRole('option', { name: 'سهل' })).toHaveValue('easy');
    expect(screen.getByRole('option', { name: 'متوسط' })).toHaveValue('medium');
    expect(screen.getByRole('option', { name: 'صعب' })).toHaveValue('hard');
  });

  it('يعرض pending/approved style read-only بلا أدوات mutation', () => {
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[question]}
        readOnly
        disabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(question.prompt)).toBeInTheDocument();
    expect(screen.getByText(/ارتداد الموجة/)).toBeInTheDocument();
    expect(screen.getByText(/الشرح: الانعكاس هو ارتداد الموجة عن حاجز/)).toBeInTheDocument();
    expect(screen.getByText(/الصعوبة:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إضافة سؤال' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تعديل السؤال 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف السؤال 1' })).not.toBeInTheDocument();
  });

  it('يعطل أدوات mutation أثناء save/submit in-flight', () => {
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveA]}
        questions={[question]}
        readOnly={false}
        disabled
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'إضافة سؤال' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تعديل السؤال 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'حذف السؤال 1' })).toBeDisabled();
  });

  it('يعرض committed dangling reference كمشكلة ولا يصلحها صامتًا', () => {
    render(
      <TeacherQuestionsEditor
        objectives={[objectiveB]}
        questions={[question]}
        readOnly={false}
        disabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('تحتاج إلى تصحيح');
    expect(screen.getByText('الهدف: غير موجود')).toBeInTheDocument();
  });
});

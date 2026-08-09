// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherObjectivesEditor } from '@features/teacher/workspace/TeacherObjectivesEditor';
import type { LessonRevisionPayload } from '@services/authoring';

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type QuestionDraft = LessonRevisionPayload['questions'][number];

const objective: ObjectiveDraft = {
  key: 'teacher-objective-1',
  text: 'يفسر انعكاس الموجات',
};

const linkedQuestion: QuestionDraft = {
  key: 'question-1',
  purpose: 'review',
  type: 'multiple_choice',
  prompt: 'سؤال مرتبط',
  choices: ['أ', 'ب'],
  correctAnswerIndex: 0,
  explanation: 'شرح',
  objectiveKey: objective.key,
  difficulty: 'easy',
};

describe('TeacherObjectivesEditor', () => {
  it('يبقي الهدف الجديد في Form Buffer حتى تطبيقه ثم ينشئ مفتاحًا داخليًا غير قابل للتحرير', () => {
    const onChange = vi.fn();
    render(
      <TeacherObjectivesEditor
        objectives={[]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
      target: { value: '  يصف خصائص الموجة  ' },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /مفتاح الهدف/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

    expect(onChange).toHaveBeenCalledWith([
      {
        key: 'teacher-objective-1',
        text: 'يصف خصائص الموجة',
      },
    ]);
  });

  it('يرفض تطبيق Form Buffer فارغ دون تعديل الحمولة', () => {
    const onChange = vi.fn();
    render(
      <TeacherObjectivesEditor
        objectives={[]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

    expect(screen.getByRole('alert')).toHaveTextContent('اكتب نص هدف تعلم');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('يعدل نص الهدف مع الحفاظ على المفتاح نفسه', () => {
    const onChange = vi.fn();
    render(
      <TeacherObjectivesEditor
        objectives={[objective]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'تعديل الهدف 1' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
      target: { value: 'يفسر انكسار الموجات' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ تعديل الهدف' }));

    expect(onChange).toHaveBeenCalledWith([
      {
        key: objective.key,
        text: 'يفسر انكسار الموجات',
      },
    ]);
  });

  it('يحذف هدفًا غير مرتبط دون حذف عناصر أخرى', () => {
    const onChange = vi.fn();
    const second: ObjectiveDraft = { key: 'teacher-objective-2', text: 'هدف ثان' };
    render(
      <TeacherObjectivesEditor
        objectives={[objective, second]}
        questions={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'حذف الهدف 1' }));
    expect(onChange).toHaveBeenCalledWith([second]);
  });

  it('يمنع حذف هدف مرتبط بسؤال ولا ينفذ Cascade أو إعادة ربط صامتة', () => {
    const onChange = vi.fn();
    render(
      <TeacherObjectivesEditor
        objectives={[objective]}
        questions={[linkedQuestion]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'حذف الهدف 1' }));

    expect(screen.getByRole('alert')).toHaveTextContent('مرتبط بأسئلة موجودة');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(objective.text)).toBeInTheDocument();
  });

  it('يعرض الأهداف للقراءة فقط دون أي أدوات إضافة أو تعديل أو حذف', () => {
    render(
      <TeacherObjectivesEditor
        objectives={[objective]}
        questions={[linkedQuestion]}
        readOnly
        disabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(objective.text)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إضافة هدف' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تعديل الهدف 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف الهدف 1' })).not.toBeInTheDocument();
  });

  it('يعطل أدوات التعديل أثناء save/submit in-flight', () => {
    render(
      <TeacherObjectivesEditor
        objectives={[objective]}
        questions={[]}
        readOnly={false}
        disabled
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'إضافة هدف' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تعديل الهدف 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'حذف الهدف 1' })).toBeDisabled();
  });
});

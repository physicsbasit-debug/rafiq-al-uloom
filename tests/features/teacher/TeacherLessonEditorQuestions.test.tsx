// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherLessonEditor } from '@features/teacher/workspace/TeacherLessonEditor';
import type { AuthoringService } from '@services/authoring';

function service(overrides: Partial<AuthoringService> = {}): AuthoringService {
  return {
    listOwnRevisions: vi.fn(),
    listReviewEvents: vi.fn(),
    createLessonRevision: vi.fn(),
    saveLessonRevision: vi.fn(),
    submitLessonRevision: vi.fn(),
    ...overrides,
  };
}

describe('TeacherLessonEditor question composition', () => {
  it('يبني Objective وMastery Question من UI ثم يرسل الرابط نفسه في LessonRevisionPayload عند Save اليدوي', async () => {
    const createLessonRevision = vi.fn<AuthoringService['createLessonRevision']>().mockResolvedValue({
      status: 'created',
      revision: {
        id: '00000000-0000-4000-8000-0000000002b2',
        entityId: null,
        revisionNumber: 1,
        baseFingerprint: null,
      },
    });
    const authoring = service({ createLessonRevision });

    render(<TeacherLessonEditor service={authoring} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
      target: { value: 'يشرح العلاقة بين التردد والزمن الدوري' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'غرض السؤال' }), {
      target: { value: 'mastery' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'نص السؤال' }), {
      target: { value: 'ماذا يحدث للزمن الدوري عند زيادة التردد؟' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
      target: { value: 'يقل' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 2' }), {
      target: { value: 'يزداد' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' }), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'شرح الإجابة' }), {
      target: { value: 'الزمن الدوري يساوي مقلوب التردد.' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
      target: { value: 'teacher-objective-1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'صعوبة السؤال' }), {
      target: { value: 'medium' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

    expect(createLessonRevision).not.toHaveBeenCalled();
    expect(screen.getByText('ماذا يحدث للزمن الدوري عند زيادة التردد؟')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));

    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(createLessonRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          objectives: [
            {
              key: 'teacher-objective-1',
              text: 'يشرح العلاقة بين التردد والزمن الدوري',
            },
          ],
          questions: [
            expect.objectContaining({
              key: 'teacher-question-1',
              purpose: 'mastery',
              type: 'multiple_choice',
              objectiveKey: 'teacher-objective-1',
              difficulty: 'medium',
            }),
          ],
        }),
      }),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('يبقي Question Form Buffer عند حذف Objective ثم يعيد الربط صراحة ويطبق نفس البيانات قبل Save اليدوي', async () => {
    const createLessonRevision = vi.fn<AuthoringService['createLessonRevision']>().mockResolvedValue({
      status: 'created',
      revision: {
        id: '00000000-0000-4000-8000-0000000002b3',
        entityId: null,
        revisionNumber: 1,
        baseFingerprint: null,
      },
    });
    const authoring = service({ createLessonRevision });
    render(<TeacherLessonEditor service={authoring} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
      target: { value: 'هدف مؤقت أول' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
      target: { value: 'هدف بديل موجود' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'غرض السؤال' }), {
      target: { value: 'mastery' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'نص السؤال' }), {
      target: { value: 'سؤال ما يزال داخل الـBuffer' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
      target: { value: 'اختيار أ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 2' }), {
      target: { value: 'اختيار ب' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' }), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'شرح الإجابة' }), {
      target: { value: 'شرح محفوظ محليًا' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
      target: { value: 'teacher-objective-1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'صعوبة السؤال' }), {
      target: { value: 'hard' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'حذف الهدف 1' }));

    expect(screen.getByRole('group', { name: 'إضافة سؤال' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'غرض السؤال' })).toHaveValue('mastery');
    expect(screen.getByRole('textbox', { name: 'نص السؤال' })).toHaveValue(
      'سؤال ما يزال داخل الـBuffer'
    );
    expect(screen.getByRole('textbox', { name: 'الاختيار 1' })).toHaveValue('اختيار أ');
    expect(screen.getByRole('textbox', { name: 'الاختيار 2' })).toHaveValue('اختيار ب');
    expect(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: 'شرح الإجابة' })).toHaveValue('شرح محفوظ محليًا');
    expect(screen.getByRole('combobox', { name: 'صعوبة السؤال' })).toHaveValue('hard');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' })).toHaveValue('')
    );
    expect(screen.getByRole('alert')).toHaveTextContent('لم يعد موجودًا');
    expect(screen.getByRole('button', { name: 'إضافة السؤال' })).toBeDisabled();
    expect(createLessonRevision).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
      target: { value: 'teacher-objective-2' },
    });
    expect(screen.getByRole('button', { name: 'إضافة السؤال' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

    expect(screen.getByText('سؤال ما يزال داخل الـBuffer')).toBeInTheDocument();
    expect(createLessonRevision).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));

    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(createLessonRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          objectives: [{ key: 'teacher-objective-2', text: 'هدف بديل موجود' }],
          questions: [
            {
              key: 'teacher-question-1',
              purpose: 'mastery',
              type: 'multiple_choice',
              prompt: 'سؤال ما يزال داخل الـBuffer',
              choices: ['اختيار أ', 'اختيار ب'],
              correctAnswerIndex: 1,
              explanation: 'شرح محفوظ محليًا',
              objectiveKey: 'teacher-objective-2',
              difficulty: 'hard',
            },
          ],
        }),
      }),
      { signal: expect.any(AbortSignal) }
    );
  });

});

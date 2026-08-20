// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TeacherLessonEditor } from '@features/teacher/workspace/TeacherLessonEditor';
import { TeacherObjectivesEditor } from '@features/teacher/workspace/TeacherObjectivesEditor';
import { TeacherQuestionsEditor } from '@features/teacher/workspace/TeacherQuestionsEditor';
import { DeterministicAiAuthoringProvider, type AiLessonContext } from '@services/ai-authoring';
import type { AuthoringService } from '@services/authoring';
import type { ContentRepository } from '@services/data/content.repository';

const lessonContext: AiLessonContext = {
  language: 'ar',
  gradeLabel: 'الصف العاشر',
  subjectLabel: 'الفيزياء',
  unitTitle: 'الموجات',
  lessonTitle: 'سلوك الموجات',
};

const objective = { key: 'teacher-objective-1', text: 'يفسر انعكاس الموجات' } as const;

function authoringService(): AuthoringService {
  return {
    listOwnRevisions: vi.fn(),
    listReviewEvents: vi.fn(),
    createLessonRevision: vi.fn(),
    saveLessonRevision: vi.fn(),
    submitLessonRevision: vi.fn(),
  };
}

function contentRepository(): ContentRepository {
  return {
    getGrades: vi.fn(async () => [{ id: 'g10', name: 'الصف العاشر', order: 10 }]),
    getSemestersByGrade: vi.fn(async () => [
      { id: 'g10-sem2', gradeId: 'g10', name: 'الفصل الدراسي الثاني', order: 2 },
    ]),
    getSubjectsBySemester: vi.fn(async () => [
      { id: 'g10-physics', gradeId: 'g10', name: 'الفيزياء', themeColor: '#000' },
    ]),
    getUnitsBySubjectAndSemester: vi.fn(async () => [
      {
        id: 'g10-phy-waves-unit',
        subjectId: 'g10-physics',
        semesterId: 'g10-sem2',
        title: 'الموجات',
        order: 1,
      },
    ]),
    getUnitsBySubject: vi.fn(async () => []),
    getLessonsByUnit: vi.fn(async () => []),
    getLessonById: vi.fn(async () => undefined),
    getObjectivesByLesson: vi.fn(async () => []),
    getObjectivesByIds: vi.fn(async () => []),
    getExperimentsByLesson: vi.fn(async () => []),
    getReviewQuestionsByLesson: vi.fn(async () => []),
    getMasteryQuestionsByLesson: vi.fn(async () => []),
    getGamesByLesson: vi.fn(async () => []),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 4-2 wiring REVIEW', () => {
  it('لا يفعّل طلب الملخص حتى يحل ContentRepository السياق الفعلي', async () => {
    render(
      <TeacherLessonEditor
        service={authoringService()}
        aiProvider={new DeterministicAiAuthoringProvider()}
        contentRepository={contentRepository()}
        onBack={vi.fn()}
      />
    );

    const requestButton = screen.getByRole('button', { name: 'اقترح ملخصًا' });
    expect(requestButton).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: 'معرف الوحدة' }), {
      target: { value: 'g10-phy-waves-unit' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'عنوان الدرس' }), {
      target: { value: 'سلوك الموجات' },
    });

    await waitFor(() => expect(requestButton).toBeEnabled());
  });

  it('يحمي كتابة summary الأحدث ولا يستبدلها عند رفض confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <TeacherLessonEditor
        service={authoringService()}
        aiProvider={new DeterministicAiAuthoringProvider({ latencyMs: 25 })}
        contentRepository={contentRepository()}
        onBack={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'معرف الوحدة' }), {
      target: { value: 'g10-phy-waves-unit' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'عنوان الدرس' }), {
      target: { value: 'سلوك الموجات' },
    });
    const summary = screen.getByRole('textbox', { name: 'ملخص الدرس' });
    fireEvent.change(summary, { target: { value: 'ملخص يدوي أول' } });

    const requestButton = screen.getByRole('button', { name: 'اقترح ملخصًا' });
    await waitFor(() => expect(requestButton).toBeEnabled());
    fireEvent.click(requestButton);
    fireEvent.change(summary, { target: { value: 'ملخص يدوي أحدث' } });

    await screen.findByRole('button', { name: 'استخدام الاقتراح' });
    fireEvent.click(screen.getByRole('button', { name: 'استخدام الاقتراح' }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(summary).toHaveValue('ملخص يدوي أحدث');
    confirm.mockRestore();
  });

  it('Objective suggestion يملأ Form Buffer فقط بعد confirmation ولا يستدعي onChange', async () => {
    const onChange = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TeacherObjectivesEditor
        objectives={[]}
        questions={[]}
        readOnly={false}
        disabled={false}
        ai={{
          provider: new DeterministicAiAuthoringProvider({ latencyMs: 25 }),
          lessonContext,
          contextKey: 'objective-context',
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    const text = screen.getByRole('textbox', { name: 'نص هدف التعلم' });
    fireEvent.change(text, { target: { value: 'كتابة أولى' } });
    fireEvent.click(screen.getByRole('button', { name: 'اقترح هدفًا' }));
    fireEvent.change(text, { target: { value: 'كتابة أحدث' } });
    await screen.findByRole('button', { name: 'استخدام الاقتراح' });
    fireEvent.click(screen.getByRole('button', { name: 'استخدام الاقتراح' }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect((text as HTMLTextAreaElement).value).toContain('أن يشرح المتعلم');
    expect(onChange).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('Question snapshot يلتقط تغيير choices العميق ويطلب confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onChange = vi.fn();
    render(
      <TeacherQuestionsEditor
        objectives={[objective]}
        questions={[]}
        readOnly={false}
        disabled={false}
        ai={{
          provider: new DeterministicAiAuthoringProvider({ latencyMs: 25 }),
          lessonContext,
          contextKey: 'question-context',
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
      target: { value: 'اختيار يدوي أول' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'اقترح سؤالًا' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
      target: { value: 'اختيار يدوي أحدث' },
    });
    await screen.findByRole('button', { name: 'استخدام الاقتراح' });
    fireEvent.click(screen.getByRole('button', { name: 'استخدام الاقتراح' }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'الاختيار 1' })).toHaveValue('اختيار يدوي أحدث');
    expect(onChange).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('حذف objective بعد اكتمال suggestion يمنع قبول السؤال وقت القبول', async () => {
    const onChange = vi.fn();
    const provider = new DeterministicAiAuthoringProvider();
    const { rerender } = render(
      <TeacherQuestionsEditor
        objectives={[objective]}
        questions={[]}
        readOnly={false}
        disabled={false}
        ai={{
          provider,
          lessonContext,
          contextKey: 'question-context',
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
    fireEvent.click(screen.getByRole('button', { name: 'اقترح سؤالًا' }));
    await screen.findByRole('button', { name: 'استخدام الاقتراح' });

    rerender(
      <TeacherQuestionsEditor
        objectives={[]}
        questions={[]}
        readOnly={false}
        disabled={false}
        ai={{
          provider,
          lessonContext,
          contextKey: 'question-context-after-objective-delete',
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'استخدام الاقتراح' }));
    expect(screen.getByRole('alert')).toHaveTextContent('لم يعد موجودًا');
    expect(onChange).not.toHaveBeenCalled();
  });
});

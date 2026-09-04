// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherLessonEditor } from '@features/teacher/workspace/TeacherLessonEditor';
import type { AuthoringService, LessonRevision, LessonRevisionPayload } from '@services/authoring';

const DRAFT_ID = '00000000-0000-4000-8000-0000000055d2';

const payload: LessonRevisionPayload = {
  lesson: {
    unitId: 'g10-phy-waves-unit',
    title: 'خصائص الموجات',
    displayOrder: 1,
    summary: 'ملخص الدرس',
    keyConcepts: ['الموجة'],
    examples: ['موجات الحبل'],
    misconceptions: [],
  },

  objectives: [
    {
      key: 'objective-a',
      text: 'يفسر خصائص الموجات',
    },
  ],

  questions: [
    {
      key: 'question-a',
      purpose: 'mastery',
      type: 'multiple_choice',
      prompt: 'ما وحدة قياس التردد؟',
      choices: ['Hz', 'm'],
      correctAnswerIndex: 0,
      explanation: 'يقاس التردد بالهرتز.',
      objectiveKey: 'objective-a',
      difficulty: 'medium',
    },
  ],

  games: [
    {
      key: 'teacher-game-1',
      type: 'matching',
      title: 'مطابقة الكميات',
      instructions: 'طابق الكمية بوحدتها.',
      items: [
        {
          left: 'التردد',
          right: 'Hz',
        },
        {
          left: 'الطول الموجي',
          right: 'm',
        },
      ],
      objectiveKeys: ['objective-a'],
    },
  ],

  experiments: [
    {
      key: 'teacher-experiment-1',
      title: 'موجة في حبل',
      objective: 'ملاحظة انتقال الموجة',
      objectiveKeys: ['objective-a'],
      tools: ['حبل'],
      steps: ['حرّك أحد طرفي الحبل'],
      safetyNotes: ['اترك مساحة كافية'],
      safetyLevel: 'teacher_supervised',
      observationPrompt: 'ماذا تلاحظ؟',
      conclusionPrompt: 'ماذا تستنتج؟',
      homeAlternative: null,
    },
  ],

  simulations: [
    {
      key: 'teacher-simulation-1',
      title: 'محاكاة خصائص الموجة',
      instructions: 'غيّر التردد والسعة ولاحظ النتيجة.',
      objectiveKeys: ['objective-a'],
      config: {
        engineKind: 'transverse_wave_v1',
        mediumSpeedMps: 12,
        frequencyHz: {
          min: 0.5,
          max: 4,
          step: 0.5,
          initial: 1,
        },
        amplitudeM: {
          min: 0.2,
          max: 1,
          step: 0.1,
          initial: 0.5,
        },
      },
    },
  ],
  inquiries: [
    {
      key: 'teacher-inquiry-1',
      title: 'استقصاء انعكاس الموجة',
      instructions: 'اقرأ الموقف وأجب.',
      objectiveKeys: ['objective-a'],
      context: 'تتحرك موجة على حبل نحو حاجز ثابت.',
      drivingQuestion: 'ماذا يحدث للموجة عند الحاجز؟',
      hypothesisPrompt: 'اكتب فرضيتك.',
      observationPrompt: 'دوّن ما تلاحظه.',
      conclusionPrompt: 'اكتب استنتاجك العلمي.',
    },
  ],
  dataActivities: [],
};

function revision(status: LessonRevision['status']): LessonRevision {
  return {
    id: DRAFT_ID,
    entityType: 'lesson',
    entityId: null,
    publishedEntityId: null,
    supersedesRevisionId: null,
    authorId: 'teacher-author',
    status,
    payload,
    baseFingerprint: null,
    revisionNumber: 1,
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
    submittedAt: status === 'draft' ? null : '2026-09-04T10:30:00.000Z',
  };
}

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

describe('Phase 5-5D2 TeacherLessonEditor activities', () => {
  it('ينقل تعديل اللعبة والتجربة إلى LessonRevisionPayload ثم يحفظهما عبر AuthoringService', async () => {
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: DRAFT_ID,
    });

    render(
      <TeacherLessonEditor
        service={service({
          saveLessonRevision,
        })}
        revision={revision('draft')}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل اللعبة 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان اللعبة',
      }),
      {
        target: {
          value: 'مطابقة الكميات المعدلة',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل اللعبة',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل التجربة 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان التجربة',
      }),
      {
        target: {
          value: 'موجة في حبل معدلة',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل التجربة',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل المحاكاة 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان المحاكاة',
      }),
      {
        target: {
          value: 'محاكاة خصائص الموجة المعدلة',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل المحاكاة',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل الاستقصاء 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان الاستقصاء',
      }),
      {
        target: {
          value: 'استقصاء انعكاس الموجة المعدل',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل الاستقصاء',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ المسودة',
      })
    );

    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));

    const savedPayload = saveLessonRevision.mock.calls[0]?.[1];

    expect(savedPayload?.games).toEqual([
      {
        ...payload.games[0],
        title: 'مطابقة الكميات المعدلة',
      },
    ]);

    expect(savedPayload?.experiments).toEqual([
      {
        ...payload.experiments[0],
        title: 'موجة في حبل معدلة',
      },
    ]);

    expect(savedPayload?.simulations).toEqual([
      {
        ...payload.simulations[0],
        title: 'محاكاة خصائص الموجة المعدلة',
      },
    ]);

    expect(savedPayload?.inquiries).toEqual([
      {
        ...payload.inquiries[0],
        title: 'استقصاء انعكاس الموجة المعدل',
      },
    ]);

    expect(savedPayload?.games[0]?.key).toBe('teacher-game-1');

    expect(savedPayload?.experiments[0]?.key).toBe('teacher-experiment-1');

    expect(savedPayload?.games[0]?.objectiveKeys).toEqual(['objective-a']);

    expect(savedPayload?.experiments[0]?.objectiveKeys).toEqual(['objective-a']);

    expect(savedPayload?.simulations[0]?.key).toBe('teacher-simulation-1');
    expect(savedPayload?.simulations[0]?.objectiveKeys).toEqual(['objective-a']);

    expect(savedPayload?.inquiries[0]?.key).toBe('teacher-inquiry-1');
    expect(savedPayload?.inquiries[0]?.objectiveKeys).toEqual(['objective-a']);

    expect(saveLessonRevision).toHaveBeenCalledWith(DRAFT_ID, expect.anything(), {
      signal: expect.any(AbortSignal),
    });
  });

  it('يعرض الألعاب والتجارب للقراءة فقط عندما تكون النسخة قيد المراجعة', () => {
    render(
      <TeacherLessonEditor
        service={service()}
        revision={revision('pending_review')}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('مطابقة الكميات')).toBeInTheDocument();

    expect(screen.getByText('موجة في حبل')).toBeInTheDocument();
    expect(screen.getByText('محاكاة خصائص الموجة')).toBeInTheDocument();
    expect(screen.getByText('استقصاء انعكاس الموجة')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'إضافة لعبة مطابقة',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'تعديل اللعبة 1',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'إضافة تجربة',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'تعديل التجربة 1',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'إضافة محاكاة',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'تعديل المحاكاة 1',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'إضافة نشاط استقصاء',
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: 'تعديل الاستقصاء 1',
      })
    ).not.toBeInTheDocument();
  });
});

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

describe('TeacherLessonEditor objective composition', () => {
  it('يضيف الهدف محليًا ثم يرسله ضمن نفس LessonRevisionPayload عند الحفظ اليدوي فقط', async () => {
    const createLessonRevision = vi
      .fn<AuthoringService['createLessonRevision']>()
      .mockResolvedValue({
        status: 'created',
        revision: {
          id: '00000000-0000-4000-8000-0000000002b1',
          entityId: null,
          revisionNumber: 1,
          baseFingerprint: null,
        },
      });
    const authoring = service({ createLessonRevision });

    render(<TeacherLessonEditor service={authoring} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
      target: { value: 'يشرح انتقال الطاقة بالموجات' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));

    expect(createLessonRevision).not.toHaveBeenCalled();
    expect(screen.getByText('يشرح انتقال الطاقة بالموجات')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));

    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(createLessonRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          objectives: [
            {
              key: 'teacher-objective-1',
              text: 'يشرح انتقال الطاقة بالموجات',
            },
          ],
        }),
      }),
      { signal: expect.any(AbortSignal) }
    );
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import type { AuthoringService, LessonRevision } from '@services/authoring';

function service(revisions: readonly LessonRevision[] = []): AuthoringService {
  return {
    listOwnRevisions: vi.fn(async () => ({ status: 'success' as const, revisions })),
    listReviewEvents: vi.fn(),
    createLessonRevision: vi.fn(),
    saveLessonRevision: vi.fn(),
    submitLessonRevision: vi.fn(),
  };
}

describe('TeacherWorkspace editor navigation', () => {
  it('يفتح محرر new محليًا دون mutation عند الضغط على إنشاء درس', async () => {
    const authoring = service();
    render(<TeacherWorkspace service={authoring} />);

    await screen.findByText('لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.');
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء درس جديد' }));

    expect(screen.getByRole('heading', { name: 'إنشاء درس جديد' })).toBeInTheDocument();
    expect(authoring.createLessonRevision).not.toHaveBeenCalled();
  });
});

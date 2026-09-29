// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LessonActionGrid } from '@features/student/lesson-view/LessonActionGrid';

function createHandlers() {
  return {
    onOpenReviewQuestions: vi.fn(),
    onOpenActivities: vi.fn(),
    onOpenMatchingGame: vi.fn(),
    onOpenVirtualLabs: vi.fn(),
    onOpenMasteryTest: vi.fn(),
    onBackToLessons: vi.fn(),
  };
}

describe('LessonActionGrid', () => {
  it('يعرض المسارات الخمسة مرتبة كبطاقات تعلم', () => {
    render(<LessonActionGrid {...createHandlers()} />);

    expect(screen.getByRole('button', { name: 'أسئلة المراجعة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الأنشطة العلمية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الألعاب التعليمية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'المختبرات الافتراضية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختبار الإتقان' })).toBeInTheDocument();
  });

  it('يفتح مركز المختبرات من بطاقته المستقلة', () => {
    const handlers = createHandlers();
    render(<LessonActionGrid {...handlers} />);

    fireEvent.click(screen.getByRole('button', { name: 'المختبرات الافتراضية' }));
    expect(handlers.onOpenVirtualLabs).toHaveBeenCalledTimes(1);
  });
});

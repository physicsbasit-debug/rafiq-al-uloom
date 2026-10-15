// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LessonActionGrid } from '@features/student/lesson-view/LessonActionGrid';
import {
  getLessonActionAccess,
  INITIAL_LESSON_UNLOCK_PROGRESS,
} from '@features/student/lesson-progress/lesson-unlock';

function handlers() {
  return {
    onOpenReviewQuestions: vi.fn(),
    onOpenActivities: vi.fn(),
    onOpenMatchingGame: vi.fn(),
    onOpenVirtualLabs: vi.fn(),
    onOpenMasteryTest: vi.fn(),
    onBackToLessons: vi.fn(),
  };
}

describe('Lesson 1-3 direct access policy', () => {
  it('يفتح المراجعة والأنشطة واللعبة والمختبر والإتقان مباشرة من حالة جديدة', () => {
    expect(getLessonActionAccess(INITIAL_LESSON_UNLOCK_PROGRESS)).toEqual({
      review: true,
      activities: true,
      game: true,
      labs: true,
      mastery: true,
    });
  });

  it('يجعل المسارات الأربعة قابلة للنقر دون اعتبار الدخول إنجازًا', () => {
    const callbacks = handlers();

    render(
      <LessonActionGrid
        {...callbacks}
        actionAccess={{
          review: true,
          activities: true,
          game: true,
          labs: true,
          mastery: true,
        }}
      />
    );

    for (const name of [
      'أسئلة المراجعة',
      'الأنشطة العلمية',
      'الألعاب التعليمية',
      'المختبرات الافتراضية',
      'اختبار الإتقان',
    ]) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }

    fireEvent.click(screen.getByRole('button', { name: 'أسئلة المراجعة' }));
    fireEvent.click(screen.getByRole('button', { name: 'الأنشطة العلمية' }));
    fireEvent.click(screen.getByRole('button', { name: 'الألعاب التعليمية' }));
    fireEvent.click(screen.getByRole('button', { name: 'المختبرات الافتراضية' }));
    fireEvent.click(screen.getByRole('button', { name: 'اختبار الإتقان' }));

    expect(callbacks.onOpenReviewQuestions).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenActivities).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenMatchingGame).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenVirtualLabs).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpenMasteryTest).toHaveBeenCalledTimes(1);
  });
});

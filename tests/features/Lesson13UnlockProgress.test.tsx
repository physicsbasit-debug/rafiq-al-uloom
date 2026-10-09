// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LessonActionGrid } from '@features/student/lesson-view/LessonActionGrid';
import {
  advanceLessonUnlockProgress,
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

describe('Lesson 1-3 unlock progression', () => {
  it('يفتح المسارات بالتسلسل ويبقي المختبر مستقلًا', () => {
    let progress = INITIAL_LESSON_UNLOCK_PROGRESS;

    expect(getLessonActionAccess(progress)).toEqual({
      review: false,
      activities: false,
      game: false,
      labs: true,
      mastery: false,
    });

    progress = advanceLessonUnlockProgress(progress, 'explanation_complete');
    expect(getLessonActionAccess(progress).review).toBe(true);

    progress = advanceLessonUnlockProgress(progress, 'review_complete');
    expect(getLessonActionAccess(progress).activities).toBe(true);

    progress = advanceLessonUnlockProgress(progress, 'activities_entered');
    expect(getLessonActionAccess(progress).game).toBe(true);

    progress = advanceLessonUnlockProgress(progress, 'game_entered');
    expect(getLessonActionAccess(progress).mastery).toBe(true);
  });

  it('يعطل المسارات المقفلة بصريًا ووظيفيًا ولا يقفل المختبر الموحد', () => {
    const callbacks = handlers();

    render(
      <LessonActionGrid
        {...callbacks}
        actionAccess={{
          review: false,
          activities: false,
          game: false,
          labs: true,
          mastery: false,
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'أسئلة المراجعة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'الأنشطة العلمية' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'الألعاب التعليمية' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'اختبار الإتقان' })).toBeDisabled();

    const labs = screen.getByRole('button', { name: 'المختبرات الافتراضية' });
    expect(labs).toBeEnabled();
    fireEvent.click(labs);
    expect(callbacks.onOpenVirtualLabs).toHaveBeenCalledTimes(1);
  });
});

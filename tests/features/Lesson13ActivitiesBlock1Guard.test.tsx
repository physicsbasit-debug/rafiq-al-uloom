// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
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

describe('Lesson 1-3 direct access guards', () => {
  it('لا تستخدم حالة الإنجاز القديمة كبوابة وصول', () => {
    expect(getLessonActionAccess(INITIAL_LESSON_UNLOCK_PROGRESS)).toEqual({
      review: true,
      activities: true,
      game: true,
      labs: false,
      mastery: true,
    });
  });

  it('يبقي المختبر غير قابل للنقر بالنص المعتمد', () => {
    const callbacks = handlers();
    render(
      <LessonActionGrid
        {...callbacks}
        actionAccess={{
          review: true,
          activities: true,
          game: true,
          labs: false,
          mastery: true,
        }}
      />
    );

    const labs = screen.getByRole('button', { name: 'المختبرات الافتراضية' });
    expect(labs).toBeDisabled();
    expect(screen.getByText('غير متوفر حاليًا.')).toBeInTheDocument();
    fireEvent.click(labs);
    expect(callbacks.onOpenVirtualLabs).not.toHaveBeenCalled();
  });

  it('لا يحتسب App مجرد دخول الأنشطة أو اللعبة كإنجاز', () => {
    const source = readFileSync('src/App.tsx', 'utf8');
    const activitiesHandler =
      source.match(/onOpenActivities=\{\(\) => \{([\s\S]*?)\n\s*\}\}/)?.[1] ?? '';
    const gameHandler =
      source.match(/onOpenMatchingGame=\{\(\) => \{([\s\S]*?)\n\s*\}\}/)?.[1] ?? '';

    expect(activitiesHandler).not.toContain("markProgress(step.lessonId, 'activities_entered')");
    expect(gameHandler).not.toContain("markProgress(step.lessonId, 'game_entered')");
  });

  it('يحمي App مسار المختبر عند labs=false', () => {
    const source = readFileSync('src/App.tsx', 'utf8');
    expect(source).toMatch(
      /onOpenVirtualLabs=\{\(\) => \{[\s\S]*?if \(activeActionAccess && !activeActionAccess\.labs\) return;[\s\S]*?name: 'labs'/
    );
  });
});

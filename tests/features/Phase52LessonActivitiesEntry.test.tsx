// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LessonView } from '@features/student/lesson-view/LessonView';
import {
  useLesson,
  useLessonExperiments,
  useLessonObjectives,
} from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useLesson: vi.fn(),
  useLessonObjectives: vi.fn(),
  useLessonExperiments: vi.fn(),
}));

const mockedUseLesson = vi.mocked(useLesson);
const mockedUseLessonObjectives = vi.mocked(useLessonObjectives);
const mockedUseLessonExperiments = vi.mocked(useLessonExperiments);

function mockLesson() {
  mockedUseLesson.mockReturnValue({
    data: {
      id: 'lesson-one',
      unitId: 'unit-one',
      title: 'خصائص الموجات',
      order: 1,
      objectiveIds: ['objective-one'],
      summary: 'ملخص',
      keyConcepts: [],
      examples: [],
      misconceptions: [],
      status: 'approved',
      source: 'curriculum_seed',
    },
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  mockedUseLessonObjectives.mockReturnValue({
    data: [{ id: 'objective-one', lessonId: 'lesson-one', text: 'هدف' }],
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  mockedUseLessonExperiments.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Phase 5-2 lesson activities entry', () => {
  it('يضيف الأنشطة العلمية مع إبقاء المسارات القديمة', () => {
    const onOpenActivities = vi.fn();
    const onOpenMatchingGame = vi.fn();
    mockLesson();

    render(
      <LessonView
        lessonId="lesson-one"
        onBackToLessons={vi.fn()}
        onOpenReviewQuestions={vi.fn()}
        onOpenActivities={onOpenActivities}
        onOpenMatchingGame={onOpenMatchingGame}
        onOpenMasteryTest={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'الأنشطة العلمية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'لعبة تعليمية' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الأنشطة العلمية' }));
    expect(onOpenActivities).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'لعبة تعليمية' }));
    expect(onOpenMatchingGame).toHaveBeenCalledTimes(1);
  });
});

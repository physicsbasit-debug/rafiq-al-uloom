// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Grade9TimeMeasurementLesson } from '@features/student/lesson-view/Grade9TimeMeasurementLesson';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Grade 9 lesson 1-3 explanation completion', () => {
  it('لا يعتبر الشرح مكتملًا حتى تمر المراحل الست على نافذة العرض', () => {
    let callback: IntersectionObserverCallback | undefined;

    class MockIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0.05];

      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }

      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    const onExplanationComplete = vi.fn();

    render(
      <Grade9TimeMeasurementLesson
        objectives={[]}
        onBackToLessons={vi.fn()}
        onOpenReviewQuestions={vi.fn()}
        onOpenActivities={vi.fn()}
        onOpenMatchingGame={vi.fn()}
        onOpenVirtualLabs={vi.fn()}
        onOpenMasteryTest={vi.fn()}
        explanationComplete={false}
        onExplanationComplete={onExplanationComplete}
        actionAccess={{
          review: false,
          activities: false,
          game: false,
          labs: true,
          mastery: false,
        }}
      />
    );

    const stages = Array.from(document.querySelectorAll<HTMLElement>('[data-time-stage]'));
    expect(stages).toHaveLength(6);
    expect(callback).toBeDefined();

    act(() => {
      callback?.(
        stages.slice(0, 5).map(
          (target) =>
            ({
              target,
              isIntersecting: true,
              intersectionRatio: 1,
            }) as IntersectionObserverEntry
        ),
        {} as IntersectionObserver
      );
    });

    expect(onExplanationComplete).not.toHaveBeenCalled();

    act(() => {
      callback?.(
        [
          {
            target: stages[5],
            isIntersecting: true,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    });

    expect(onExplanationComplete).toHaveBeenCalledTimes(1);
  });
});

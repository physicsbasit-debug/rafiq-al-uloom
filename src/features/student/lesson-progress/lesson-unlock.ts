export interface LessonUnlockProgress {
  readonly explanationComplete: boolean;
  readonly reviewComplete: boolean;
  readonly activitiesEntered: boolean;
  readonly gameEntered: boolean;
}

export type LessonUnlockEvent =
  'explanation_complete' | 'review_complete' | 'activities_entered' | 'game_entered';

export interface LessonActionAccess {
  readonly review: boolean;
  readonly activities: boolean;
  readonly game: boolean;
  readonly labs: boolean;
  readonly mastery: boolean;
}

export const INITIAL_LESSON_UNLOCK_PROGRESS: LessonUnlockProgress = {
  explanationComplete: false,
  reviewComplete: false,
  activitiesEntered: false,
  gameEntered: false,
};

export function advanceLessonUnlockProgress(
  current: LessonUnlockProgress,
  event: LessonUnlockEvent
): LessonUnlockProgress {
  if (event === 'explanation_complete') {
    return current.explanationComplete ? current : { ...current, explanationComplete: true };
  }

  if (event === 'review_complete') {
    return current.reviewComplete ? current : { ...current, reviewComplete: true };
  }

  if (event === 'activities_entered') {
    return current.activitiesEntered ? current : { ...current, activitiesEntered: true };
  }

  return current.gameEntered ? current : { ...current, gameEntered: true };
}

export function getLessonActionAccess(progress: LessonUnlockProgress): LessonActionAccess {
  // Access and completion are intentionally separate for lesson 1-3.
  // The progress object is preserved for real completion signals, not as a navigation gate.
  void progress;

  return {
    review: true,
    activities: true,
    game: true,
    labs: false,
    mastery: true,
  };
}

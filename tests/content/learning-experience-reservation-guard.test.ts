import { describe, expect, it } from 'vitest';
import {
  findLearningExperienceReservationConflicts,
  hasLearningExperienceReservationConflicts,
  type LearningExperienceReservation,
} from '@content/learning-design/learning-experience-reservation-guard';

const BASE: LearningExperienceReservation = {
  id: 'explanation-a',
  path: 'explanation',
  questionKey: 'question-a',
  visualKey: 'visual-a',
  cognitiveFunction: 'cognitive-a',
  contextKey: 'context-a',
  skill: 'shared-skill',
};

describe('Learning experience reservation guard', () => {
  it('adds contextKey as a permanent cross-path conflict key', () => {
    const conflicts = findLearningExperienceReservationConflicts([
      BASE,
      {
        id: 'activity-copy',
        path: 'activity',
        questionKey: 'question-b',
        visualKey: 'visual-b',
        cognitiveFunction: 'cognitive-b',
        contextKey: 'context-a',
        skill: 'different-skill',
      },
    ]);

    expect(conflicts).toEqual([
      expect.objectContaining({
        kind: 'context',
        key: 'context-a',
        firstPath: 'explanation',
        secondPath: 'activity',
      }),
    ]);
    expect(hasLearningExperienceReservationConflicts([BASE])).toBe(false);
  });

  it('still rejects question, visual, and cognitive recycling across paths', () => {
    const conflicts = findLearningExperienceReservationConflicts([
      BASE,
      {
        ...BASE,
        id: 'mastery-copy',
        path: 'mastery',
        contextKey: 'context-b',
      },
    ]);

    expect(new Set(conflicts.map(({ kind }) => kind))).toEqual(
      new Set(['question', 'visual', 'cognitive'])
    );
  });

  it('does not treat skill repetition as a conflict when transfer keys are new', () => {
    const transfer: LearningExperienceReservation = {
      id: 'activity-transfer',
      path: 'activity',
      questionKey: 'question-transfer',
      visualKey: 'visual-transfer',
      cognitiveFunction: 'cognitive-transfer',
      contextKey: 'context-transfer',
      skill: BASE.skill,
    };

    expect(findLearningExperienceReservationConflicts([BASE, transfer])).toEqual([]);
  });

  it('allows intentional variants inside the same path while lesson contracts may impose stricter local uniqueness', () => {
    expect(
      findLearningExperienceReservationConflicts([BASE, { ...BASE, id: 'explanation-variant' }])
    ).toEqual([]);
  });
});

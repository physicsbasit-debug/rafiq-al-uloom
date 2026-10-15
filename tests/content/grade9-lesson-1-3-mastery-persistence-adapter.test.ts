import { describe, expect, it } from 'vitest';

import { buildMasteryPersistenceAnswers } from '@features/mastery/grade9-time-measurement/mastery-engine';

describe('L13 mastery persistence score carrier', () => {
  it('يحتفظ بعقد أسئلة seed ويحوّل الصحة فقط إلى فهرس الإجابة', () => {
    const questions = [
      {
        id: 'q1',
        choices: ['أ', 'ب', 'ج', 'د'],
        correctAnswerIndex: 2,
      },
      {
        id: 'q2',
        choices: ['أ', 'ب', 'ج', 'د'],
        correctAnswerIndex: 0,
      },
    ];

    expect(buildMasteryPersistenceAnswers(questions, [true, false])).toEqual({
      q1: 2,
      q2: 1,
    });
  });

  it('يرفض score carrier غير صالح بدل تكوين حفظ مضلل', () => {
    expect(() =>
      buildMasteryPersistenceAnswers(
        [
          {
            id: 'q1',
            choices: ['وحيد'],
            correctAnswerIndex: 0,
          },
        ],
        [true]
      )
    ).toThrow(/score-carrier/i);
  });
});

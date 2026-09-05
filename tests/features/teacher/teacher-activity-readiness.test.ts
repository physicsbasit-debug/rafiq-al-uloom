import { describe, expect, it } from 'vitest';

import type { LessonRevisionPayload } from '@services/authoring';

import { buildLessonRevisionPayload } from '../../integration/helpers/authoring-fixtures';
import { getLessonSubmissionReadiness } from '../../../src/features/teacher/workspace/teacher-submission-readiness';

function completePayload(): LessonRevisionPayload {
  return buildLessonRevisionPayload('phase-5-5d1-readiness', 955_002, 'Phase 5-5D1 readiness');
}

describe('Phase 5-5D1 activity submission readiness', () => {
  it('يبقي payload سليمة جاهزة عند اكتمال روابط الأنشطة', () => {
    expect(getLessonSubmissionReadiness(completePayload())).toEqual({
      ready: true,
      reasons: [],
    });
  });

  it('يمنع الإرسال عندما لا يرتبط النشاط بأي هدف', () => {
    const payload = completePayload();
    const game = payload.games[0];

    if (!game) {
      throw new Error('Expected game fixture.');
    }

    const invalidPayload: LessonRevisionPayload = {
      ...payload,
      games: [
        {
          ...game,
          objectiveKeys: [],
        },
      ],
    };

    expect(getLessonSubmissionReadiness(invalidPayload)).toEqual({
      ready: false,
      reasons: ['missing_activity_objective_link'],
    });
  });

  it('يمنع الإرسال عندما يشير النشاط إلى هدف لم يعد موجودًا', () => {
    const payload = completePayload();
    const experiment = payload.experiments[0];

    if (!experiment) {
      throw new Error('Expected experiment fixture.');
    }

    const invalidPayload: LessonRevisionPayload = {
      ...payload,
      experiments: [
        {
          ...experiment,
          objectiveKeys: ['objective-missing'],
        },
      ],
    };

    expect(getLessonSubmissionReadiness(invalidPayload)).toEqual({
      ready: false,
      reasons: ['dangling_activity_objective'],
    });
  });

  it('يمنع الإرسال عند وجود خلل بنيوي آخر في روابط النشاط', () => {
    const payload = completePayload();
    const game = payload.games[0];

    if (!game) {
      throw new Error('Expected game fixture.');
    }

    const invalidPayload: LessonRevisionPayload = {
      ...payload,
      games: [
        {
          ...game,
          objectiveKeys: ['objective-a', 'objective-a'],
        },
      ],
    };

    expect(getLessonSubmissionReadiness(invalidPayload)).toEqual({
      ready: false,
      reasons: ['invalid_activity_structure'],
    });
  });
});

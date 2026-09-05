import { describe, expect, it } from 'vitest';

import type { LessonRevisionPayload } from '@services/authoring';

import {
  validDataActivityConfig,
  validSimulationConfig,
} from '../../contracts/activity-config-parity.samples';
import { buildLessonRevisionPayload } from '../../integration/helpers/authoring-fixtures';
import {
  getActivityStructureIssues,
  getFirstActivityStructureIssue,
  getObjectiveActivityReferences,
  isObjectiveReferencedByActivity,
} from '../../../src/features/teacher/workspace/teacher-activity-structure';

function completePayload(): LessonRevisionPayload {
  const base = buildLessonRevisionPayload('phase-5-5d1', 955_001, 'Phase 5-5D1 activity structure');

  return {
    ...base,

    simulations: [
      {
        key: 'simulation-a',
        title: 'محاكاة الموجة',
        instructions: 'غيّر القيم ولاحظ أثرها.',
        objectiveKeys: ['objective-a'],
        config: validSimulationConfig,
      },
    ],

    inquiries: [
      {
        key: 'inquiry-a',
        title: 'استقصاء الموجة',
        instructions: 'حلل الأدلة وسجل استنتاجك.',
        objectiveKeys: ['objective-a'],
        context: 'تنتقل موجة في وسط.',
        drivingQuestion: 'كيف يؤثر التردد في خصائص الموجة؟',
        hypothesisPrompt: 'اكتب فرضية قابلة للاختبار.',
        observationPrompt: 'سجل ملاحظاتك.',
        conclusionPrompt: 'اكتب استنتاجًا مدعومًا بالأدلة.',
      },
    ],

    dataActivities: [
      {
        key: 'data-a',
        title: 'تحليل بيانات الموجة',
        instructions: 'اقرأ البيانات وأجب عن المهام.',
        objectiveKeys: ['objective-a'],
        config: validDataActivityConfig,
      },
    ],
  };
}

describe('Phase 5-5D1 teacher activity structure guard', () => {
  it('accepts a complete five-family activity graph for submission', () => {
    expect(getActivityStructureIssues(completePayload(), 'submission')).toEqual([]);

    expect(getFirstActivityStructureIssue(completePayload(), 'submission')).toBeNull();
  });

  it('allows an empty objectiveKeys array only while the payload is a draft', () => {
    const payload = completePayload();
    const simulation = payload.simulations[0];

    if (!simulation) {
      throw new Error('Expected simulation fixture.');
    }

    const draftPayload: LessonRevisionPayload = {
      ...payload,
      simulations: [
        {
          ...simulation,
          objectiveKeys: [],
        },
      ],
    };

    expect(getActivityStructureIssues(draftPayload, 'draft')).toEqual([]);

    expect(getActivityStructureIssues(draftPayload, 'submission')).toContainEqual({
      kind: 'missing_objective_link',
      family: 'simulations',
      activityIndex: 0,
      activityKey: 'simulation-a',
    });
  });

  it('rejects blank objective keys even in draft mode', () => {
    const payload = completePayload();
    const inquiry = payload.inquiries[0];

    if (!inquiry) {
      throw new Error('Expected inquiry fixture.');
    }

    const invalidPayload: LessonRevisionPayload = {
      ...payload,
      inquiries: [
        {
          ...inquiry,
          objectiveKeys: [''],
        },
      ],
    };

    expect(getActivityStructureIssues(invalidPayload, 'draft')).toContainEqual({
      kind: 'empty_objective_key',
      family: 'inquiries',
      activityIndex: 0,
      activityKey: 'inquiry-a',
      objectiveIndex: 0,
      objectiveKey: '',
    });
  });

  it('detects duplicate objective keys inside one activity', () => {
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
          objectiveKeys: ['objective-a', 'objective-a'],
        },
      ],
    };

    expect(getActivityStructureIssues(invalidPayload, 'draft')).toContainEqual({
      kind: 'duplicate_objective_key',
      family: 'experiments',
      activityIndex: 0,
      activityKey: 'experiment-a',
      objectiveIndex: 1,
      objectiveKey: 'objective-a',
    });
  });

  it('detects objective links that no longer resolve inside the revision', () => {
    const payload = completePayload();
    const dataActivity = payload.dataActivities[0];

    if (!dataActivity) {
      throw new Error('Expected data activity fixture.');
    }

    const invalidPayload: LessonRevisionPayload = {
      ...payload,
      dataActivities: [
        {
          ...dataActivity,
          objectiveKeys: ['objective-missing'],
        },
      ],
    };

    expect(getActivityStructureIssues(invalidPayload, 'draft')).toContainEqual({
      kind: 'dangling_objective_key',
      family: 'dataActivities',
      activityIndex: 0,
      activityKey: 'data-a',
      objectiveIndex: 0,
      objectiveKey: 'objective-missing',
    });
  });

  it('detects duplicate activity keys only inside the same family', () => {
    const payload = completePayload();
    const game = payload.games[0];

    if (!game) {
      throw new Error('Expected game fixture.');
    }

    const duplicateGame: LessonRevisionPayload['games'][number] = {
      ...game,
      title: 'لعبة ثانية',
    };

    const invalidPayload: LessonRevisionPayload = {
      ...payload,
      games: [game, duplicateGame],
    };

    expect(getActivityStructureIssues(invalidPayload, 'draft')).toContainEqual({
      kind: 'duplicate_activity_key',
      family: 'games',
      activityIndex: 1,
      activityKey: 'game-a',
    });

    const crossFamilyPayload: LessonRevisionPayload = {
      ...payload,
      simulations: payload.simulations.map((simulation) => ({
        ...simulation,
        key: 'game-a',
      })),
    };

    expect(
      getActivityStructureIssues(crossFamilyPayload, 'draft').some(
        (issue) => issue.kind === 'duplicate_activity_key'
      )
    ).toBe(false);
  });

  it('uses the production simulation parser to reject an invalid simulation config', () => {
    const payload = completePayload();
    const simulation = payload.simulations[0];

    if (!simulation) {
      throw new Error('Expected simulation fixture.');
    }

    const invalidPayload = {
      ...payload,
      simulations: [
        {
          ...simulation,
          config: {
            ...simulation.config,
            mediumSpeedMps: 0,
          },
        },
      ],
    } as LessonRevisionPayload;

    expect(getActivityStructureIssues(invalidPayload, 'draft')).toContainEqual({
      kind: 'invalid_specialized_config',
      family: 'simulations',
      activityIndex: 0,
      activityKey: 'simulation-a',
    });
  });

  it('uses the production data parser to reject an invalid data config', () => {
    const payload = completePayload();
    const activity = payload.dataActivities[0];

    if (!activity) {
      throw new Error('Expected data activity fixture.');
    }

    const invalidPayload = {
      ...payload,
      dataActivities: [
        {
          ...activity,
          config: {
            ...activity.config,
            tasks: [],
          },
        },
      ],
    } as LessonRevisionPayload;

    expect(getActivityStructureIssues(invalidPayload, 'draft')).toContainEqual({
      kind: 'invalid_specialized_config',
      family: 'dataActivities',
      activityIndex: 0,
      activityKey: 'data-a',
    });
  });

  it('reports every activity family that references a selected objective', () => {
    const payload = completePayload();

    expect(getObjectiveActivityReferences(payload, 'objective-a')).toEqual([
      {
        family: 'games',
        activityIndex: 0,
        activityKey: 'game-a',
      },
      {
        family: 'experiments',
        activityIndex: 0,
        activityKey: 'experiment-a',
      },
      {
        family: 'simulations',
        activityIndex: 0,
        activityKey: 'simulation-a',
      },
      {
        family: 'inquiries',
        activityIndex: 0,
        activityKey: 'inquiry-a',
      },
      {
        family: 'dataActivities',
        activityIndex: 0,
        activityKey: 'data-a',
      },
    ]);

    expect(isObjectiveReferencedByActivity(payload, 'objective-a')).toBe(true);

    expect(isObjectiveReferencedByActivity(payload, 'objective-not-used')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { buildLessonRevisionPayload, nextDisplayOrder } from './helpers/authoring-fixtures';
import { psqlAdmin } from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function jsonbLiteral(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function validationResult(payload: unknown, requireComplete: boolean): string {
  return psqlAdmin(`
    SELECT COALESCE(
      public.lesson_revision_payload_error(
        ${jsonbLiteral(payload)},
        ${requireComplete ? 'true' : 'false'}
      ),
      ''
    );
  `);
}

function currentPayload() {
  const legacy = buildLessonRevisionPayload('phase-5-5c1', nextDisplayOrder(90));

  return {
    ...legacy,
    experiments: legacy.experiments.map((experiment) => ({
      ...experiment,
      objectiveKeys: ['objective-a'],
    })),
    simulations: [
      {
        key: 'simulation-a',
        title: 'Wave simulation',
        instructions: 'Adjust the controls and observe the wave.',
        objectiveKeys: ['objective-a'],
        config: {
          engineKind: 'transverse_wave_v1',
          mediumSpeedMps: 12,
          frequencyHz: {
            min: 0.5,
            max: 4,
            step: 0.5,
            initial: 1,
          },
          amplitudeM: {
            min: 0.2,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        },
      },
    ],
    inquiries: [
      {
        key: 'inquiry-a',
        title: 'Wave inquiry',
        instructions: 'Investigate the effect of frequency.',
        objectiveKeys: ['objective-a'],
        context: 'A learner observes waves produced at different frequencies.',
        drivingQuestion: 'How does frequency affect the observed wave?',
        hypothesisPrompt: 'Write a testable hypothesis.',
        observationPrompt: 'Record the pattern you observe.',
        conclusionPrompt: 'State a conclusion supported by the observations.',
      },
    ],
    dataActivities: [
      {
        key: 'data-a',
        title: 'Motion data',
        instructions: 'Read the data and answer the tasks.',
        objectiveKeys: ['objective-b'],
        config: {
          engineKind: 'data_graph_v1',
          context: 'A body moves along a straight path.',
          presentation: {
            mode: 'table_and_line_graph',
            xAxisLabel: 'Time',
            yAxisLabel: 'Distance',
          },
          dataset: {
            x: {
              label: 'Time',
              unit: 's',
              values: [0, 1, 2],
            },
            series: [
              {
                id: 'distance',
                label: 'Distance',
                unit: 'm',
                values: [0, 2, 4],
              },
            ],
          },
          tasks: [
            {
              id: 'read-1',
              prompt: 'Read the distance at 1 s.',
              unit: 'm',
              rule: {
                kind: 'read_value',
                seriesId: 'distance',
                pointIndex: 1,
              },
            },
            {
              id: 'difference-1',
              prompt: 'Find the change in distance.',
              unit: 'm',
              tolerance: 0.01,
              rule: {
                kind: 'difference',
                seriesId: 'distance',
                leftIndex: 0,
                rightIndex: 2,
                absolute: true,
              },
            },
            {
              id: 'mean-1',
              prompt: 'Find the mean distance.',
              unit: 'm',
              rule: {
                kind: 'mean',
                seriesId: 'distance',
                pointIndices: [0, 1, 2],
              },
            },
          ],
        },
      },
    ],
  };
}

describeIntegration('Phase 5-5C activity authoring payload validation', () => {
  it('accepts the complete current activity graph', () => {
    const payload = currentPayload();

    expect(validationResult(payload, false)).toBe('');
    expect(validationResult(payload, true)).toBe('');
  });

  it('rejects a newly written payload missing a current activity family', () => {
    const payload = currentPayload() as Record<string, unknown>;

    delete payload.simulations;

    expect(validationResult(payload, false)).toBe('invalid_payload');
  });

  it('allows empty objectiveKeys in draft but rejects them for submission', () => {
    const payload = currentPayload();
    const draft = {
      ...payload,
      simulations: payload.simulations.map((simulation) => ({
        ...simulation,
        objectiveKeys: [],
      })),
    };

    expect(validationResult(draft, false)).toBe('');
    expect(validationResult(draft, true)).toBe('invalid_payload');
  });

  it('rejects duplicate activity objectiveKeys even in draft', () => {
    const payload = currentPayload();
    const invalid = {
      ...payload,
      inquiries: payload.inquiries.map((inquiry) => ({
        ...inquiry,
        objectiveKeys: ['objective-a', 'objective-a'],
      })),
    };

    expect(validationResult(invalid, false)).toBe('invalid_payload');
  });

  it('rejects unresolved activity objectiveKeys even in draft', () => {
    const payload = currentPayload();
    const invalid = {
      ...payload,
      experiments: payload.experiments.map((experiment) => ({
        ...experiment,
        objectiveKeys: ['missing-objective'],
      })),
    };

    expect(validationResult(invalid, false)).toBe('invalid_payload');
  });

  it('rejects unsupported simulation config keys', () => {
    const payload = currentPayload();
    const invalid = {
      ...payload,
      simulations: payload.simulations.map((simulation) => ({
        ...simulation,
        config: {
          ...simulation.config,
          unexpected: true,
        },
      })),
    };

    expect(validationResult(invalid, false)).toBe('invalid_payload');
  });

  it('rejects unsupported nested data config keys', () => {
    const payload = currentPayload();
    const activity = payload.dataActivities[0];
    if (!activity) throw new Error('Expected data activity fixture.');

    const invalid = {
      ...payload,
      dataActivities: [
        {
          ...activity,
          config: {
            ...activity.config,
            presentation: {
              ...activity.config.presentation,
              unexpected: true,
            },
          },
        },
      ],
    };

    expect(validationResult(invalid, false)).toBe('invalid_payload');
  });

  it('rejects data task references to an unknown series', () => {
    const payload = currentPayload();
    const activity = payload.dataActivities[0];
    if (!activity) throw new Error('Expected data activity fixture.');

    const firstTask = activity.config.tasks[0];
    if (!firstTask) throw new Error('Expected data task fixture.');

    const invalid = {
      ...payload,
      dataActivities: [
        {
          ...activity,
          config: {
            ...activity.config,
            tasks: [
              {
                ...firstTask,
                rule: {
                  ...firstTask.rule,
                  seriesId: 'missing-series',
                },
              },
            ],
          },
        },
      ],
    };

    expect(validationResult(invalid, false)).toBe('invalid_payload');
  });
});

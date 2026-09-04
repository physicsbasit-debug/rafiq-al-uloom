import { describe, expect, it } from 'vitest';
import { assertSimulation, parseSimulationConfig } from '@shared-types/simulation.types';

const config = {
  engineKind: 'transverse_wave_v1' as const,
  mediumSpeedMps: 12,
  frequencyHz: { min: 0.5, max: 4, step: 0.5, initial: 1 },
  amplitudeM: { min: 0.2, max: 1, step: 0.1, initial: 0.5 },
};

describe('simulation domain', () => {
  it('accepts the approved wave configuration', () => {
    expect(parseSimulationConfig(config)).toEqual(config);
  });

  it.each([
    [{ ...config, mediumSpeedMps: 0 }, 'mediumSpeedMps'],
    [{ ...config, frequencyHz: { ...config.frequencyHz, min: 0 } }, 'frequencyHz.min'],
    [{ ...config, amplitudeM: { ...config.amplitudeM, min: -0.1 } }, 'amplitudeM.min'],
  ])('rejects invalid numeric contracts', (value, expected) => {
    expect(() => parseSimulationConfig(value)).toThrow(expected);
  });

  it('rejects unsupported top-level config keys', () => {
    expect(() => parseSimulationConfig({ ...config, unexpected: true })).toThrow('unsupported key');
  });

  it('rejects unsupported range config keys', () => {
    expect(() =>
      parseSimulationConfig({
        ...config,
        frequencyHz: { ...config.frequencyHz, unexpected: true },
      })
    ).toThrow('unsupported key');
  });

  it('rejects duplicate structural objective ids', () => {
    expect(() =>
      assertSimulation({
        id: 'sim-1',
        lessonId: 'lesson-1',
        title: 'Simulation',
        instructions: 'Interact',
        objectiveIds: ['o1', 'o1'],
        config,
        status: 'draft',
        source: 'curriculum_seed',
      })
    ).toThrow('duplicates');
  });
});

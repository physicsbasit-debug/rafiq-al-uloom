import { describe, expect, it } from 'vitest';
import { evaluateTransverseWave } from '@features/simulations/engine/transverse-wave.engine';

const config = {
  engineKind: 'transverse_wave_v1' as const,
  mediumSpeedMps: 12,
  frequencyHz: { min: 0.5, max: 4, step: 0.5, initial: 1 },
  amplitudeM: { min: 0.2, max: 1, step: 0.1, initial: 0.5 },
};

describe('transverse wave engine', () => {
  it('enforces λ = v/f and T = 1/f', () => {
    const snapshot = evaluateTransverseWave(config, {
      frequencyHz: 2,
      amplitudeM: 0.5,
      phaseRad: 0,
    });
    expect(snapshot.wavelengthM).toBeCloseTo(6, 12);
    expect(snapshot.periodS).toBeCloseTo(0.5, 12);
  });

  it('halves wavelength when frequency doubles at fixed speed', () => {
    const first = evaluateTransverseWave(config, { frequencyHz: 1, amplitudeM: 0.5, phaseRad: 0 });
    const second = evaluateTransverseWave(config, { frequencyHz: 2, amplitudeM: 0.5, phaseRad: 0 });
    expect(second.wavelengthM).toBeCloseTo(first.wavelengthM / 2, 12);
  });

  it('does not change wavelength or period when amplitude changes', () => {
    const first = evaluateTransverseWave(config, { frequencyHz: 2, amplitudeM: 0.2, phaseRad: 0 });
    const second = evaluateTransverseWave(config, { frequencyHz: 2, amplitudeM: 1, phaseRad: 0 });
    expect(second.wavelengthM).toBeCloseTo(first.wavelengthM, 12);
    expect(second.periodS).toBeCloseTo(first.periodS, 12);
  });

  it('keeps every sample within ±A', () => {
    const snapshot = evaluateTransverseWave(config, {
      frequencyHz: 1.5,
      amplitudeM: 0.7,
      phaseRad: 0.37,
    });
    expect(snapshot.samples.every(({ yM }) => Math.abs(yM) <= 0.7 + 1e-12)).toBe(true);
  });

  it('phase changes geometry but not physical derived values', () => {
    const first = evaluateTransverseWave(config, { frequencyHz: 2, amplitudeM: 0.5, phaseRad: 0 });
    const second = evaluateTransverseWave(config, { frequencyHz: 2, amplitudeM: 0.5, phaseRad: 1 });
    expect(second.wavelengthM).toBeCloseTo(first.wavelengthM, 12);
    expect(second.periodS).toBeCloseTo(first.periodS, 12);
    expect(second.samples[0]?.yM).not.toBeCloseTo(first.samples[0]?.yM ?? 0, 12);
  });

  it('rejects non-finite and out-of-range state', () => {
    expect(() =>
      evaluateTransverseWave(config, { frequencyHz: Number.NaN, amplitudeM: 0.5, phaseRad: 0 })
    ).toThrow('finite');
    expect(() =>
      evaluateTransverseWave(config, { frequencyHz: 8, amplitudeM: 0.5, phaseRad: 0 })
    ).toThrow('within');
  });

  it('is deterministic for the same input', () => {
    const state = { frequencyHz: 2.5, amplitudeM: 0.6, phaseRad: 0.4 };
    expect(evaluateTransverseWave(config, state)).toEqual(evaluateTransverseWave(config, state));
  });
});

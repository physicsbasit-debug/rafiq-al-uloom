import type { TransverseWaveSimulationConfig } from '@shared-types/simulation.types';
import { parseSimulationConfig } from '@shared-types/simulation.types';

export interface TransverseWaveState {
  frequencyHz: number;
  amplitudeM: number;
  phaseRad: number;
}

export interface WavePoint {
  xM: number;
  yM: number;
}

export interface TransverseWaveSnapshot {
  speedMps: number;
  frequencyHz: number;
  amplitudeM: number;
  wavelengthM: number;
  periodS: number;
  angularFrequencyRadPerS: number;
  waveNumberRadPerM: number;
  samples: readonly WavePoint[];
}

const SAMPLE_COUNT = 121;
const VISIBLE_WAVELENGTHS = 2.5;

function requireFiniteInRange(value: number, min: number, max: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite.`);
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be within [${min}, ${max}].`);
  }
  return value;
}

export function evaluateTransverseWave(
  rawConfig: TransverseWaveSimulationConfig,
  state: TransverseWaveState
): TransverseWaveSnapshot {
  const config = parseSimulationConfig(rawConfig);
  const frequencyHz = requireFiniteInRange(
    state.frequencyHz,
    config.frequencyHz.min,
    config.frequencyHz.max,
    'frequencyHz'
  );
  const amplitudeM = requireFiniteInRange(
    state.amplitudeM,
    config.amplitudeM.min,
    config.amplitudeM.max,
    'amplitudeM'
  );

  if (!Number.isFinite(state.phaseRad)) {
    throw new Error('phaseRad must be finite.');
  }

  const speedMps = config.mediumSpeedMps;
  const wavelengthM = speedMps / frequencyHz;
  const periodS = 1 / frequencyHz;
  const angularFrequencyRadPerS = 2 * Math.PI * frequencyHz;
  const waveNumberRadPerM = (2 * Math.PI) / wavelengthM;
  const visibleLengthM = wavelengthM * VISIBLE_WAVELENGTHS;

  const samples = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const xM = (visibleLengthM * index) / (SAMPLE_COUNT - 1);
    const yM = amplitudeM * Math.sin(waveNumberRadPerM * xM - state.phaseRad);
    return { xM, yM };
  });

  return {
    speedMps,
    frequencyHz,
    amplitudeM,
    wavelengthM,
    periodS,
    angularFrequencyRadPerS,
    waveNumberRadPerM,
    samples,
  };
}

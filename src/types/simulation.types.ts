import type { ContentSource, ContentStatus } from './content.types';

export type SimulationEngineKind = 'transverse_wave_v1';

export interface NumericRangeConfig {
  min: number;
  max: number;
  step: number;
  initial: number;
}

export interface TransverseWaveSimulationConfig {
  engineKind: 'transverse_wave_v1';
  mediumSpeedMps: number;
  frequencyHz: NumericRangeConfig;
  amplitudeM: NumericRangeConfig;
}

export type SimulationConfig = TransverseWaveSimulationConfig;

export interface Simulation {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  objectiveIds: string[];
  config: SimulationConfig;
  status: ContentStatus;
  source: ContentSource;
}

function invalid(detail: string): never {
  throw new Error(`Invalid simulation config: ${detail}`);
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(`${field} must be a finite number`);
  }
  return value;
}

function parseRange(
  value: unknown,
  field: string,
  options?: { minInclusive?: number }
): NumericRangeConfig {
  const record = asRecord(value, field);
  const min = finiteNumber(record.min, `${field}.min`);
  const max = finiteNumber(record.max, `${field}.max`);
  const step = finiteNumber(record.step, `${field}.step`);
  const initial = finiteNumber(record.initial, `${field}.initial`);

  if (options?.minInclusive !== undefined && min < options.minInclusive) {
    invalid(`${field}.min must be >= ${options.minInclusive}`);
  }
  if (min >= max) {
    invalid(`${field}.min must be less than ${field}.max`);
  }
  if (step <= 0) {
    invalid(`${field}.step must be greater than zero`);
  }
  if (initial < min || initial > max) {
    invalid(`${field}.initial must be within the configured range`);
  }

  return { min, max, step, initial };
}

export function parseSimulationConfig(value: unknown): SimulationConfig {
  const record = asRecord(value, 'config');
  if (record.engineKind !== 'transverse_wave_v1') {
    invalid(`unsupported engineKind ${JSON.stringify(record.engineKind)}`);
  }

  const mediumSpeedMps = finiteNumber(record.mediumSpeedMps, 'mediumSpeedMps');
  if (mediumSpeedMps <= 0) {
    invalid('mediumSpeedMps must be greater than zero');
  }

  const frequencyHz = parseRange(record.frequencyHz, 'frequencyHz');
  if (frequencyHz.min <= 0) {
    invalid('frequencyHz.min must be greater than zero');
  }

  const amplitudeM = parseRange(record.amplitudeM, 'amplitudeM', { minInclusive: 0 });

  return {
    engineKind: 'transverse_wave_v1',
    mediumSpeedMps,
    frequencyHz,
    amplitudeM,
  };
}

export function assertSimulation(simulation: Simulation): Simulation {
  if (!simulation.id.trim()) {
    throw new Error('Invalid simulation: id must not be blank.');
  }
  if (!simulation.lessonId.trim()) {
    throw new Error(`Invalid simulation "${simulation.id}": lessonId must not be blank.`);
  }
  if (!simulation.title.trim()) {
    throw new Error(`Invalid simulation "${simulation.id}": title must not be blank.`);
  }
  if (!simulation.instructions.trim()) {
    throw new Error(`Invalid simulation "${simulation.id}": instructions must not be blank.`);
  }
  if (simulation.objectiveIds.length === 0) {
    throw new Error(`Invalid simulation "${simulation.id}": objectiveIds must not be empty.`);
  }

  const normalized = simulation.objectiveIds.map((id) => id.trim());
  if (normalized.some((id) => id.length === 0)) {
    throw new Error(`Invalid simulation "${simulation.id}": objectiveIds must not contain blanks.`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(
      `Invalid simulation "${simulation.id}": objectiveIds must not contain duplicates.`
    );
  }

  parseSimulationConfig(simulation.config);
  return simulation;
}

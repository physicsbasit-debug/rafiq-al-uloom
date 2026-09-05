import { describe, expect, it } from 'vitest';

import { parseDataActivityConfig } from '@shared-types/data-activity.types';
import { parseSimulationConfig } from '@shared-types/simulation.types';

import {
  dataConfigParityCases,
  simulationConfigParityCases,
} from './activity-config-parity.samples';

describe('Phase 5-5 activity config parity samples', () => {
  it.each(simulationConfigParityCases)('simulation: $name', ({ value, valid }) => {
    if (valid) {
      expect(() => parseSimulationConfig(value)).not.toThrow();
      return;
    }

    expect(() => parseSimulationConfig(value)).toThrow();
  });

  it.each(dataConfigParityCases)('data: $name', ({ value, valid }) => {
    if (valid) {
      expect(() => parseDataActivityConfig(value)).not.toThrow();
      return;
    }

    expect(() => parseDataActivityConfig(value)).toThrow();
  });
});

import { describe, expect, it } from 'vitest';

import {
  dataConfigParityCases,
  simulationConfigParityCases,
} from '../contracts/activity-config-parity.samples';
import { psqlAdmin } from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function jsonbLiteral(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function simulationSqlValid(value: unknown): boolean {
  return (
    psqlAdmin(`
      SELECT public.lesson_revision_simulation_config_is_valid(
        ${jsonbLiteral(value)}
      );
    `) === 't'
  );
}

function dataSqlValid(value: unknown): boolean {
  return (
    psqlAdmin(`
      SELECT public.lesson_revision_data_config_is_valid(
        ${jsonbLiteral(value)}
      );
    `) === 't'
  );
}

describeIntegration('Phase 5-5 activity config SQL parity', () => {
  it.each(simulationConfigParityCases)('simulation SQL: $name', ({ value, valid }) => {
    expect(simulationSqlValid(value)).toBe(valid);
  });

  it.each(dataConfigParityCases)('data SQL: $name', ({ value, valid }) => {
    expect(dataSqlValid(value)).toBe(valid);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Phase 5-3 simulation boundaries', () => {
  it('keeps App and LessonView free of simulation-specific routing', () => {
    expect(source('src/App.tsx')).not.toMatch(
      /WaveSimulationRunner|transverse_wave_v1|SimulationActivity/
    );
    expect(source('src/features/student/lesson-view/LessonView.tsx')).not.toMatch(
      /WaveSimulationRunner|transverse_wave_v1|SimulationActivity/
    );
  });

  it('keeps the engine free of UI, network, Supabase, and dynamic execution', () => {
    const engine = source('src/features/simulations/engine/transverse-wave.engine.ts');
    expect(engine).not.toMatch(
      /react|window|document|fetch\(|supabase|eval\(|new Function|Date\.now|Math\.random/
    );
  });

  it('does not introduce a generic activities table or durable attempts', () => {
    const migration = source('supabase/migrations/20260901080000_add_simulations.sql');
    expect(migration).not.toMatch(/CREATE TABLE public\.activities\b/i);
    expect(migration).not.toMatch(/activity_attempts|simulation_results|mastery_results/i);
  });
});

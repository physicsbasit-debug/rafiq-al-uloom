import { describe, expect, it } from 'vitest';

import {
  currentSeedData,
  validateSeedGraph,
  type SeedData,
} from '../../scripts/generate-supabase-seed';

function cloneSeed(): SeedData {
  return {
    ...currentSeedData,
    experiments: currentSeedData.experiments.map((experiment) => ({
      ...experiment,
      objectiveIds: [...experiment.objectiveIds],
    })),
  };
}

describe('Phase 5-1 experiment seed linkage validation', () => {
  it('يقبل seed الحالي', () => {
    expect(() => validateSeedGraph(cloneSeed())).not.toThrow();
  });

  it('يرفض تجربة بلا objectiveIds', () => {
    const seed = cloneSeed();
    seed.experiments[0] = { ...seed.experiments[0]!, objectiveIds: [] };

    expect(() => validateSeedGraph(seed)).toThrow('has no objectiveIds');
  });

  it('يرفض objectiveId غير موجود', () => {
    const seed = cloneSeed();
    seed.experiments[0] = {
      ...seed.experiments[0]!,
      objectiveIds: ['missing-objective'],
    };

    expect(() => validateSeedGraph(seed)).toThrow('missing objectiveId missing-objective');
  });

  it('يرفض objectiveId من درس آخر', () => {
    const seed = cloneSeed();
    seed.experiments[0] = { ...seed.experiments[0]!, objectiveIds: ['l2-o1'] };

    expect(() => validateSeedGraph(seed)).toThrow('from another lesson');
  });

  it('يرفض objectiveId مكررًا داخل التجربة', () => {
    const seed = cloneSeed();
    seed.experiments[0] = {
      ...seed.experiments[0]!,
      objectiveIds: ['l1-o2', 'l1-o2'],
    };

    expect(() => validateSeedGraph(seed)).toThrow('duplicate objectiveId l1-o2');
  });
});

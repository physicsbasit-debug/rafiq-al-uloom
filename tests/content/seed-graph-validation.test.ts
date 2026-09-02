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
    simulations: currentSeedData.simulations.map((simulation) => ({
      ...simulation,
      objectiveIds: [...simulation.objectiveIds],
    })),
    inquiries: currentSeedData.inquiries.map((inquiry) => ({
      ...inquiry,
      objectiveIds: [...inquiry.objectiveIds],
    })),
  };
}

describe('structural activity seed linkage validation', () => {
  it('يقبل seed الحالي', () => {
    expect(() => validateSeedGraph(cloneSeed())).not.toThrow();
  });

  it('يرفض تجربة بلا objectiveIds', () => {
    const seed = cloneSeed();
    seed.experiments[0] = { ...seed.experiments[0]!, objectiveIds: [] };
    expect(() => validateSeedGraph(seed)).toThrow('has no objectiveIds');
  });

  it('يرفض objectiveId غير موجود في تجربة', () => {
    const seed = cloneSeed();
    seed.experiments[0] = {
      ...seed.experiments[0]!,
      objectiveIds: ['missing-objective'],
    };
    expect(() => validateSeedGraph(seed)).toThrow('missing objectiveId missing-objective');
  });

  it('يرفض objectiveId من درس آخر في تجربة', () => {
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

  it('يرفض Inquiry بلا objectiveIds', () => {
    const seed = cloneSeed();
    seed.inquiries[0] = { ...seed.inquiries[0]!, objectiveIds: [] };
    expect(() => validateSeedGraph(seed)).toThrow('inquiry');
  });

  it('يرفض Inquiry برابط مكرر', () => {
    const seed = cloneSeed();
    seed.inquiries[0] = {
      ...seed.inquiries[0]!,
      objectiveIds: ['l3-o1', 'l3-o1'],
    };
    expect(() => validateSeedGraph(seed)).toThrow('duplicate objectiveId l3-o1');
  });

  it('يرفض Inquiry بهدف من درس آخر', () => {
    const seed = cloneSeed();
    seed.inquiries[0] = { ...seed.inquiries[0]!, objectiveIds: ['l2-o1'] };
    expect(() => validateSeedGraph(seed)).toThrow('from another lesson');
  });

  it('يرفض Inquiry بهدف غير موجود', () => {
    const seed = cloneSeed();
    seed.inquiries[0] = { ...seed.inquiries[0]!, objectiveIds: ['missing-objective'] };
    expect(() => validateSeedGraph(seed)).toThrow('missing objectiveId missing-objective');
  });
});

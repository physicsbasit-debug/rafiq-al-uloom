import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildSeedSql,
  currentSeedData,
} from '../../scripts/generate-supabase-seed';

describe('Phase 5-4B generated Supabase seed parity', () => {
  it('يبقى supabase/seed.sql مطابقًا حرفيًا للمولد بعد إضافة Data Activity', () => {
    const persistedSeed = readFileSync('supabase/seed.sql', 'utf8');
    expect(persistedSeed).toBe(buildSeedSql(currentSeedData));
  });

  it('يتضمن SQL المتولد النشاط المتخصص ورابط الهدف ولا ينشئ جدول activities عامًا', () => {
    const sql = buildSeedSql(currentSeedData);

    expect(sql).toContain('INSERT INTO public.data_activities');
    expect(sql).toContain('INSERT INTO public.data_activity_objectives');
    expect(sql).toContain(
      "('g10-phy-waves-l2-data-frequency-wavelength', 'l2-o2', 'g10-phy-waves-l2', 0)"
    );
    expect(sql).not.toContain('INSERT INTO public.activities');
  });
});

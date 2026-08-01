import { describe, expect, it } from 'vitest';

import {
  buildSeedSql,
  currentSeedData,
  sqlJson,
  sqlNullableText,
  sqlText,
  sqlTextArray,
  validateSeedGraph,
  type SeedData,
} from '../../scripts/generate-supabase-seed';

function cloneSeedData(): SeedData {
  return structuredClone(currentSeedData);
}

describe('generate-supabase-seed', () => {
  it('يتحقق من بيانات seed الحالية بنجاح', () => {
    expect(() => validateSeedGraph(currentSeedData)).not.toThrow();
  });

  it('يفشل بوضوح عند وجود مرجع lessonId مفقود', () => {
    const seedData = cloneSeedData();
    seedData.objectives[0] = {
      ...seedData.objectives[0],
      lessonId: 'missing-lesson',
    };

    expect(() => validateSeedGraph(seedData)).toThrow(
      'Invalid seed reference: objective l1-o1 has missing lessonId missing-lesson'
    );
  });

  it('يهرب النصوص والمصفوفات وJSON وNULL بصيغة PostgreSQL صحيحة', () => {
    expect(sqlText("قانون نيوتن's law")).toBe("'قانون نيوتن''s law'");
    expect(sqlNullableText(null)).toBe('NULL');
    expect(sqlTextArray(['أ', "ب'ج"])).toBe("ARRAY['أ', 'ب''ج']::text[]");
    expect(sqlJson({ text: "قيمة'" })).toBe('\'{"text":"قيمة\'\'"}\'::jsonb');
  });

  it('ينتج SQL حتمية متطابقة حرفيًا', () => {
    expect(buildSeedSql(currentSeedData)).toBe(buildSeedSql(currentSeedData));
  });

  it('يشتق purpose من المصفوفتين المصدر دون تخمين', () => {
    const sql = buildSeedSql(currentSeedData);
    expect(sql).toContain("'l1-rq1', 'g10-phy-waves-l1', 'review'");
    expect(sql).toContain("'l1-mq1', 'g10-phy-waves-l1', 'mastery'");
  });

  it('يحافظ على ترتيب objectiveIds داخل game_objectives بمواضع صفرية', () => {
    const firstGame = currentSeedData.games[0];
    const sql = buildSeedSql(currentSeedData);

    firstGame.objectiveIds.forEach((objectiveId, position) => {
      expect(sql).toContain(`('${firstGame.id}', '${objectiveId}', ${position})`);
    });
  });

  it('لا يغير حالات المحتوى draft أثناء التوليد', () => {
    expect(currentSeedData.lessons.every(({ status }) => status === 'draft')).toBe(true);
    expect(currentSeedData.questions.every(({ status }) => status === 'draft')).toBe(true);
    expect(currentSeedData.games.every(({ status }) => status === 'draft')).toBe(true);
    expect(currentSeedData.experiments.every(({ status }) => status === 'draft')).toBe(true);
  });
});

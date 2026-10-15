import { describe, expect, it } from 'vitest';
import {
  TIME_RACE_ATTEMPT_SIZE,
  TIME_RACE_PAIRS,
  TIME_RACE_PHYSICS_REVIEWED,
  selectTimeRaceAttempt,
} from '@features/games/time-race/time-race-bank';

const NO_BORROW_IDS = new Set(['B02', 'B06', 'B09', 'B12']);
const NINE_TEN_IDS = new Set(['B04', 'B07', 'B10']);

describe('L13 time-race bank — two-race contract', () => {
  it('يحافظ على بنك الأزمنة المكوّن من 12 زوجًا', () => {
    expect(TIME_RACE_PAIRS).toHaveLength(12);
  });

  it('المحاولة الواحدة تتكوّن من سباقين فقط', () => {
    expect(TIME_RACE_ATTEMPT_SIZE).toBe(2);

    for (let seed = 1; seed <= 50; seed += 1) {
      expect(selectTimeRaceAttempt({ seed })).toHaveLength(2);
    }
  });

  it('لا يكرر الزوج داخل المحاولة', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const attempt = selectTimeRaceAttempt({ seed });
      expect(new Set(attempt.map((pair) => pair.id)).size).toBe(2);
    }
  });

  it('تفوز كل سيارة مرة واحدة في المحاولة', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const attempt = selectTimeRaceAttempt({ seed });

      expect(new Set(attempt.map((pair) => pair.winner))).toEqual(
        new Set(['nissan', 'lamborghini'])
      );
    }
  });

  it('تتضمن كل محاولة حالة طرح بلا استلاف', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const attempt = selectTimeRaceAttempt({ seed });

      expect(attempt.some((pair) => NO_BORROW_IDS.has(pair.id))).toBe(true);
    }
  });

  it('تتضمن كل محاولة حالة 9.xx مقابل 10.xx', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const attempt = selectTimeRaceAttempt({ seed });

      expect(attempt.some((pair) => NINE_TEN_IDS.has(pair.id))).toBe(true);
    }
  });

  it('الاختيار حتمي للبذرة نفسها', () => {
    expect(selectTimeRaceAttempt({ seed: 17 }).map((pair) => pair.id)).toEqual(
      selectTimeRaceAttempt({ seed: 17 }).map((pair) => pair.id)
    );
  });

  it('الإعادة تستخدم أرقامًا مختلفة عندما توجد بدائل', () => {
    const first = selectTimeRaceAttempt({ seed: 21 });
    const second = selectTimeRaceAttempt({
      seed: 22,
      previousPairIds: first.map((pair) => pair.id),
    });

    expect(second.every((pair) => !first.some((previous) => previous.id === pair.id))).toBe(true);
  });

  it('لا يبدأ مباشرة بالزوج الأخير', () => {
    const first = selectTimeRaceAttempt({ seed: 9 });

    const next = selectTimeRaceAttempt({
      seed: 9,
      lastPairId: first[0].id,
    });

    expect(next[0].id).not.toBe(first[0].id);
  });

  it('جميع الفروق صحيحة بالسنتي ثانية', () => {
    for (const pair of TIME_RACE_PAIRS) {
      expect(pair.differenceCs).toBe(Math.abs(pair.nissanCs - pair.lamborghiniCs));
    }
  });

  it('البنك الأصلي متوازن بين السيارتين', () => {
    expect(TIME_RACE_PAIRS.filter((pair) => pair.winner === 'nissan')).toHaveLength(6);

    expect(TIME_RACE_PAIRS.filter((pair) => pair.winner === 'lamborghini')).toHaveLength(6);
  });

  it('حالة المراجعة الفيزيائية تبقى صريحة', () => {
    expect(TIME_RACE_PHYSICS_REVIEWED).toBe(false);
  });
});

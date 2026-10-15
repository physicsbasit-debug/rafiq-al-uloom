import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const GAME = resolve(ROOT, 'src/features/games/time-race/TimeRaceGame.tsx');
const ENGINE = resolve(ROOT, 'src/features/games/time-race/time-race-engine.ts');
const INPUT = resolve(ROOT, 'src/features/games/time-race/time-race-input.ts');

describe('L13 race source guard', () => {
  it('لا يوجد fallback عام أو route إلى لعبة نافذة الزمن', () => {
    expect(existsSync(GAME)).toBe(true);
    const game = readFileSync(GAME, 'utf8');

    expect(game).not.toMatch(/genericVisual|generic-visual|TimeWindow|time-window/i);
  });

  it('المصحح لا يستخدم float parsing', () => {
    expect(existsSync(INPUT)).toBe(true);
    const input = readFileSync(INPUT, 'utf8');

    expect(input).not.toContain('parseFloat(');
    expect(input).not.toContain('Number(');
  });

  it('المحرك يثبت timeScale الإنتاجي = 1 ولا يقرأ query params', () => {
    expect(existsSync(ENGINE)).toBe(true);
    const engine = readFileSync(ENGINE, 'utf8');
    const game = readFileSync(GAME, 'utf8');

    expect(engine).toMatch(/PRODUCTION_TIME_SCALE\s*=\s*1/);
    expect(game).not.toMatch(/URLSearchParams|location\.search|timeScale\s*=/);
  });

  it('لا يرسم شعارات Nissan أو Lamborghini ولا يستورد أصولًا تجارية', () => {
    expect(existsSync(GAME)).toBe(true);
    const game = readFileSync(GAME, 'utf8');

    expect(game).not.toMatch(
      /nissan-logo|lamborghini-logo|aventador\.(png|jpg|svg)|gtr\.(png|jpg|svg)/i
    );
  });
});

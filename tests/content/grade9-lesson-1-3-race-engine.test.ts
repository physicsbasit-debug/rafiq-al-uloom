import { describe, expect, it, vi } from 'vitest';
import { TIME_RACE_PAIRS } from '@features/games/time-race/time-race-bank';
import {
  FRAME_GAP_CAP_MS,
  PRODUCTION_TIME_SCALE,
  advanceActiveElapsed,
  createRaceLoop,
  projectRaceAtElapsed,
  quantizeReducedMotionTimer,
  type RaceClock,
} from '@features/games/time-race/time-race-engine';

function pairById(id: string) {
  const pair = TIME_RACE_PAIRS.find((candidate) => candidate.id === id);
  if (!pair) throw new Error(`missing pair ${id}`);
  return pair;
}

function createFakeClock(): RaceClock & {
  step(ms: number): void;
  cancelled: number[];
} {
  let now = 0;
  let nextId = 1;
  const callbacks = new Map<number, (time: number) => void>();
  const cancelled: number[] = [];

  return {
    now: () => now,
    requestFrame: (callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame: (id) => {
      cancelled.push(id);
      callbacks.delete(id);
    },
    step(ms) {
      now += ms;
      const pending = [...callbacks.entries()];
      callbacks.clear();
      for (const [, callback] of pending) callback(now);
    },
    cancelled,
  };
}

describe('L13 time race deterministic motion contract', () => {
  it('يثبت timeScale الإنتاجي = 1 وسقف frame = 250ms', () => {
    expect(PRODUCTION_TIME_SCALE).toBe(1);
    expect(FRAME_GAP_CAP_MS).toBe(250);
  });

  it('فاصل 100ms يبقى 1:1 ولا يقصه السقف', () => {
    expect(
      advanceActiveElapsed({
        activeElapsedMs: 0,
        lastFrameNowMs: 0,
        nowMs: 100,
      })
    ).toEqual({
      activeElapsedMs: 100,
      lastFrameNowMs: 100,
    });
  });

  it('الفاصل الطويل فقط يُحرس عند 250ms', () => {
    expect(
      advanceActiveElapsed({
        activeElapsedMs: 1000,
        lastFrameNowMs: 1000,
        nowMs: 1400,
      }).activeElapsedMs
    ).toBe(1250);
  });

  it.each(['B01', 'B04', 'B07', 'B10'])(
    'عند زمن كل سيارة تكون على خط النهاية والمؤقت = البنك — %s',
    (id) => {
      const pair = pairById(id);

      const nissan = projectRaceAtElapsed(pair, pair.nissanCs * 10);
      expect(nissan.nissan.progress).toBe(1);
      expect(nissan.nissan.timerCs).toBe(pair.nissanCs);
      expect(nissan.nissan.finished).toBe(true);

      const lamborghini = projectRaceAtElapsed(pair, pair.lamborghiniCs * 10);
      expect(lamborghini.lamborghini.progress).toBe(1);
      expect(lamborghini.lamborghini.timerCs).toBe(pair.lamborghiniCs);
      expect(lamborghini.lamborghini.finished).toBe(true);
    }
  );

  it('الحركة خطية: نصف الزمن = نصف المسار', () => {
    const pair = pairById('B01');
    const projected = projectRaceAtElapsed(pair, (pair.nissanCs * 10) / 2);
    expect(projected.nissan.progress).toBeCloseTo(0.5, 6);
  });

  it('reduced-motion يحدّث المؤقت كل 100cs ويثبت القيمة النهائية عند الوصول', () => {
    expect(quantizeReducedMotionTimer({ timerCs: 54, targetCs: 1047, finished: false })).toBe(0);
    expect(quantizeReducedMotionTimer({ timerCs: 199, targetCs: 1047, finished: false })).toBe(100);
    expect(quantizeReducedMotionTimer({ timerCs: 1047, targetCs: 1047, finished: true })).toBe(
      1047
    );
  });

  it('visibilitychange لا يضيف زمنًا مخفيًا ولا يقفز عند العودة', () => {
    const pair = pairById('B01');
    const clock = createFakeClock();
    const frames: number[] = [];

    const loop = createRaceLoop({
      pair,
      clock,
      reducedMotion: false,
      onFrame: (frame) => frames.push(frame.activeElapsedMs),
      onComplete: vi.fn(),
    });

    loop.start();
    clock.step(100);
    expect(frames.at(-1)).toBe(100);

    loop.setHidden(true);
    clock.step(2000);
    expect(frames.at(-1)).toBe(100);

    loop.setHidden(false);
    clock.step(100);
    expect(frames.at(-1)).toBe(200);
  });

  it('dispose يلغي requestAnimationFrame ولا يترك تحديثًا لاحقًا', () => {
    const pair = pairById('B01');
    const clock = createFakeClock();
    const onFrame = vi.fn();

    const loop = createRaceLoop({
      pair,
      clock,
      reducedMotion: false,
      onFrame,
      onComplete: vi.fn(),
    });

    loop.start();
    clock.step(100);
    const callsBeforeDispose = onFrame.mock.calls.length;

    loop.dispose();
    expect(clock.cancelled.length).toBeGreaterThan(0);

    clock.step(1000);
    expect(onFrame).toHaveBeenCalledTimes(callsBeforeDispose);
  });
});

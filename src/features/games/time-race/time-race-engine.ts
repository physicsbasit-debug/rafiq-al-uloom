import type { TimeRacePair } from './time-race-bank';

export const PRODUCTION_TIME_SCALE = 1 as const;
export const FRAME_GAP_CAP_MS = 250 as const;

export interface RaceClock {
  now(): number;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(id: number): void;
}

export interface RaceCarProjection {
  readonly progress: number;
  readonly timerCs: number;
  readonly finished: boolean;
}

export interface RaceProjection {
  readonly activeElapsedMs: number;
  readonly nissan: RaceCarProjection;
  readonly lamborghini: RaceCarProjection;
}

export type RaceLoopFrame = RaceProjection;

export interface RaceLoop {
  start(): void;
  setHidden(hidden: boolean): void;
  dispose(): void;
}

export function advanceActiveElapsed({
  activeElapsedMs,
  lastFrameNowMs,
  nowMs,
}: {
  readonly activeElapsedMs: number;
  readonly lastFrameNowMs: number;
  readonly nowMs: number;
}): {
  readonly activeElapsedMs: number;
  readonly lastFrameNowMs: number;
} {
  const rawDelta = Math.max(0, nowMs - lastFrameNowMs);
  const guardedDelta = Math.min(rawDelta, FRAME_GAP_CAP_MS);

  return {
    activeElapsedMs: activeElapsedMs + guardedDelta * PRODUCTION_TIME_SCALE,
    lastFrameNowMs: nowMs,
  };
}

function projectCar(targetCs: number, activeElapsedMs: number): RaceCarProjection {
  const targetMs = targetCs * 10;
  const finished = activeElapsedMs >= targetMs;

  if (finished) {
    return { progress: 1, timerCs: targetCs, finished: true };
  }

  return {
    progress: targetMs === 0 ? 1 : activeElapsedMs / targetMs,
    timerCs: Math.min(targetCs, Math.floor(activeElapsedMs / 10)),
    finished: false,
  };
}

export function projectRaceAtElapsed(pair: TimeRacePair, activeElapsedMs: number): RaceProjection {
  const safeElapsed = Math.max(0, activeElapsedMs);
  return {
    activeElapsedMs: safeElapsed,
    nissan: projectCar(pair.nissanCs, safeElapsed),
    lamborghini: projectCar(pair.lamborghiniCs, safeElapsed),
  };
}

export function quantizeReducedMotionTimer({
  timerCs,
  targetCs,
  finished,
}: {
  readonly timerCs: number;
  readonly targetCs: number;
  readonly finished: boolean;
}): number {
  if (finished) return targetCs;
  return Math.floor(Math.max(0, timerCs) / 100) * 100;
}

export function createBrowserRaceClock(): RaceClock {
  return {
    now: () => performance.now(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
  };
}

export function createRaceLoop({
  pair,
  clock,
  reducedMotion,
  onFrame,
  onComplete,
}: {
  readonly pair: TimeRacePair;
  readonly clock: RaceClock;
  readonly reducedMotion: boolean;
  readonly onFrame: (frame: RaceLoopFrame) => void;
  readonly onComplete: (frame: RaceLoopFrame) => void;
}): RaceLoop {
  let activeElapsedMs = 0;
  let lastFrameNowMs = 0;
  let frameId: number | null = null;
  let started = false;
  let hidden = false;
  let disposed = false;
  let completed = false;

  function cancelPendingFrame() {
    if (frameId !== null) {
      clock.cancelFrame(frameId);
      frameId = null;
    }
  }

  function schedule() {
    if (!started || hidden || disposed || completed || frameId !== null) return;
    frameId = clock.requestFrame(onAnimationFrame);
  }

  function emitFrame(): RaceLoopFrame {
    const projected = projectRaceAtElapsed(pair, activeElapsedMs);
    const frame: RaceLoopFrame = reducedMotion
      ? {
          ...projected,
          nissan: {
            ...projected.nissan,
            timerCs: quantizeReducedMotionTimer({
              timerCs: projected.nissan.timerCs,
              targetCs: pair.nissanCs,
              finished: projected.nissan.finished,
            }),
          },
          lamborghini: {
            ...projected.lamborghini,
            timerCs: quantizeReducedMotionTimer({
              timerCs: projected.lamborghini.timerCs,
              targetCs: pair.lamborghiniCs,
              finished: projected.lamborghini.finished,
            }),
          },
        }
      : projected;

    onFrame(frame);

    if (frame.nissan.finished && frame.lamborghini.finished && !completed) {
      completed = true;
      onComplete(frame);
    }

    return frame;
  }

  function onAnimationFrame(nowMs: number) {
    frameId = null;
    if (disposed || hidden || completed) return;

    const next = advanceActiveElapsed({ activeElapsedMs, lastFrameNowMs, nowMs });
    activeElapsedMs = next.activeElapsedMs;
    lastFrameNowMs = next.lastFrameNowMs;

    emitFrame();
    schedule();
  }

  return {
    start() {
      if (started || disposed) return;
      started = true;
      lastFrameNowMs = clock.now();
      emitFrame();
      schedule();
    },

    setHidden(nextHidden: boolean) {
      if (disposed || hidden === nextHidden) return;
      hidden = nextHidden;

      if (hidden) {
        cancelPendingFrame();
        return;
      }

      lastFrameNowMs = clock.now();
      schedule();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      cancelPendingFrame();
    },
  };
}

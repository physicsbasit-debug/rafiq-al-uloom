import { useEffect, useMemo, useRef, useState } from 'react';

import { StudentBackAction } from '@features/student/navigation/StudentBackAction';

import './TimeRaceGame.css';

import { selectTimeRaceAttempt, type TimeRaceCar, type TimeRacePair } from './time-race-bank';
import {
  createBrowserRaceClock,
  createRaceLoop,
  projectRaceAtElapsed,
  type RaceClock,
  type RaceLoop,
  type RaceProjection,
} from './time-race-engine';
import {
  classifyTimeDifferenceError,
  normalizeTimeDifferenceInput,
  type TimeRaceErrorPattern,
} from './time-race-input';
import { buildTimeRaceReport, type TimeRaceReportStats } from './time-race-report';

interface TimeRaceGameProps {
  readonly onBack: () => void;
  readonly initialSeed?: number;
  readonly clock?: RaceClock;
}

type Phase = 'ready' | 'racing' | 'winner' | 'difference' | 'report';
type WinnerIdentification = 'direct' | 'after_hint';
type DifferenceOutcome = 'independent' | 'after_hint' | 'after_steps';

const CAR_LABELS: Readonly<Record<TimeRaceCar, string>> = {
  nissan: 'السيارة 1',
  lamborghini: 'السيارة 2',
};

function createEmptyStats(): TimeRaceReportStats {
  return {
    directWinnerCount: 0,
    independentDifferenceCount: 0,
    afterStepsCount: 0,
    errorPatternCounts: {
      no_borrow: 0,
      negative_difference: 0,
      decimal_shift_right: 0,
      decimal_shift_left: 0,
      integer_part_only: 0,
    },
  };
}

function formatCentiseconds(value: number): string {
  const safe = Math.max(0, Math.trunc(value));
  const whole = Math.floor(safe / 100);
  const fraction = (safe % 100).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function GenericSportsCar({ variant }: { readonly variant: TimeRaceCar }) {
  const body = variant === 'nissan' ? '#243B7A' : '#5B3A8A';
  const glass = variant === 'nissan' ? '#DDE7FF' : '#EEE3F8';

  return (
    <svg viewBox="0 0 160 64" aria-hidden="true" focusable="false">
      <path
        d="M18 38 L30 24 Q37 16 53 15 L101 15 Q118 16 128 29 L143 34 Q150 36 151 44 L151 49 L12 49 L12 43 Q12 39 18 38 Z"
        fill={body}
      />
      <path d="M48 20 L67 20 L67 34 L35 34 L40 27 Q43 22 48 20 Z" fill={glass} />
      <path d="M74 20 L99 20 Q108 21 116 34 L74 34 Z" fill={glass} />
      <rect x="20" y="39" width="122" height="6" rx="3" fill="#E56B4E" />
      <circle cx="42" cy="49" r="10" fill="#172033" />
      <circle cx="121" cy="49" r="10" fill="#172033" />
      <circle cx="42" cy="49" r="4" fill="#F7F8FC" />
      <circle cx="121" cy="49" r="4" fill="#F7F8FC" />
    </svg>
  );
}

function VerticalSubtraction({ pair }: { readonly pair: TimeRacePair }) {
  const larger = Math.max(pair.nissanCs, pair.lamborghiniCs);
  const smaller = Math.min(pair.nissanCs, pair.lamborghiniCs);

  return (
    <section
      className="rafiq-time-race-subtraction"
      data-testid="time-race-vertical-subtraction"
      aria-label="خطوات الطرح الرأسي"
    >
      <p>حاذِ المنازل العشرية، واستلف فقط عندما تكون الخانة العليا أصغر.</p>
      <div className="rafiq-time-race-subtraction-stack" dir="ltr">
        <span className="rafiq-time-race-borrow-note">استلاف عند الحاجة</span>
        <strong>{formatCentiseconds(larger)}</strong>
        <span className="rafiq-time-race-minus">− {formatCentiseconds(smaller)}</span>
        <span className="rafiq-time-race-rule" aria-hidden="true" />
        <span className="rafiq-time-race-result-slot">؟</span>
      </div>
    </section>
  );
}

function carLeftPercent(projection: RaceProjection['nissan'], reducedMotion: boolean): number {
  const progress = reducedMotion ? (projection.finished ? 1 : 0) : projection.progress;
  return 2 + Math.min(1, Math.max(0, progress)) * 76;
}

export function TimeRaceGame({ onBack, initialSeed = 1, clock }: TimeRaceGameProps) {
  const [initialAttempt] = useState<readonly TimeRacePair[]>(() =>
    selectTimeRaceAttempt({ seed: initialSeed })
  );

  const [seed, setSeed] = useState(initialSeed);
  const [attempt, setAttempt] = useState<readonly TimeRacePair[]>(initialAttempt);
  const [raceIndex, setRaceIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [frame, setFrame] = useState<RaceProjection>(() =>
    projectRaceAtElapsed(initialAttempt[0], 0)
  );
  const [winnerErrors, setWinnerErrors] = useState(0);
  const [winnerHint, setWinnerHint] = useState<string | null>(null);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [winnerIdentification, setWinnerIdentification] = useState<WinnerIdentification | null>(
    null
  );
  const [differenceInput, setDifferenceInput] = useState('');
  const [differenceErrors, setDifferenceErrors] = useState(0);
  const [differenceFeedback, setDifferenceFeedback] = useState<string | null>(null);
  const [differenceSolved, setDifferenceSolved] = useState(false);
  const [differenceOutcome, setDifferenceOutcome] = useState<DifferenceOutcome | null>(null);
  const [currentPatterns, setCurrentPatterns] = useState<readonly TimeRaceErrorPattern[]>([]);
  const [stats, setStats] = useState<TimeRaceReportStats>(() => createEmptyStats());

  const [reducedMotion] = useState(() => prefersReducedMotion());
  const loopRef = useRef<RaceLoop | null>(null);
  const reducedFrameKeyRef = useRef<string | null>(null);
  const [activeClock] = useState<RaceClock>(() => clock ?? createBrowserRaceClock());

  const currentPair = attempt[raceIndex] ?? attempt[0];
  const report = useMemo(() => buildTimeRaceReport(stats), [stats]);

  useEffect(() => {
    function handleVisibilityChange() {
      loopRef.current?.setHidden(document.hidden);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      loopRef.current?.dispose();
      loopRef.current = null;
    };
  }, []);

  function resetRaceState(pair: TimeRacePair) {
    loopRef.current?.dispose();
    loopRef.current = null;
    reducedFrameKeyRef.current = null;
    setFrame(projectRaceAtElapsed(pair, 0));
    setPhase('ready');
    setWinnerErrors(0);
    setWinnerHint(null);
    setWinnerRevealed(false);
    setWinnerIdentification(null);
    setDifferenceInput('');
    setDifferenceErrors(0);
    setDifferenceFeedback(null);
    setDifferenceSolved(false);
    setDifferenceOutcome(null);
    setCurrentPatterns([]);
  }

  function startRace() {
    if (phase !== 'ready') return;

    setPhase('racing');

    const loop = createRaceLoop({
      pair: currentPair,
      clock: activeClock,
      reducedMotion,
      onFrame: (nextFrame) => {
        if (!reducedMotion) {
          setFrame(nextFrame);
          return;
        }

        const key = [
          nextFrame.nissan.timerCs,
          nextFrame.nissan.finished ? 1 : 0,
          nextFrame.lamborghini.timerCs,
          nextFrame.lamborghini.finished ? 1 : 0,
        ].join(':');

        if (key !== reducedFrameKeyRef.current) {
          reducedFrameKeyRef.current = key;
          setFrame(nextFrame);
        }
      },
      onComplete: (finalFrame) => {
        setFrame(finalFrame);
        setPhase('winner');
      },
    });

    loopRef.current = loop;
    loop.start();
  }

  function chooseWinner(car: TimeRaceCar) {
    if (phase !== 'winner') return;

    if (car === currentPair.winner) {
      setWinnerIdentification(winnerErrors === 0 ? 'direct' : 'after_hint');
      setWinnerRevealed(true);
      setPhase('difference');
      return;
    }

    if (winnerErrors === 0) {
      setWinnerErrors(1);
      setWinnerHint('قارن الزمنين. السيارة ذات الزمن الأقل وصلت أولًا.');
      return;
    }

    setWinnerErrors(2);
    setWinnerIdentification('after_hint');
    setWinnerRevealed(true);
    setPhase('difference');
  }

  function addPattern(pattern: TimeRaceErrorPattern | null) {
    if (pattern === null) return;
    setCurrentPatterns((current) => (current.includes(pattern) ? current : [...current, pattern]));
  }

  function submitDifference() {
    if (phase !== 'difference' || differenceSolved) return;

    const parsed = normalizeTimeDifferenceInput(differenceInput);
    if (parsed.status === 'empty') return;

    if (parsed.status === 'valid' && parsed.centiseconds === currentPair.differenceCs) {
      const outcome: DifferenceOutcome =
        differenceErrors === 0
          ? 'independent'
          : differenceErrors === 1
            ? 'after_hint'
            : 'after_steps';

      setDifferenceOutcome(outcome);
      setDifferenceSolved(true);
      setDifferenceFeedback('صحيح. الفرق الزمني محسوب بدقة.');

      setStats((current) => {
        const counts = { ...current.errorPatternCounts };
        for (const pattern of currentPatterns) {
          counts[pattern] += 1;
        }

        return {
          directWinnerCount:
            current.directWinnerCount + (winnerIdentification === 'direct' ? 1 : 0),
          independentDifferenceCount:
            current.independentDifferenceCount + (outcome === 'independent' ? 1 : 0),
          afterStepsCount: current.afterStepsCount + (outcome === 'after_steps' ? 1 : 0),
          errorPatternCounts: counts,
        };
      });

      return;
    }

    addPattern(
      classifyTimeDifferenceError({
        rawInput: differenceInput,
        pair: currentPair,
      })
    );

    const nextErrors = differenceErrors + 1;
    setDifferenceErrors(nextErrors);

    if (nextErrors === 1) {
      setDifferenceFeedback('اطرح الأصغر من الأكبر، وانتبه إلى مواضع الفاصلة');
    } else {
      setDifferenceFeedback('استخدم الطرح الرأسي، ثم اكتب الناتج بنفسك.');
    }
  }

  function goNext() {
    if (!differenceSolved) return;

    if (raceIndex >= attempt.length - 1) {
      setPhase('report');
      return;
    }

    const nextIndex = raceIndex + 1;
    const nextPair = attempt[nextIndex];
    setRaceIndex(nextIndex);
    resetRaceState(nextPair);
  }

  function startNewAttempt() {
    const nextSeed = seed + 1;
    const nextAttempt = selectTimeRaceAttempt({
      seed: nextSeed,
      lastPairId: attempt.at(-1)?.id,
      previousPairIds: attempt.map((pair) => pair.id),
    });

    setSeed(nextSeed);
    setAttempt(nextAttempt);
    setRaceIndex(0);
    setStats(createEmptyStats());
    resetRaceState(nextAttempt[0]);
  }

  if (phase === 'report') {
    return (
      <section
        className="rafiq-time-race rafiq-time-race-report"
        data-testid="time-race-shell"
        data-time-scale="1"
        dir="rtl"
      >
        <header className="rafiq-time-race-report-hero">
          <p>تقرير سباق أجزاء الثانية</p>
          <h2>ما الذي ثبت معك؟</h2>
        </header>

        <div className="rafiq-time-race-report-grid">
          <section>
            <h3>ما أتقنته</h3>
            <ul>
              {report.mastered.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>ما يحتاج مراجعة</h3>
            <ul>
              {report.review.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <p className="rafiq-time-race-final-note">{report.finalNote}</p>

        <div className="rafiq-time-race-report-actions">
          <button type="button" className="rafiq-time-race-primary" onClick={startNewAttempt}>
            سباقات جديدة
          </button>
          <StudentBackAction label="العودة إلى الدرس" onClick={onBack} />
        </div>
      </section>
    );
  }

  const showDecision = phase === 'winner' || phase === 'difference';
  const showDifference = phase === 'difference';

  return (
    <section
      className="rafiq-time-race"
      data-testid="time-race-shell"
      data-time-scale="1"
      dir="rtl"
    >
      <header className="rafiq-time-race-hero">
        <div>
          <span className="rafiq-time-race-kicker">لعبة قرار سريع</span>
          <h2>سباق أجزاء الثانية</h2>
          <p>اقرأ الزمنين، حدّد الأقل، ثم احسب الفرق بينهما بأجزاء من مئة من الثانية.</p>
        </div>
        <div className="rafiq-time-race-hero-chip">أزمنة رقمية</div>
      </header>

      <div className="rafiq-time-race-disclaimer">
        <strong>أزمنة افتراضية معدّة للنشاط.</strong>
        <span>الأزمنة غير حقيقية، والهدف التدريب على المقارنة وحساب الفرق.</span>
      </div>

      <ol className="rafiq-time-race-thinking" aria-label="خطوات التفكير">
        <li>ما الزمنان؟</li>
        <li>أيهما الأصغر؟</li>
        <li>اطرح الأصغر من الأكبر.</li>
        <li>اعتمد</li>
      </ol>

      <section
        className="rafiq-time-race-track"
        data-testid="time-race-track"
        dir="ltr"
        aria-label="مضمار السباق"
      >
        <div className="rafiq-time-race-start-line" aria-hidden="true" />
        <div className="rafiq-time-race-finish-line" aria-hidden="true">
          <span dir="rtl">النهاية</span>
        </div>

        <div className="rafiq-time-race-lane">
          <div className="rafiq-time-race-lane-meta" dir="rtl">
            <strong>{CAR_LABELS.nissan}</strong>
            <span
              className="rafiq-time-race-timer"
              data-testid="time-race-timer"
              dir="ltr"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCentiseconds(frame.nissan.timerCs)} ث
            </span>
          </div>
          <div
            className={`rafiq-time-race-car${frame.nissan.finished ? ' is-finished' : ''}`}
            style={{ left: `${carLeftPercent(frame.nissan, reducedMotion)}%` }}
          >
            <GenericSportsCar variant="nissan" />
          </div>
        </div>

        <div className="rafiq-time-race-lane">
          <div className="rafiq-time-race-lane-meta" dir="rtl">
            <strong>{CAR_LABELS.lamborghini}</strong>
            <span
              className="rafiq-time-race-timer"
              data-testid="time-race-timer"
              dir="ltr"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCentiseconds(frame.lamborghini.timerCs)} ث
            </span>
          </div>
          <div
            className={`rafiq-time-race-car${frame.lamborghini.finished ? ' is-finished' : ''}`}
            style={{ left: `${carLeftPercent(frame.lamborghini, reducedMotion)}%` }}
          >
            <GenericSportsCar variant="lamborghini" />
          </div>
        </div>
      </section>

      <button
        type="button"
        className="rafiq-time-race-primary rafiq-time-race-start"
        disabled={phase !== 'ready'}
        onClick={startRace}
      >
        ابدأ السباق
      </button>

      {showDecision ? (
        <section className="rafiq-time-race-decision" aria-labelledby="time-race-winner-question">
          <div className="rafiq-time-race-finish-announcement" role="status" aria-live="polite">
            انتهى السباق. اقرأ الزمنين قبل اتخاذ القرار.
          </div>

          <h3 id="time-race-winner-question">أي سيارة وصلت أولًا؟</h3>
          <div className="rafiq-time-race-winner-options">
            {(Object.keys(CAR_LABELS) as TimeRaceCar[]).map((car) => (
              <button
                key={car}
                type="button"
                disabled={phase !== 'winner'}
                className={
                  winnerRevealed && car === currentPair.winner ? 'is-correct-winner' : undefined
                }
                onClick={() => chooseWinner(car)}
              >
                {CAR_LABELS[car]}
              </button>
            ))}
          </div>

          {winnerHint ? <p className="rafiq-time-race-hint">{winnerHint}</p> : null}

          {winnerRevealed ? (
            <p className="rafiq-time-race-winner-badge">
              <span aria-hidden="true">✓</span>
              <strong>{CAR_LABELS[currentPair.winner]}</strong>
              <span>وصل أولًا</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {showDifference ? (
        <section
          className="rafiq-time-race-difference"
          aria-labelledby="time-race-difference-title"
        >
          <h3 id="time-race-difference-title">احسب الفرق بين الزمنين</h3>
          <label htmlFor="time-race-difference-input">الفرق الزمني</label>
          <div className="rafiq-time-race-input-row">
            <input
              id="time-race-difference-input"
              type="text"
              inputMode="decimal"
              value={differenceInput}
              disabled={differenceSolved}
              onChange={(event) => setDifferenceInput(event.target.value)}
              autoComplete="off"
            />
            <span>ث</span>
            <button type="button" disabled={differenceSolved} onClick={submitDifference}>
              تحقق من الفرق
            </button>
          </div>

          {differenceFeedback ? (
            <p className={differenceSolved ? 'is-success' : 'is-guidance'}>{differenceFeedback}</p>
          ) : null}

          {differenceErrors >= 2 ? <VerticalSubtraction pair={currentPair} /> : null}

          {differenceSolved ? (
            <button type="button" className="rafiq-time-race-primary" onClick={goNext}>
              {raceIndex === attempt.length - 1 ? 'عرض التقرير' : 'التالي'}
            </button>
          ) : null}
        </section>
      ) : null}

      <StudentBackAction label="العودة إلى الدرس" onClick={onBack} />

      <span className="rafiq-time-race-state-sink" aria-hidden="true">
        {differenceOutcome === null ? '' : ''}
      </span>
    </section>
  );
}

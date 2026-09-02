import { useEffect, useMemo, useRef, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { evaluateTransverseWave } from '@features/simulations/engine/transverse-wave.engine';
import type { Simulation } from '@shared-types/simulation.types';

interface WaveSimulationRunnerProps {
  simulation: Simulation;
  onBack: () => void;
}

function format(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

export function WaveSimulationRunner({ simulation, onBack }: WaveSimulationRunnerProps) {
  if (simulation.config.engineKind !== 'transverse_wave_v1') {
    throw new Error('WaveSimulationRunner received an unsupported simulation engine.');
  }

  const config = simulation.config;
  const [frequencyHz, setFrequencyHz] = useState(config.frequencyHz.initial);
  const [amplitudeM, setAmplitudeM] = useState(config.amplitudeM.initial);
  const [phaseRad, setPhaseRad] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const snapshot = useMemo(
    () =>
      evaluateTransverseWave(config, {
        frequencyHz,
        amplitudeM,
        phaseRad,
      }),
    [config, frequencyHz, amplitudeM, phaseRad]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const shouldAnimate = isPlaying && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate) {
      lastTimeRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    const tick = (time: number) => {
      const previous = lastTimeRef.current ?? time;
      const deltaSeconds = Math.min((time - previous) / 1000, 0.05);
      lastTimeRef.current = time;
      setPhaseRad((phase) => phase + 2 * Math.PI * frequencyHz * deltaSeconds);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastTimeRef.current = null;
    };
  }, [frequencyHz, shouldAnimate]);

  const width = 720;
  const height = 260;
  const centerY = height / 2;
  const maxAmplitude = Math.max(config.amplitudeM.max, 0.001);
  const path = snapshot.samples
    .map((point, index) => {
      const x = (index / (snapshot.samples.length - 1)) * width;
      const y = centerY - (point.yM / maxAmplitude) * (height * 0.38);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const reset = () => {
    setIsPlaying(false);
    setFrequencyHz(config.frequencyHz.initial);
    setAmplitudeM(config.amplitudeM.initial);
    setPhaseRad(0);
  };

  return (
    <section dir="rtl" style={{ display: 'grid', gap: spacing.lg }}>
      <header>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>{simulation.title}</h2>
        <p style={{ color: colors.textSecondary }}>{simulation.instructions}</p>
      </header>

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: spacing.md,
          backgroundColor: colors.surface,
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="wave-simulation-title wave-simulation-desc"
          style={{ width: '100%', minHeight: 180 }}
        >
          <title id="wave-simulation-title">تمثيل ثنائي الأبعاد لموجة عرضية</title>
          <desc id="wave-simulation-desc">
            يتغير طول الموجة مع التردد، وتتغير الإزاحة القصوى مع السعة.
          </desc>
          <line x1="0" y1={centerY} x2={width} y2={centerY} stroke="currentColor" opacity="0.3" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      </div>

      <div style={{ display: 'grid', gap: spacing.md }}>
        <label style={{ display: 'grid', gap: spacing.xs }}>
          <strong>التردد f: {format(frequencyHz)} هرتز</strong>
          <input
            aria-label="التردد"
            dir="ltr"
            type="range"
            min={config.frequencyHz.min}
            max={config.frequencyHz.max}
            step={config.frequencyHz.step}
            value={frequencyHz}
            onChange={(event) => setFrequencyHz(Number(event.target.value))}
          />
        </label>

        <label style={{ display: 'grid', gap: spacing.xs }}>
          <strong>السعة A: {format(amplitudeM)} متر</strong>
          <input
            aria-label="السعة"
            dir="ltr"
            type="range"
            min={config.amplitudeM.min}
            max={config.amplitudeM.max}
            step={config.amplitudeM.step}
            value={amplitudeM}
            onChange={(event) => setAmplitudeM(Number(event.target.value))}
          />
        </label>
      </div>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: spacing.sm,
          margin: 0,
        }}
      >
        <div>
          <dt>سرعة الموجة في هذا الوسط التعليمي</dt>
          <dd style={{ margin: 0, fontWeight: 800 }}>{format(snapshot.speedMps)} م/ث</dd>
        </div>
        <div>
          <dt>الطول الموجي λ</dt>
          <dd style={{ margin: 0, fontWeight: 800 }}>{format(snapshot.wavelengthM)} م</dd>
        </div>
        <div>
          <dt>الزمن الدوري T</dt>
          <dd style={{ margin: 0, fontWeight: 800 }}>{format(snapshot.periodS)} ث</dd>
        </div>
      </dl>

      <p style={{ margin: 0, color: colors.textSecondary }}>
        عند ثبات سرعة الموجة في الوسط التعليمي، زيادة التردد تقلل الطول الموجي. تغيير السعة لا يغير
        التردد أو الطول الموجي.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
        <AppButton
          label={
            prefersReducedMotion
              ? 'الحركة متوقفة حسب إعداد الجهاز'
              : isPlaying
                ? 'إيقاف الحركة'
                : 'تشغيل الحركة'
          }
          onClick={() => {
            if (!prefersReducedMotion) {
              setIsPlaying((value) => !value);
            }
          }}
        />
        <AppButton label="إعادة الضبط" variant="secondary" onClick={reset} />
        <AppButton label="العودة إلى الأنشطة" variant="secondary" onClick={onBack} />
      </div>
    </section>
  );
}

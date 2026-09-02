// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaveSimulationRunner } from '@features/simulations/wave/WaveSimulationRunner';

const simulation = {
  id: 'g10-phy-waves-l2-sim-wave-properties',
  lessonId: 'g10-phy-waves-l2',
  title: 'محاكاة خصائص الموجة',
  instructions: 'غيّر التردد والسعة ولاحظ أثرهما.',
  objectiveIds: ['l2-o1', 'l2-o2'],
  config: {
    engineKind: 'transverse_wave_v1' as const,
    mediumSpeedMps: 12,
    frequencyHz: { min: 0.5, max: 4, step: 0.5, initial: 1 },
    amplitudeM: { min: 0.2, max: 1, step: 0.1, initial: 0.5 },
  },
  status: 'draft' as const,
  source: 'curriculum_seed' as const,
};

function installMatchMedia(matches: boolean) {
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener,
    removeEventListener,
    dispatchEvent: vi.fn(),
  }));

  vi.stubGlobal('matchMedia', matchMedia);

  return {
    matchMedia,
    addEventListener,
    removeEventListener,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WaveSimulationRunner', () => {
  it('shows the mandatory educational-medium wording and controls', () => {
    installMatchMedia(false);
    render(<WaveSimulationRunner simulation={simulation} onBack={vi.fn()} />);
    expect(screen.getByText('سرعة الموجة في هذا الوسط التعليمي')).toBeInTheDocument();
    expect(screen.getByLabelText('التردد')).toBeInTheDocument();
    expect(screen.getByLabelText('السعة')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'تمثيل ثنائي الأبعاد لموجة عرضية يتغير طول الموجة مع التردد، وتتغير الإزاحة القصوى مع السعة.',
      })
    ).toBeInTheDocument();
  });

  it('يمنع بدء الحركة عندما يطلب الجهاز تقليل الحركة', () => {
    installMatchMedia(true);
    const requestAnimationFrame = vi.fn(() => 1);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    render(<WaveSimulationRunner simulation={simulation} onBack={vi.fn()} />);

    const reducedMotionButton = screen.getByRole('button', {
      name: 'الحركة متوقفة حسب إعداد الجهاز',
    });

    fireEvent.click(reducedMotionButton);

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'الحركة متوقفة حسب إعداد الجهاز' })
    ).toBeInTheDocument();
  });

  it('يبدأ الحركة طبيعيًا عندما لا يطلب الجهاز تقليل الحركة', () => {
    installMatchMedia(false);
    const requestAnimationFrame = vi.fn(() => 1);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    render(<WaveSimulationRunner simulation={simulation} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'تشغيل الحركة' }));

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'إيقاف الحركة' })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatchingGameRunner } from '@features/games/matching/MatchingGameRunner';
import type { Objective } from '@shared-types/content.types';
import type { Game } from '@shared-types/game.types';

const game: Game = {
  id: 'game-one',
  lessonId: 'lesson-one',
  type: 'matching',
  title: 'مطابقة المفاهيم',
  instructions: 'طابق كل مفهوم مع وصفه.',
  items: [
    { left: 'الطول الموجي', right: 'المسافة بين قمتين متتاليتين' },
    { left: 'التردد', right: 'عدد الاهتزازات في الثانية' },
  ],
  objectiveIds: ['objective-one'],
  status: 'approved',
  source: 'curriculum_seed',
};

const objectives: Objective[] = [
  {
    id: 'objective-one',
    lessonId: 'lesson-one',
    text: 'يعرّف مفاهيم الموجات.',
  },
];

afterEach(() => {
  cleanup();
});

describe('MatchingGameRunner behavior parity', () => {
  it('يبقي المطابقة الخاطئة قابلة للمحاولة الفورية', () => {
    render(<MatchingGameRunner games={[game]} objectives={objectives} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(screen.getByRole('button', { name: 'عدد الاهتزازات في الثانية' }));

    expect(screen.getByRole('status')).toHaveTextContent('ليست المطابقة الصحيحة. جرّب مرة أخرى.');
    expect(screen.getByText('العنصر المختار')).toBeInTheDocument();
  });

  it('المطابقة الصحيحة تزيل الزوج من القائمتين كما في المسار القديم', () => {
    render(<MatchingGameRunner games={[game]} objectives={objectives} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(screen.getByRole('button', { name: 'المسافة بين قمتين متتاليتين' }));

    expect(screen.queryByRole('button', { name: 'الطول الموجي' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'المسافة بين قمتين متتاليتين' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('العنصر المختار')).not.toBeInTheDocument();
  });

  it('يعرض رسالة الاكتمال نفسها', () => {
    render(<MatchingGameRunner games={[game]} objectives={objectives} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(screen.getByRole('button', { name: 'المسافة بين قمتين متتاليتين' }));
    fireEvent.click(screen.getByRole('button', { name: 'التردد' }));
    fireEvent.click(screen.getByRole('button', { name: 'عدد الاهتزازات في الثانية' }));

    expect(screen.getByRole('status')).toHaveTextContent('اكتملت جميع المطابقات بنجاح.');
  });

  it('يغير نص العودة فقط دون تغيير منطق الجولة', () => {
    const onBack = vi.fn();

    render(
      <MatchingGameRunner
        games={[game]}
        objectives={objectives}
        onBack={onBack}
        backLabel="العودة إلى الأنشطة"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

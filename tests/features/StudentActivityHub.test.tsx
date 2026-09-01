// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentActivityHub } from '@features/activities/StudentActivityHub';
import { useActivitiesByLesson } from '@services/queries/activity-query.hooks';
import { useObjectivesByIds } from '@services/queries/content-query.hooks';
import type { AvailableLearningActivity } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';

vi.mock('@services/queries/activity-query.hooks', () => ({
  useActivitiesByLesson: vi.fn(),
}));

vi.mock('@services/queries/content-query.hooks', () => ({
  useObjectivesByIds: vi.fn(),
}));

const mockedUseActivitiesByLesson = vi.mocked(useActivitiesByLesson);
const mockedUseObjectivesByIds = vi.mocked(useObjectivesByIds);

const game: Game = {
  id: 'game-one',
  lessonId: 'lesson-one',
  type: 'matching',
  title: 'مطابقة المفاهيم',
  instructions: 'طابق.',
  items: [{ left: 'أ', right: 'ب' }],
  objectiveIds: ['objective-one'],
  status: 'approved',
  source: 'curriculum_seed',
};

const experiment: Experiment = {
  id: 'experiment-one',
  lessonId: 'lesson-one',
  title: 'تجربة الموجات',
  objective: 'ملاحظة الموجة.',
  objectiveIds: ['objective-two'],
  tools: ['وعاء'],
  steps: ['نفذ'],
  safetyNotes: ['انتبه'],
  safetyLevel: 'teacher_supervised',
  observationPrompt: 'لاحظ',
  conclusionPrompt: 'استنتج',
  homeAlternative: null,
  status: 'approved',
  source: 'curriculum_seed',
};

const activities: AvailableLearningActivity[] = [
  {
    id: game.id,
    lessonId: game.lessonId,
    kind: 'matching',
    title: game.title,
    objectiveIds: [...game.objectiveIds],
    status: game.status,
    source: game.source,
    content: game,
  },
  {
    id: experiment.id,
    lessonId: experiment.lessonId,
    kind: 'experiment',
    title: experiment.title,
    objectiveIds: [...experiment.objectiveIds],
    status: experiment.status,
    source: experiment.source,
    content: experiment,
  },
];

const objectives: Objective[] = [
  { id: 'objective-one', lessonId: 'lesson-one', text: 'هدف اللعبة' },
  { id: 'objective-two', lessonId: 'lesson-one', text: 'هدف التجربة' },
];

function mockActivitiesSuccess(data: AvailableLearningActivity[] = activities) {
  mockedUseActivitiesByLesson.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

function mockObjectivesSuccess(data: Objective[] = objectives) {
  mockedUseObjectivesByIds.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

beforeEach(() => {
  mockedUseActivitiesByLesson.mockReset();
  mockedUseObjectivesByIds.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('StudentActivityHub', () => {
  it('يحمل catalog بالـlessonId الصحيح', () => {
    mockActivitiesSuccess([]);
    render(<StudentActivityHub lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseActivitiesByLesson).toHaveBeenCalledWith('lesson-one');
    expect(mockedUseObjectivesByIds).not.toHaveBeenCalled();
  });

  it('يعرض empty state دون استعلام أهداف غير ضروري', () => {
    mockActivitiesSuccess([]);
    render(<StudentActivityHub lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByText('لا توجد أنشطة علمية متاحة لهذا الدرس حاليًا.')).toBeInTheDocument();
    expect(mockedUseObjectivesByIds).not.toHaveBeenCalled();
  });

  it('يجمع objectiveIds في استعلام واحد بترتيب أول ظهور', () => {
    mockActivitiesSuccess();
    mockObjectivesSuccess();

    render(<StudentActivityHub lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseObjectivesByIds).toHaveBeenCalledTimes(1);
    expect(mockedUseObjectivesByIds).toHaveBeenCalledWith(['objective-one', 'objective-two']);
  });

  it('يعرض البطاقات والأهداف والسلامة للتجربة', () => {
    mockActivitiesSuccess();
    mockObjectivesSuccess();

    render(<StudentActivityHub lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'مطابقة المفاهيم' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'تجربة الموجات' })).toBeInTheDocument();
    expect(screen.getByText('هدف اللعبة')).toBeInTheDocument();
    expect(screen.getByText('هدف التجربة')).toBeInTheDocument();
    expect(screen.getByText('السلامة: بإشراف المعلم')).toBeInTheDocument();
  });

  it('يفتح matching واحدًا داخل Hub ثم يعود لقائمة الأنشطة', () => {
    mockActivitiesSuccess();
    mockObjectivesSuccess();

    render(<StudentActivityHub lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    const cards = screen.getAllByRole('article');
    fireEvent.click(within(cards[0]).getByRole('button', { name: 'فتح النشاط' }));

    expect(screen.getByRole('heading', { name: 'لعبة المطابقة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'مطابقة المفاهيم' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
    expect(screen.getByRole('heading', { name: 'الأنشطة العلمية' })).toBeInTheDocument();
  });

  it('يفشل بوضوح إذا كان objective المرتبط مفقودًا', () => {
    const reload = vi.fn();
    mockActivitiesSuccess();
    mockedUseObjectivesByIds.mockReturnValue({
      data: [objectives[0]],
      isLoading: false,
      error: null,
      reload,
    });

    render(<StudentActivityHub lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('أحد ارتباطات أهداف التعلم مفقود');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

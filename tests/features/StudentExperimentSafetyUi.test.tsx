// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentActivityHost } from '@features/activities/StudentActivityHost';
import { StudentActivityHub } from '@features/activities/StudentActivityHub';
import { ExperimentCard } from '@features/experiments/experiment-card';
import { LessonExperiments } from '@features/lesson/experiments/LessonExperiments';
import { useActivitiesByLesson } from '@services/queries/activity-query.hooks';
import { useObjectivesByIds } from '@services/queries/content-query.hooks';
import type { ExperimentActivity } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';
import type { Experiment, SafetyLevel } from '@shared-types/experiment.types';

vi.mock('@services/queries/activity-query.hooks', () => ({
  useActivitiesByLesson: vi.fn(),
}));

vi.mock('@services/queries/content-query.hooks', () => ({
  useObjectivesByIds: vi.fn(),
}));

const mockedUseActivitiesByLesson = vi.mocked(useActivitiesByLesson);
const mockedUseObjectivesByIds = vi.mocked(useObjectivesByIds);

const objective: Objective = {
  id: 'objective-safety',
  lessonId: 'lesson-safety',
  text: 'يطبق قواعد السلامة العلمية',
};

function buildExperiment(safetyLevel: SafetyLevel): Experiment {
  return {
    id: `experiment-${safetyLevel}`,
    lessonId: 'lesson-safety',
    title: `تجربة ${safetyLevel}`,
    objective: `هدف ${safetyLevel}`,
    objectiveIds: [objective.id],
    tools: [`أداة ${safetyLevel}`],
    steps: [`خطوة سرية ${safetyLevel}`],
    safetyNotes: [`احتياط ${safetyLevel}`],
    safetyLevel,
    observationPrompt: `ملاحظة ${safetyLevel}`,
    conclusionPrompt: `استنتاج ${safetyLevel}`,
    homeAlternative: `بديل منزلي ${safetyLevel}`,
    status: 'approved',
    source: 'teacher_authored',
  };
}

function toActivity(experiment: Experiment): ExperimentActivity {
  return {
    id: experiment.id,
    lessonId: experiment.lessonId,
    kind: 'experiment',
    title: experiment.title,
    objectiveIds: [...experiment.objectiveIds],
    status: experiment.status,
    source: experiment.source,
    content: experiment,
  };
}

function mockHub(activity: ExperimentActivity) {
  mockedUseActivitiesByLesson.mockReturnValue({
    data: [activity],
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
  mockedUseObjectivesByIds.mockReturnValue({
    data: [objective],
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

describe('student experiment safety UI', () => {
  it('يعرض safe_home كاملًا', () => {
    const experiment = buildExperiment('safe_home');
    render(<ExperimentCard experiment={experiment} />);

    expect(screen.getByText(experiment.tools[0])).toBeInTheDocument();
    expect(screen.getByText(experiment.steps[0])).toBeInTheDocument();
    expect(screen.getByText(experiment.observationPrompt)).toBeInTheDocument();
    expect(screen.getByText(experiment.conclusionPrompt)).toBeInTheDocument();
    expect(screen.getByText(experiment.homeAlternative as string)).toBeInTheDocument();
  });

  it('يعرض teacher_supervised للتحضير ويخفي الخطوات والبديل المنزلي', () => {
    const experiment = buildExperiment('teacher_supervised');
    render(<ExperimentCard experiment={experiment} />);

    expect(screen.getByRole('note')).toHaveTextContent('بإشراف المعلم فقط');
    expect(screen.getByText(experiment.tools[0])).toBeInTheDocument();
    expect(screen.getByText(experiment.safetyNotes[0])).toBeInTheDocument();
    expect(screen.getByText(experiment.observationPrompt)).toBeInTheDocument();
    expect(screen.getByText(experiment.conclusionPrompt)).toBeInTheDocument();
    expect(screen.queryByText(experiment.steps[0])).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.homeAlternative as string)).not.toBeInTheDocument();
  });

  it('يعرض lab_only كمعلومات مختبرية بلا أدوات أو خطوات أو prompts', () => {
    const experiment = buildExperiment('lab_only');
    render(<ExperimentCard experiment={experiment} />);

    expect(screen.getByRole('note')).toHaveTextContent('محصور في المختبر');
    expect(screen.getByText(experiment.objective)).toBeInTheDocument();
    expect(screen.getByText(experiment.safetyNotes[0])).toBeInTheDocument();
    expect(screen.queryByText(experiment.tools[0])).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.steps[0])).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.observationPrompt)).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.conclusionPrompt)).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.homeAlternative as string)).not.toBeInTheDocument();
  });

  it('يحجب not_allowed في ExperimentCard حتى على مسار الدرس الرئيسي', () => {
    const experiment = buildExperiment('not_allowed');
    render(<LessonExperiments experiments={[experiment]} />);

    expect(screen.getByRole('note')).toHaveTextContent('غير متاحة للتنفيذ');
    expect(screen.getByText(experiment.objective)).toBeInTheDocument();
    expect(screen.queryByText(experiment.tools[0])).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.steps[0])).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.safetyNotes[0])).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.observationPrompt)).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.conclusionPrompt)).not.toBeInTheDocument();
    expect(screen.queryByText(experiment.homeAlternative as string)).not.toBeInTheDocument();
  });

  it.each([
    ['safe_home', 'فتح النشاط'],
    ['teacher_supervised', 'عرض متطلبات التجربة'],
    ['lab_only', 'عرض معلومات التجربة'],
  ] as const)('يضبط إجراء Hub للمستوى %s', (safetyLevel, actionLabel) => {
    const activity = toActivity(buildExperiment(safetyLevel));
    mockHub(activity);

    render(<StudentActivityHub lessonId="lesson-safety" onBackToLesson={vi.fn()} />);

    const card = within(screen.getByRole('article'));
    expect(card.getByRole('button', { name: actionLabel })).toBeInTheDocument();
  });

  it('لا يقدم Hub أي إجراء تنفيذ لـ not_allowed', () => {
    const activity = toActivity(buildExperiment('not_allowed'));
    mockHub(activity);

    render(<StudentActivityHub lessonId="lesson-safety" onBackToLesson={vi.fn()} />);

    const card = within(screen.getByRole('article'));
    expect(card.getByRole('status')).toHaveTextContent('غير متاح للتنفيذ');
    expect(card.queryByRole('button')).not.toBeInTheDocument();
  });

  it('يعيد Host التحقق ويحجب not_allowed حتى عند تجاوز Hub', () => {
    const experiment = buildExperiment('not_allowed');
    const activity = toActivity(experiment);

    render(
      <StudentActivityHost
        activity={activity}
        objectivesById={new Map([[objective.id, objective]])}
        onBackToActivities={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('غير متاحة للتنفيذ');
    expect(screen.queryByText(experiment.steps[0])).not.toBeInTheDocument();
  });

  it('يمرر teacher_supervised عبر Host كعرض مقيد لا تنفيذ كامل', () => {
    const experiment = buildExperiment('teacher_supervised');
    const activity = toActivity(experiment);

    render(
      <StudentActivityHost
        activity={activity}
        objectivesById={new Map([[objective.id, objective]])}
        onBackToActivities={vi.fn()}
      />
    );

    expect(screen.getByRole('note')).toHaveTextContent('بإشراف المعلم فقط');
    expect(screen.getByText(experiment.tools[0])).toBeInTheDocument();
    expect(screen.queryByText(experiment.steps[0])).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
  });
});

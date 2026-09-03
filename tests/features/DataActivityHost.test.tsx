// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentActivityHost } from '@features/activities/StudentActivityHost';
import type { DataActivity } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';
import type { ScientificDataActivity } from '@shared-types/data-activity.types';

const content: ScientificDataActivity = {
  id: 'data-host-one',
  lessonId: 'lesson-one',
  title: 'نشاط بيانات داخل المضيف',
  instructions: 'حلل البيانات.',
  objectiveIds: ['objective-one'],
  config: {
    engineKind: 'data_graph_v1',
    context: 'سياق علمي.',
    presentation: {
      mode: 'table',
      xAxisLabel: 'x',
      yAxisLabel: 'y',
    },
    dataset: {
      x: { label: 'x', unit: '', values: [1, 2] },
      series: [{ id: 'y', label: 'y', unit: '', values: [2, 4] }],
    },
    tasks: [
      {
        id: 'read',
        prompt: 'ما قيمة y عند x=2؟',
        unit: '',
        rule: { kind: 'read_value', seriesId: 'y', pointIndex: 1 },
      },
    ],
  },
  status: 'approved',
  source: 'curriculum_seed',
};

const activity: DataActivity = {
  id: content.id,
  lessonId: content.lessonId,
  kind: 'data',
  title: content.title,
  objectiveIds: [...content.objectiveIds],
  status: content.status,
  source: content.source,
  content,
};

const objectivesById = new Map<string, Objective>([
  ['objective-one', { id: 'objective-one', lessonId: 'lesson-one', text: 'يحلل البيانات.' }],
]);

afterEach(cleanup);

describe('StudentActivityHost data integration', () => {
  it('يمرر Data عبر registry والrenderer العامين دون routing خاص في App أو LessonView', () => {
    const onBack = vi.fn();

    render(
      <StudentActivityHost
        activity={activity}
        objectivesById={objectivesById}
        onBackToActivities={onBack}
      />
    );

    expect(screen.getByRole('heading', { name: content.title })).toBeInTheDocument();
    expect(screen.getByText(content.config.context)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'جدول البيانات العلمية' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataActivityRunner } from '@features/data-activities/DataActivityRunner';
import type { ScientificDataActivity } from '@shared-types/data-activity.types';

const activity: ScientificDataActivity = {
  id: 'data-one',
  lessonId: 'lesson-one',
  title: 'تحليل بيانات تجريبية',
  instructions: 'اقرأ الجدول والرسم ثم أجب.',
  objectiveIds: ['objective-one'],
  config: {
    engineKind: 'data_graph_v1',
    context: 'تمثل القيم قياسات مأخوذة في تجربة واحدة.',
    presentation: {
      mode: 'table_and_line_graph',
      xAxisLabel: 'الزمن (s)',
      yAxisLabel: 'المسافة (m)',
    },
    dataset: {
      x: {
        label: 'الزمن',
        unit: 's',
        values: [1, 2, 4],
      },
      series: [
        {
          id: 'distance',
          label: 'المسافة',
          unit: 'm',
          values: [10, 20, 40],
        },
      ],
    },
    tasks: [
      {
        id: 'read-two',
        prompt: 'ما المسافة عند زمن 2 ثانية؟',
        unit: 'm',
        rule: {
          kind: 'read_value',
          seriesId: 'distance',
          pointIndex: 1,
        },
      },
      {
        id: 'difference',
        prompt: 'ما مقدار الفرق بين القياس الأول والثالث؟',
        unit: 'm',
        rule: {
          kind: 'difference',
          seriesId: 'distance',
          leftIndex: 0,
          rightIndex: 2,
          absolute: true,
        },
      },
    ],
  },
  status: 'approved',
  source: 'curriculum_seed',
};

afterEach(cleanup);

describe('DataActivityRunner', () => {
  it('يعرض السياق والجدول والرسم من نفس dataset ويحافظ على اتجاه x العلمي', () => {
    const { container } = render(<DataActivityRunner activity={activity} onBack={vi.fn()} />);

    expect(screen.getByRole('heading', { name: activity.title })).toBeInTheDocument();
    expect(screen.getByText(activity.config.context)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'جدول البيانات العلمية' })).toBeInTheDocument();

    const graph = screen.getByRole('img', {
      name: 'رسم خطي يوضح المسافة (m) حسب الزمن (s)',
    });
    expect(graph).toHaveStyle({ direction: 'ltr' });

    const points = Array.from(container.querySelectorAll('circle[data-series-id="distance"]')).map(
      (point) => Number(point.getAttribute('cx'))
    );

    expect(points).toHaveLength(3);
    expect(points[0]).toBeLessThan(points[1] ?? Number.NEGATIVE_INFINITY);
    expect(points[1]).toBeLessThan(points[2] ?? Number.NEGATIVE_INFINITY);
  });

  it('يعطي feedback حتميًا صحيحًا وخاطئًا دون كشف جواب مخفي', () => {
    render(<DataActivityRunner activity={activity} onBack={vi.fn()} />);

    const input = screen.getByLabelText('ما المسافة عند زمن 2 ثانية؟');
    const check = screen.getAllByRole('button', { name: 'تحقق من الإجابة' })[0];

    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(check);

    expect(screen.getByText('إجابة صحيحة.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '19' } });
    expect(screen.queryByText('إجابة صحيحة.')).not.toBeInTheDocument();

    fireEvent.click(check);
    expect(
      screen.getByText('الإجابة غير صحيحة. راجع البيانات وحاول مرة أخرى.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/القيمة الصحيحة/)).not.toBeInTheDocument();
  });

  it('يميز الإجابة الفارغة عن الإدخال غير الرقمي', () => {
    render(<DataActivityRunner activity={activity} onBack={vi.fn()} />);

    const buttons = screen.getAllByRole('button', { name: 'تحقق من الإجابة' });
    fireEvent.click(buttons[0]);
    expect(screen.getByText('أدخل إجابة أولًا.')).toBeInTheDocument();

    const input = screen.getByLabelText('ما المسافة عند زمن 2 ثانية؟');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(buttons[0]);

    expect(screen.getByText('أدخل قيمة رقمية صالحة باستخدام الأرقام 0-9.')).toBeInTheDocument();
  });

  it('يحترم presentation mode دون إنشاء نسخة ثانية من البيانات', () => {
    const tableOnly: ScientificDataActivity = {
      ...activity,
      config: {
        ...activity.config,
        presentation: {
          ...activity.config.presentation,
          mode: 'table',
        },
      },
    };

    render(<DataActivityRunner activity={tableOnly} onBack={vi.fn()} />);

    expect(screen.getByRole('table', { name: 'جدول البيانات العلمية' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('يعيد state التفاعلي عند unmount/remount لأنه session-only', () => {
    const firstRender = render(<DataActivityRunner activity={activity} onBack={vi.fn()} />);

    const input = screen.getByLabelText('ما المسافة عند زمن 2 ثانية؟');
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'تحقق من الإجابة' })[0]);

    expect(input).toHaveValue('20');
    expect(screen.getByText('إجابة صحيحة.')).toBeInTheDocument();

    firstRender.unmount();

    render(<DataActivityRunner activity={activity} onBack={vi.fn()} />);

    expect(screen.getByLabelText('ما المسافة عند زمن 2 ثانية؟')).toHaveValue('');
    expect(screen.queryByText('إجابة صحيحة.')).not.toBeInTheDocument();
  });

  it('ينفذ العودة إلى قائمة الأنشطة', () => {
    const onBack = vi.fn();
    render(<DataActivityRunner activity={activity} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

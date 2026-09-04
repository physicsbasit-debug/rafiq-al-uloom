// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { TeacherDataActivityFormFields } from '@features/teacher/workspace/TeacherDataActivityFormFields';
import {
  createEmptyTeacherDataActivityForm,
  type TeacherDataActivityForm,
} from '@features/teacher/workspace/teacher-data-activity-form';

function form(): TeacherDataActivityForm {
  return {
    ...createEmptyTeacherDataActivityForm(),
    context: 'سياق',
    xAxisLabel: 'التردد',
    yAxisLabel: 'الطول الموجي',
    xLabel: 'التردد',
    xUnit: 'Hz',
    xValuesText: '1\n2\n3',
    series: [
      {
        id: 'series-1',
        label: 'الطول الموجي',
        unit: 'm',
        valuesText: '12\n6\n4',
      },
    ],
    tasks: [
      {
        id: 'task-1',
        prompt: 'اقرأ القيمة.',
        unit: 'm',
        toleranceText: '',
        kind: 'read_value',
        seriesId: 'series-1',
        pointIndexText: '1',
        leftIndexText: '',
        rightIndexText: '',
        absolute: true,
        pointIndicesText: '',
      },
    ],
  };
}

describe('TeacherDataActivityFormFields', () => {
  it('يحدّث قيم المحور دون أي حفظ خارجي', () => {
    const onChange = vi.fn();

    render(<TeacherDataActivityFormFields form={form()} disabled={false} onChange={onChange} />);

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'قيم المحور x',
      }),
      {
        target: {
          value: '1\n2\n4',
        },
      }
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        xValuesText: '1\n2\n4',
      })
    );
  });

  it('يحدّث سلسلة رقمية مع الحفاظ على معرفها البنيوي', () => {
    const onChange = vi.fn();

    render(<TeacherDataActivityFormFields form={form()} disabled={false} onChange={onChange} />);

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'اسم السلسلة 1',
      }),
      {
        target: {
          value: 'سرعة الموجة',
        },
      }
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        series: [
          expect.objectContaining({
            id: 'series-1',
            label: 'سرعة الموجة',
          }),
        ],
      })
    );
  });

  it('يغيّر نوع المهمة إلى difference دون إنشاء formula حرة', () => {
    const onChange = vi.fn();

    render(<TeacherDataActivityFormFields form={form()} disabled={false} onChange={onChange} />);

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'نوع المهمة 1',
      }),
      {
        target: {
          value: 'difference',
        },
      }
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: [
          expect.objectContaining({
            id: 'task-1',
            kind: 'difference',
          }),
        ],
      })
    );
  });

  it('لا يعيد ربط المهام صامتًا عند حذف السلسلة', () => {
    const onChange = vi.fn();

    render(<TeacherDataActivityFormFields form={form()} disabled={false} onChange={onChange} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف السلسلة 1',
      })
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        series: [],
        tasks: [
          expect.objectContaining({
            seriesId: 'series-1',
          }),
        ],
      })
    );
  });
});

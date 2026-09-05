// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherExperimentsEditor } from '@features/teacher/workspace/TeacherExperimentsEditor';

describe('TeacherExperimentsEditor multiline Form Buffer', () => {
  it('يحافظ على السطر الجديد أثناء الكتابة ولا يطبّع النص قبل تطبيق التجربة', () => {
    const onChange = vi.fn();

    render(
      <TeacherExperimentsEditor
        experiments={[]}
        objectives={[]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة تجربة',
      })
    );

    const steps = screen.getByRole('textbox', {
      name: 'خطوات التجربة',
    });

    fireEvent.change(steps, {
      target: {
        value: 'الخطوة الأولى\n',
      },
    });

    expect(steps).toHaveValue('الخطوة الأولى\n');

    fireEvent.change(steps, {
      target: {
        value: 'الخطوة الأولى\nالخطوة الثانية',
      },
    });

    expect(steps).toHaveValue('الخطوة الأولى\nالخطوة الثانية');

    expect(onChange).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { TeacherSimulationsEditor } from '@features/teacher/workspace/TeacherSimulationsEditor';
import type { LessonRevisionPayload } from '@services/authoring';

const objective = {
  key: 'objective-a',
  text: 'يفسر خصائص الموجة',
} as const;

type SimulationDraft = LessonRevisionPayload['simulations'][number];

const simulation: SimulationDraft = {
  key: 'teacher-simulation-1',
  title: 'محاكاة خصائص الموجة',
  instructions: 'غيّر التردد والسعة ولاحظ النتيجة.',
  objectiveKeys: ['objective-a'],
  config: {
    engineKind: 'transverse_wave_v1',
    mediumSpeedMps: 12,
    frequencyHz: {
      min: 0.5,
      max: 4,
      step: 0.5,
      initial: 1,
    },
    amplitudeM: {
      min: 0.2,
      max: 1,
      step: 0.1,
      initial: 0.5,
    },
  },
};

describe('TeacherSimulationsEditor', () => {
  it('يبقي المحاكاة في Form Buffer حتى تطبيقها', () => {
    const onChange = vi.fn();

    render(
      <TeacherSimulationsEditor
        simulations={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة محاكاة',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان المحاكاة',
      }),
      {
        target: {
          value: 'محاكاة جديدة',
        },
      }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ينشئ محاكاة صحيحة ويربطها بالهدف', () => {
    const onChange = vi.fn();

    render(
      <TeacherSimulationsEditor
        simulations={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة محاكاة',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان المحاكاة',
      }),
      {
        target: {
          value: ' محاكاة موجة ',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'تعليمات المحاكاة',
      }),
      {
        target: {
          value: ' غيّر القيم ولاحظ ',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: objective.text,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة المحاكاة',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        key: 'teacher-simulation-1',
        title: 'محاكاة موجة',
        instructions: 'غيّر القيم ولاحظ',
        objectiveKeys: ['objective-a'],
        config: {
          engineKind: 'transverse_wave_v1',
          mediumSpeedMps: 12,
          frequencyHz: {
            min: 0.5,
            max: 4,
            step: 0.5,
            initial: 1,
          },
          amplitudeM: {
            min: 0.2,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        },
      },
    ]);
  });

  it('يرفض مدى تردد غير صالح وفق parser الإنتاجي', () => {
    const onChange = vi.fn();

    render(
      <TeacherSimulationsEditor
        simulations={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة محاكاة',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان المحاكاة',
      }),
      {
        target: {
          value: 'محاكاة',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'تعليمات المحاكاة',
      }),
      {
        target: {
          value: 'غيّر القيم',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'أقل تردد',
      }),
      {
        target: {
          value: '5',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'أعلى تردد',
      }),
      {
        target: {
          value: '4',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة المحاكاة',
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent('تحقق من إعدادات المحاكاة الرقمية');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('يحافظ على مفتاح المحاكاة عند التعديل', () => {
    const onChange = vi.fn();

    render(
      <TeacherSimulationsEditor
        simulations={[simulation]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل المحاكاة 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان المحاكاة',
      }),
      {
        target: {
          value: 'محاكاة معدلة',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل المحاكاة',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        ...simulation,
        title: 'محاكاة معدلة',
      },
    ]);
  });

  it('يحذف المحاكاة المحددة فقط', () => {
    const onChange = vi.fn();

    render(
      <TeacherSimulationsEditor
        simulations={[simulation]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف المحاكاة 1',
      })
    );

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

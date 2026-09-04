// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherExperimentsEditor } from '@features/teacher/workspace/TeacherExperimentsEditor';
import type { LessonRevisionPayload } from '@services/authoring';

const objective = {
  key: 'objective-a',
  text: 'يصف حركة الموجة',
} as const;

type ExperimentDraft = LessonRevisionPayload['experiments'][number];

const experiment: ExperimentDraft = {
  key: 'teacher-experiment-1',
  title: 'موجة في حبل',
  objective: 'ملاحظة انتقال الموجة',
  objectiveKeys: ['objective-a'],
  tools: ['حبل'],
  steps: ['حرّك أحد طرفي الحبل'],
  safetyNotes: ['اترك مساحة كافية'],
  safetyLevel: 'teacher_supervised',
  observationPrompt: 'ماذا تلاحظ؟',
  conclusionPrompt: 'ماذا تستنتج؟',
  homeAlternative: null,
};

describe('TeacherExperimentsEditor', () => {
  it('يبقي التجربة الجديدة في Form Buffer حتى تطبيقها', () => {
    const onChange = vi.fn();

    render(
      <TeacherExperimentsEditor
        experiments={[]}
        objectives={[objective]}
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

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان التجربة',
      }),
      {
        target: { value: 'تجربة جديدة' },
      }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ينشئ تجربة مكتملة ويربطها بالهدف', () => {
    const onChange = vi.fn();

    render(
      <TeacherExperimentsEditor
        experiments={[]}
        objectives={[objective]}
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

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان التجربة',
      }),
      {
        target: { value: ' موجة بالحبل ' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'الهدف الوصفي للتجربة',
      }),
      {
        target: {
          value: ' ملاحظة انتقال الموجة ',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'خطوات التجربة',
      }),
      {
        target: {
          value: ' حرّك الحبل ',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'سؤال الملاحظة',
      }),
      {
        target: {
          value: ' ماذا تلاحظ؟ ',
        },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'سؤال الاستنتاج',
      }),
      {
        target: {
          value: ' ماذا تستنتج؟ ',
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
        name: 'إضافة التجربة',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        key: 'teacher-experiment-1',
        title: 'موجة بالحبل',
        objective: 'ملاحظة انتقال الموجة',
        objectiveKeys: ['objective-a'],
        tools: [],
        steps: ['حرّك الحبل'],
        safetyNotes: [],
        safetyLevel: 'teacher_supervised',
        observationPrompt: 'ماذا تلاحظ؟',
        conclusionPrompt: 'ماذا تستنتج؟',
        homeAlternative: null,
      },
    ]);
  });

  it('يرفض التجربة التي لا تحتوي خطوة صالحة', () => {
    const onChange = vi.fn();

    render(
      <TeacherExperimentsEditor
        experiments={[]}
        objectives={[objective]}
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

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان التجربة',
      }),
      {
        target: { value: 'تجربة' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'الهدف الوصفي للتجربة',
      }),
      {
        target: { value: 'هدف' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'سؤال الملاحظة',
      }),
      {
        target: { value: 'ملاحظة؟' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'سؤال الاستنتاج',
      }),
      {
        target: { value: 'استنتاج؟' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة التجربة',
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent('أضف خطوة تنفيذ واحدة');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('يحافظ على مفتاح التجربة عند التعديل', () => {
    const onChange = vi.fn();

    render(
      <TeacherExperimentsEditor
        experiments={[experiment]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل التجربة 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان التجربة',
      }),
      {
        target: {
          value: 'موجة في حبل معدل',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل التجربة',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        ...experiment,
        title: 'موجة في حبل معدل',
      },
    ]);
  });

  it('يحذف التجربة المحددة فقط', () => {
    const onChange = vi.fn();

    render(
      <TeacherExperimentsEditor
        experiments={[experiment]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف التجربة 1',
      })
    );

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

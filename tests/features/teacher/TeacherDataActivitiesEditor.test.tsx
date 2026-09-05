// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { TeacherDataActivitiesEditor } from '@features/teacher/workspace/TeacherDataActivitiesEditor';
import type { LessonRevisionPayload } from '@services/authoring';

type DataActivityDraft = LessonRevisionPayload['dataActivities'][number];

const objectives = [
  {
    key: 'objective-a',
    text: 'يحلل العلاقة بين التردد والطول الموجي',
  },
];

const existingActivity: DataActivityDraft = {
  key: 'teacher-data-activity-1',
  title: 'تحليل بيانات الموجة',
  instructions: 'اقرأ الجدول والرسم ثم أجب.',
  objectiveKeys: ['objective-a'],
  config: {
    engineKind: 'data_graph_v1',
    context: 'موجات تتحرك في وسط ثابت السرعة.',
    presentation: {
      mode: 'table_and_line_graph',
      xAxisLabel: 'التردد (Hz)',
      yAxisLabel: 'الطول الموجي (m)',
    },
    dataset: {
      x: {
        label: 'التردد',
        unit: 'Hz',
        values: [1, 2, 3],
      },
      series: [
        {
          id: 'wavelength',
          label: 'الطول الموجي',
          unit: 'm',
          values: [12, 6, 4],
        },
      ],
    },
    tasks: [
      {
        id: 'read-1',
        prompt: 'اقرأ القيمة الثانية.',
        unit: 'm',
        rule: {
          kind: 'read_value',
          seriesId: 'wavelength',
          pointIndex: 1,
        },
      },
    ],
  },
};

function renderEditor(dataActivities: readonly DataActivityDraft[] = [], onChange = vi.fn()) {
  render(
    <TeacherDataActivitiesEditor
      dataActivities={dataActivities}
      objectives={objectives}
      readOnly={false}
      disabled={false}
      onChange={onChange}
    />
  );

  return onChange;
}

function openAndCompleteNewActivity() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'إضافة نشاط بيانات',
    })
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'عنوان نشاط البيانات',
    }),
    {
      target: {
        value: 'نشاط جديد',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'تعليمات نشاط البيانات',
    }),
    {
      target: {
        value: 'اقرأ البيانات ثم أجب.',
      },
    }
  );

  fireEvent.click(
    screen.getByRole('button', {
      name: objectives[0]!.text,
    })
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'سياق نشاط البيانات',
    }),
    {
      target: {
        value: 'سياق علمي منظم.',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'تسمية محور x',
    }),
    {
      target: {
        value: 'الزمن',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'تسمية محور y',
    }),
    {
      target: {
        value: 'المسافة',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'اسم متغير المحور x',
    }),
    {
      target: {
        value: 'الزمن',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'وحدة المحور x',
    }),
    {
      target: {
        value: 's',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'قيم المحور x',
    }),
    {
      target: {
        value: '1\n2\n3',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'اسم السلسلة 1',
    }),
    {
      target: {
        value: 'المسافة',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'وحدة السلسلة 1',
    }),
    {
      target: {
        value: 'm',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'قيم السلسلة 1',
    }),
    {
      target: {
        value: '2\n4\n6',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('combobox', {
      name: 'سلسلة المهمة 1',
    }),
    {
      target: {
        value: 'series-1',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'نص المهمة 1',
    }),
    {
      target: {
        value: 'اقرأ المسافة الثانية.',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'وحدة المهمة 1',
    }),
    {
      target: {
        value: 'm',
      },
    }
  );

  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'فهرس قراءة المهمة 1',
    }),
    {
      target: {
        value: '1',
      },
    }
  );
}

describe('TeacherDataActivitiesEditor', () => {
  it('يبقي النشاط الجديد داخل Form Buffer حتى تطبيقه', () => {
    const onChange = renderEditor();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة نشاط بيانات',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان نشاط البيانات',
      }),
      {
        target: {
          value: 'نشاط مؤقت',
        },
      }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ينشئ نشاط بيانات صالحًا ويربطه بالهدف المختار', () => {
    const onChange = renderEditor();

    openAndCompleteNewActivity();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تطبيق نشاط البيانات',
      })
    );

    expect(onChange).toHaveBeenCalledTimes(1);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        key: 'teacher-data-activity-1',
        title: 'نشاط جديد',
        objectiveKeys: ['objective-a'],
        config: expect.objectContaining({
          engineKind: 'data_graph_v1',
          dataset: expect.objectContaining({
            x: expect.objectContaining({
              values: [1, 2, 3],
            }),
            series: [
              expect.objectContaining({
                id: 'series-1',
                values: [2, 4, 6],
              }),
            ],
          }),
        }),
      }),
    ]);
  });

  it('يرفض تطبيق نشاط ذي محور x غير متزايد', () => {
    const onChange = renderEditor();

    openAndCompleteNewActivity();

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'قيم المحور x',
      }),
      {
        target: {
          value: '1\n1\n3',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تطبيق نشاط البيانات',
      })
    );

    expect(onChange).not.toHaveBeenCalled();

    expect(screen.getByRole('alert')).toHaveTextContent('تحقق من بنية البيانات');
  });

  it('يحافظ على key عند تعديل نشاط موجود', () => {
    const onChange = renderEditor([existingActivity]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل نشاط البيانات 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان نشاط البيانات',
      }),
      {
        target: {
          value: 'تحليل بيانات معدل',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تطبيق نشاط البيانات',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        key: 'teacher-data-activity-1',
        title: 'تحليل بيانات معدل',
      }),
    ]);
  });

  it('يحذف النشاط المطلوب فقط', () => {
    const secondActivity = {
      ...existingActivity,
      key: 'teacher-data-activity-2',
      title: 'نشاط ثان',
    };

    const onChange = renderEditor([existingActivity, secondActivity]);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف نشاط البيانات 1',
      })
    );

    expect(onChange).toHaveBeenCalledWith([secondActivity]);
  });
});

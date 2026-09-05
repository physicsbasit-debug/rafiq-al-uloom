import { describe, expect, it } from 'vitest';

import {
  buildTeacherDataActivityDraft,
  createEmptyTeacherDataActivityForm,
  createTeacherDataSeriesForm,
  createTeacherDataTaskForm,
  teacherDataActivityFormFromDraft,
} from '@features/teacher/workspace/teacher-data-activity-form';

import type { LessonRevisionPayload } from '@services/authoring';

type DataActivityDraft = LessonRevisionPayload['dataActivities'][number];

const activity: DataActivityDraft = {
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
        values: [1, 2, 3, 4],
      },
      series: [
        {
          id: 'wavelength',
          label: 'الطول الموجي',
          unit: 'm',
          values: [12, 6, 4, 3],
        },
      ],
    },
    tasks: [
      {
        id: 'read-1',
        prompt: 'اقرأ القيمة عند النقطة الثانية.',
        unit: 'm',
        rule: {
          kind: 'read_value',
          seriesId: 'wavelength',
          pointIndex: 1,
        },
      },
      {
        id: 'difference-1',
        prompt: 'احسب الفرق بين أول قيمتين.',
        unit: 'm',
        tolerance: 0.01,
        rule: {
          kind: 'difference',
          seriesId: 'wavelength',
          leftIndex: 0,
          rightIndex: 1,
          absolute: true,
        },
      },
      {
        id: 'mean-1',
        prompt: 'احسب متوسط أول ثلاث قيم.',
        unit: 'm',
        rule: {
          kind: 'mean',
          seriesId: 'wavelength',
          pointIndices: [0, 1, 2],
        },
      },
    ],
  },
};

describe('Phase 5-5D2-C structured Data Activity form', () => {
  it('ينشئ Form Buffer ابتدائيًا منظمًا دون JSON خام', () => {
    const form = createEmptyTeacherDataActivityForm();

    expect(form.presentationMode).toBe('table_and_line_graph');

    expect(form.series).toEqual([
      {
        id: 'series-1',
        label: '',
        unit: '',
        valuesText: '',
      },
    ]);

    expect(form.tasks[0]).toMatchObject({
      id: 'task-1',
      kind: 'read_value',
    });
  });

  it('ينشئ معرفات series وtask تصاعديًا دون إعادة استخدام الفجوات', () => {
    expect(createTeacherDataSeriesForm(['series-1', 'series-3', 'wavelength']).id).toBe('series-4');

    expect(createTeacherDataTaskForm('mean', ['task-1', 'task-4'])).toMatchObject({
      id: 'task-5',
      kind: 'mean',
    });
  });

  it('يحوّل النشاط الكامل إلى Form Buffer ثم يعيده إلى العقد نفسه', () => {
    const form = teacherDataActivityFormFromDraft(activity);

    const result = buildTeacherDataActivityDraft(form);

    expect(result).toEqual({
      valid: true,
      dataActivity: {
        title: activity.title,
        instructions: activity.instructions,
        objectiveKeys: ['objective-a'],
        config: activity.config,
      },
    });
  });

  it('يرفض قيمة عددية غير صالحة قبل تكوين config', () => {
    const form = teacherDataActivityFormFromDraft(activity);

    const result = buildTeacherDataActivityDraft({
      ...form,
      xValuesText: '1\n2\nقيمة غير رقمية\n4',
    });

    expect(result).toEqual({
      valid: false,
      reason: 'invalid_numeric_input',
    });
  });

  it('يرفض فهرس مهمة غير صحيح قبل parser الإنتاجي', () => {
    const form = teacherDataActivityFormFromDraft(activity);

    const firstTask = form.tasks[0];

    if (!firstTask) {
      throw new Error('Expected first task');
    }

    const result = buildTeacherDataActivityDraft({
      ...form,
      tasks: [
        {
          ...firstTask,
          pointIndexText: '1.5',
        },
      ],
    });

    expect(result).toEqual({
      valid: false,
      reason: 'invalid_numeric_input',
    });
  });

  it('يمرر المراجع البنيوية الخاطئة إلى validator الإنتاجي', () => {
    const form = teacherDataActivityFormFromDraft(activity);

    const firstTask = form.tasks[0];

    if (!firstTask) {
      throw new Error('Expected first task');
    }

    const result = buildTeacherDataActivityDraft({
      ...form,
      tasks: [
        {
          ...firstTask,
          seriesId: 'missing-series',
        },
      ],
    });

    expect(result).toEqual({
      valid: false,
      reason: 'invalid_config',
    });
  });
});

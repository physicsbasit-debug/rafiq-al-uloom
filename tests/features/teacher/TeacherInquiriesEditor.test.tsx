// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { TeacherInquiriesEditor } from '@features/teacher/workspace/TeacherInquiriesEditor';
import type { LessonRevisionPayload } from '@services/authoring';

const objective = {
  key: 'objective-a',
  text: 'يفسر انعكاس الموجات',
} as const;

type InquiryDraft = LessonRevisionPayload['inquiries'][number];

const inquiry: InquiryDraft = {
  key: 'teacher-inquiry-1',
  title: 'استقصاء انعكاس الموجة',
  instructions: 'اقرأ الموقف وأجب عن الأسئلة.',
  objectiveKeys: ['objective-a'],
  context: 'تتحرك موجة على حبل نحو حاجز ثابت.',
  drivingQuestion: 'ماذا يحدث للموجة عند وصولها إلى الحاجز؟',
  hypothesisPrompt: 'اكتب فرضية قبل الملاحظة.',
  observationPrompt: 'دوّن ما تلاحظه.',
  conclusionPrompt: 'اكتب استنتاجك العلمي.',
};

describe('TeacherInquiriesEditor', () => {
  it('يبقي الاستقصاء في Form Buffer حتى تطبيقه', () => {
    const onChange = vi.fn();

    render(
      <TeacherInquiriesEditor
        inquiries={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة نشاط استقصاء',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان الاستقصاء',
      }),
      {
        target: {
          value: 'استقصاء جديد',
        },
      }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ينشئ استقصاء مكتملًا ويربطه بالهدف', () => {
    const onChange = vi.fn();

    render(
      <TeacherInquiriesEditor
        inquiries={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة نشاط استقصاء',
      })
    );

    const fields = [
      ['عنوان الاستقصاء', ' استقصاء الموجة '],
      ['تعليمات الاستقصاء', ' اقرأ ثم أجب '],
      ['السياق العلمي', ' موجة تتجه نحو حاجز '],
      ['السؤال المحوري', ' ماذا يحدث للموجة؟ '],
      ['موجه الفرضية', ' اكتب فرضيتك '],
      ['موجه الملاحظة', ' دوّن ما تلاحظه '],
      ['موجه الاستنتاج', ' اكتب استنتاجك '],
    ] as const;

    for (const [name, value] of fields) {
      fireEvent.change(
        screen.getByRole('textbox', {
          name,
        }),
        {
          target: { value },
        }
      );
    }

    fireEvent.click(
      screen.getByRole('button', {
        name: objective.text,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة الاستقصاء',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        key: 'teacher-inquiry-1',
        title: 'استقصاء الموجة',
        instructions: 'اقرأ ثم أجب',
        objectiveKeys: ['objective-a'],
        context: 'موجة تتجه نحو حاجز',
        drivingQuestion: 'ماذا يحدث للموجة؟',
        hypothesisPrompt: 'اكتب فرضيتك',
        observationPrompt: 'دوّن ما تلاحظه',
        conclusionPrompt: 'اكتب استنتاجك',
      },
    ]);
  });

  it('يرفض الاستقصاء دون سؤال محوري', () => {
    const onChange = vi.fn();

    render(
      <TeacherInquiriesEditor
        inquiries={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة نشاط استقصاء',
      })
    );

    const fields = [
      ['عنوان الاستقصاء', 'استقصاء'],
      ['تعليمات الاستقصاء', 'نفذ المهمة'],
      ['السياق العلمي', 'سياق علمي'],
      ['موجه الفرضية', 'اكتب فرضيتك'],
      ['موجه الملاحظة', 'دوّن ملاحظتك'],
      ['موجه الاستنتاج', 'اكتب استنتاجك'],
    ] as const;

    for (const [name, value] of fields) {
      fireEvent.change(
        screen.getByRole('textbox', {
          name,
        }),
        {
          target: { value },
        }
      );
    }

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة الاستقصاء',
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent('اكتب السؤال المحوري');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('يحافظ على مفتاح الاستقصاء عند التعديل', () => {
    const onChange = vi.fn();

    render(
      <TeacherInquiriesEditor
        inquiries={[inquiry]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل الاستقصاء 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان الاستقصاء',
      }),
      {
        target: {
          value: 'استقصاء انعكاس الموجة المعدل',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل الاستقصاء',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        ...inquiry,
        title: 'استقصاء انعكاس الموجة المعدل',
      },
    ]);
  });

  it('يحذف الاستقصاء المحدد فقط', () => {
    const onChange = vi.fn();

    render(
      <TeacherInquiriesEditor
        inquiries={[inquiry]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف الاستقصاء 1',
      })
    );

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

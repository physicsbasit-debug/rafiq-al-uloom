// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherMatchingGamesEditor } from '@features/teacher/workspace/TeacherMatchingGamesEditor';
import type { LessonRevisionPayload } from '@services/authoring';

const objective = {
  key: 'objective-a',
  text: 'يفسر خصائص الموجات',
} as const;

type GameDraft = LessonRevisionPayload['games'][number];

const game: GameDraft = {
  key: 'teacher-game-1',
  type: 'matching',
  title: 'مطابقة الكميات',
  instructions: 'طابق الكمية بوحدتها.',
  items: [
    { left: 'التردد', right: 'Hz' },
    { left: 'الطول الموجي', right: 'm' },
  ],
  objectiveKeys: ['objective-a'],
};

describe('TeacherMatchingGamesEditor', () => {
  it('يبقي اللعبة الجديدة في Form Buffer حتى تطبيقها', () => {
    const onChange = vi.fn();

    render(
      <TeacherMatchingGamesEditor
        games={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة لعبة مطابقة',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان اللعبة',
      }),
      {
        target: { value: 'لعبة جديدة' },
      }
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ينشئ اللعبة بمفتاح داخلي ويطبق اختيار الهدف', () => {
    const onChange = vi.fn();

    render(
      <TeacherMatchingGamesEditor
        games={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة لعبة مطابقة',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان اللعبة',
      }),
      {
        target: { value: ' مطابقة ' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'تعليمات اللعبة',
      }),
      {
        target: { value: ' طابق ' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'الطرف الأول 1',
      }),
      {
        target: { value: 'التردد' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'الطرف المقابل 1',
      }),
      {
        target: { value: 'Hz' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'الطرف الأول 2',
      }),
      {
        target: { value: 'الطول الموجي' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'الطرف المقابل 2',
      }),
      {
        target: { value: 'm' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: objective.text,
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة اللعبة',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        key: 'teacher-game-1',
        type: 'matching',
        title: 'مطابقة',
        instructions: 'طابق',
        items: [
          {
            left: 'التردد',
            right: 'Hz',
          },
          {
            left: 'الطول الموجي',
            right: 'm',
          },
        ],
        objectiveKeys: ['objective-a'],
      },
    ]);
  });

  it('يرفض تطبيق لعبة تحتوي زوجًا ناقصًا', () => {
    const onChange = vi.fn();

    render(
      <TeacherMatchingGamesEditor
        games={[]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة لعبة مطابقة',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان اللعبة',
      }),
      {
        target: { value: 'لعبة' },
      }
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'تعليمات اللعبة',
      }),
      {
        target: { value: 'تعليمات' },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'إضافة اللعبة',
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent('أكمل طرفي كل زوج');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('يحافظ على مفتاح اللعبة عند التعديل', () => {
    const onChange = vi.fn();

    render(
      <TeacherMatchingGamesEditor
        games={[game]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'تعديل اللعبة 1',
      })
    );

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'عنوان اللعبة',
      }),
      {
        target: {
          value: 'مطابقة معدلة',
        },
      }
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ تعديل اللعبة',
      })
    );

    expect(onChange).toHaveBeenCalledWith([
      {
        ...game,
        title: 'مطابقة معدلة',
      },
    ]);
  });

  it('يحذف اللعبة المحددة فقط', () => {
    const onChange = vi.fn();

    render(
      <TeacherMatchingGamesEditor
        games={[game]}
        objectives={[objective]}
        readOnly={false}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف اللعبة 1',
      })
    );

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

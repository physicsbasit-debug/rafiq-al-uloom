// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonList } from '@features/student/lesson-list/LessonList';
import { useLessonsByUnit } from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useLessonsByUnit: vi.fn(),
}));

const mockedUseLessonsByUnit = vi.mocked(useLessonsByUnit);

const lessons = [
  {
    id: 'lesson-waves-properties',
    unitId: 'unit-waves',
    title: 'خصائص الموجات',
    order: 1,
  },
  {
    id: 'lesson-wave-speed',
    unitId: 'unit-waves',
    title: 'سرعة الموجة',
    order: 2,
  },
] as unknown as NonNullable<ReturnType<typeof useLessonsByUnit>['data']>;

beforeEach(() => {
  mockedUseLessonsByUnit.mockReset();
});

describe('LessonList', () => {
  it('يستدعي useLessonsByUnit بالـunitId الصحيح', () => {
    mockedUseLessonsByUnit.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    expect(mockedUseLessonsByUnit).toHaveBeenCalledWith('unit-waves');
  });

  it('يعرض حالة التحميل', () => {
    mockedUseLessonsByUnit.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة الخطأ', () => {
    mockedUseLessonsByUnit.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الدروس.' },
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الدروس.');
  });

  it('يربط إعادة المحاولة بدالة reload', () => {
    const reload = vi.fn();

    mockedUseLessonsByUnit.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الدروس.' },
      reload,
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض الدروس بالترتيب الذي يعيده hook', () => {
    mockedUseLessonsByUnit.mockReturnValue({
      data: lessons,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    const cards = screen.getAllByRole('button');

    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('خصائص الموجات');
    expect(cards[1]).toHaveTextContent('سرعة الموجة');
  });

  it('يحافظ على عنوان الدرس وترتيبه', () => {
    mockedUseLessonsByUnit.mockReturnValue({
      data: lessons,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'خصائص الموجات' })).toHaveTextContent(
      'الدرس 1',
    );
    expect(screen.getByRole('button', { name: 'سرعة الموجة' })).toHaveTextContent(
      'الدرس 2',
    );
  });

  it('يمرر lesson.id نفسه عند اختيار البطاقة', () => {
    const onSelectLesson = vi.fn();

    mockedUseLessonsByUnit.mockReturnValue({
      data: lessons,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={onSelectLesson} />);

    fireEvent.click(screen.getByRole('button', { name: 'سرعة الموجة' }));

    expect(onSelectLesson).toHaveBeenCalledTimes(1);
    expect(onSelectLesson).toHaveBeenCalledWith('lesson-wave-speed');
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Grade } from '@shared-types/content.types';
import { GradeSelection } from '@features/student/grade-selection/GradeSelection';
import { useGrades } from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useGrades: vi.fn(),
}));

const mockedUseGrades = vi.mocked(useGrades);

const grades: Grade[] = [
  {
    id: 'grade-10',
    name: 'الصف العاشر',
    order: 1,
  },
  {
    id: 'grade-11',
    name: 'الصف الحادي عشر',
    order: 2,
  },
];

beforeEach(() => {
  mockedUseGrades.mockReset();
});

describe('GradeSelection', () => {
  it('يعرض حالة التحميل من useGrades', () => {
    mockedUseGrades.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<GradeSelection onSelectGrade={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
    expect(screen.queryByText('اختر الصف')).not.toBeInTheDocument();
  });

  it('يعرض حالة الخطأ من useGrades', () => {
    mockedUseGrades.mockReturnValue({
      data: [],
      isLoading: false,
      error: {
        message: 'تعذر تحميل الصفوف.',
      },
      reload: vi.fn(),
    });

    render(<GradeSelection onSelectGrade={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الصفوف.');
  });

  it('يربط زر إعادة المحاولة بدالة reload نفسها', () => {
    const reload = vi.fn();

    mockedUseGrades.mockReturnValue({
      data: [],
      isLoading: false,
      error: {
        message: 'تعذر تحميل الصفوف.',
      },
      reload,
    });

    render(<GradeSelection onSelectGrade={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض الصفوف بالترتيب الذي يعيده useGrades', () => {
    mockedUseGrades.mockReturnValue({
      data: grades,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<GradeSelection onSelectGrade={vi.fn()} />);

    const cards = screen.getAllByRole('button');

    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('الصف العاشر');
    expect(cards[1]).toHaveTextContent('الصف الحادي عشر');
  });

  it('يمرر grade.id نفسه عند اختيار البطاقة', () => {
    const onSelectGrade = vi.fn();

    mockedUseGrades.mockReturnValue({
      data: grades,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<GradeSelection onSelectGrade={onSelectGrade} />);

    fireEvent.click(screen.getByRole('button', { name: 'الصف الحادي عشر' }));

    expect(onSelectGrade).toHaveBeenCalledTimes(1);
    expect(onSelectGrade).toHaveBeenCalledWith('grade-11');
  });

  it('يعرض حالة نجاح بلا بطاقات عندما تكون البيانات فارغة', () => {
    mockedUseGrades.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<GradeSelection onSelectGrade={vi.fn()} />);

    expect(screen.getByText('اختر الصف')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

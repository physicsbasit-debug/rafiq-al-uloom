// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SemesterSelection } from '@features/student/semester-selection/SemesterSelection';
import { useSemestersByGrade } from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useSemestersByGrade: vi.fn(),
}));

const mockedUseSemestersByGrade = vi.mocked(useSemestersByGrade);

const semesters = [
  { id: 'semester-1', name: 'الفصل الدراسي الأول', gradeId: 'grade-10', order: 1 },
  { id: 'semester-2', name: 'الفصل الدراسي الثاني', gradeId: 'grade-10', order: 2 },
] as ReturnType<typeof useSemestersByGrade>['data'];

beforeEach(() => {
  mockedUseSemestersByGrade.mockReset();
});

describe('SemesterSelection', () => {
  it('يستدعي useSemestersByGrade بالـgradeId الصحيح', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="grade-10" onSelectSemester={vi.fn()} />);

    expect(mockedUseSemestersByGrade).toHaveBeenCalledWith('grade-10');
  });

  it('يعرض حالة التحميل', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="grade-10" onSelectSemester={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة الخطأ', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الفصول.' },
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="grade-10" onSelectSemester={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الفصول.');
  });

  it('يربط إعادة المحاولة بدالة reload', () => {
    const reload = vi.fn();

    mockedUseSemestersByGrade.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الفصول.' },
      reload,
    });

    render(<SemesterSelection gradeId="grade-10" onSelectSemester={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض الفصول بالترتيب الذي يعيده hook', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: semesters,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="grade-10" onSelectSemester={vi.fn()} />);

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('الفصل الدراسي الأول');
    expect(cards[1]).toHaveTextContent('الفصل الدراسي الثاني');
  });

  it('يمرر semester.id نفسه عند اختيار البطاقة', () => {
    const onSelectSemester = vi.fn();

    mockedUseSemestersByGrade.mockReturnValue({
      data: semesters,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="grade-10" onSelectSemester={onSelectSemester} />);
    fireEvent.click(screen.getByRole('button', { name: 'الفصل الدراسي الثاني' }));

    expect(onSelectSemester).toHaveBeenCalledTimes(1);
    expect(onSelectSemester).toHaveBeenCalledWith('semester-2');
  });
});

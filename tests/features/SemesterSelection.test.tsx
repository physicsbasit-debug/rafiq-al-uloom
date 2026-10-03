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
  { id: 'g10-sem1', name: 'الفصل الدراسي الأول', gradeId: 'g10', order: 1 },
  { id: 'g10-sem2', name: 'الفصل الدراسي الثاني', gradeId: 'g10', order: 2 },
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

    render(<SemesterSelection gradeId="g10" onSelectSemester={vi.fn()} />);

    expect(mockedUseSemestersByGrade).toHaveBeenCalledWith('g10');
  });

  it('يعرض حالة التحميل', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="g10" onSelectSemester={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة الخطأ', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الفصول.' },
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="g10" onSelectSemester={vi.fn()} />);

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

    render(<SemesterSelection gradeId="g10" onSelectSemester={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض الفصل الأول الحالي ويخفي الفصل الثاني من تجربة الطالب', () => {
    mockedUseSemestersByGrade.mockReturnValue({
      data: semesters,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="g10" onSelectSemester={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'الفصل الدراسي الأول' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'الفصل الدراسي الثاني' })).not.toBeInTheDocument();
    expect(screen.getByText('الفصل الحالي • متاح الآن')).toBeInTheDocument();
  });

  it('يمرر معرف الفصل الأول نفسه عند اختياره', () => {
    const onSelectSemester = vi.fn();

    mockedUseSemestersByGrade.mockReturnValue({
      data: semesters,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SemesterSelection gradeId="g10" onSelectSemester={onSelectSemester} />);
    fireEvent.click(screen.getByRole('button', { name: 'الفصل الدراسي الأول' }));

    expect(onSelectSemester).toHaveBeenCalledTimes(1);
    expect(onSelectSemester).toHaveBeenCalledWith('g10-sem1');
  });
});

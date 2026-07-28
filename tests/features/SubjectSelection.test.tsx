// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubjectSelection } from '@features/student/subject-selection/SubjectSelection';
import { useSubjectsBySemester } from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useSubjectsBySemester: vi.fn(),
}));

const mockedUseSubjectsBySemester = vi.mocked(useSubjectsBySemester);

const subjects = [
  { id: 'physics', name: 'الفيزياء', gradeId: 'grade-10', themeColor: '#7C3AED' },
  { id: 'chemistry', name: 'الكيمياء', gradeId: 'grade-10', themeColor: '#059669' },
] as ReturnType<typeof useSubjectsBySemester>['data'];

beforeEach(() => {
  mockedUseSubjectsBySemester.mockReset();
});

describe('SubjectSelection', () => {
  it('يستدعي useSubjectsBySemester بالـsemesterId الصحيح', () => {
    mockedUseSubjectsBySemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={vi.fn()} />);

    expect(mockedUseSubjectsBySemester).toHaveBeenCalledWith('semester-2');
  });

  it('يعرض حالة التحميل', () => {
    mockedUseSubjectsBySemester.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة الخطأ', () => {
    mockedUseSubjectsBySemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل المواد.' },
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل المواد.');
  });

  it('يربط إعادة المحاولة بدالة reload', () => {
    const reload = vi.fn();

    mockedUseSubjectsBySemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل المواد.' },
      reload,
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض رسالة الفراغ الوظيفية عند عدم وجود مواد', () => {
    mockedUseSubjectsBySemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-1" onSelectSubject={vi.fn()} />);

    expect(screen.getByText('لا توجد مواد مرتبطة بهذا الفصل بعد.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('يعرض المواد بالترتيب الذي يعيده hook', () => {
    mockedUseSubjectsBySemester.mockReturnValue({
      data: subjects,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={vi.fn()} />);

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('الفيزياء');
    expect(cards[1]).toHaveTextContent('الكيمياء');
  });

  it('يحافظ على themeColor الخاصة بالمادة', () => {
    mockedUseSubjectsBySemester.mockReturnValue({
      data: subjects,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={vi.fn()} />);

    const physicsCard = screen.getByRole('button', { name: 'الفيزياء' });

expect(physicsCard.getAttribute('style')).toContain(
  'border-inline-start: 5px solid #7C3AED',
);
  });

  it('يمرر subject.id نفسه عند اختيار البطاقة', () => {
    const onSelectSubject = vi.fn();

    mockedUseSubjectsBySemester.mockReturnValue({
      data: subjects,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<SubjectSelection semesterId="semester-2" onSelectSubject={onSelectSubject} />);
    fireEvent.click(screen.getByRole('button', { name: 'الكيمياء' }));

    expect(onSelectSubject).toHaveBeenCalledTimes(1);
    expect(onSelectSubject).toHaveBeenCalledWith('chemistry');
  });
});

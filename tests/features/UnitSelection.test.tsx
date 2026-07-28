// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnitSelection } from '@features/student/unit-selection/UnitSelection';
import { useUnitsBySubjectAndSemester } from '@services/queries/content-query.hooks';

vi.mock('@services/queries/content-query.hooks', () => ({
  useUnitsBySubjectAndSemester: vi.fn(),
}));

const mockedUseUnitsBySubjectAndSemester = vi.mocked(useUnitsBySubjectAndSemester);

const units = [
  { id: 'waves', title: 'الموجات', subjectId: 'physics', semesterId: 'semester-2', order: 1 },
  { id: 'light', title: 'الضوء', subjectId: 'physics', semesterId: 'semester-2', order: 2 },
] as ReturnType<typeof useUnitsBySubjectAndSemester>['data'];

beforeEach(() => {
  mockedUseUnitsBySubjectAndSemester.mockReset();
});

describe('UnitSelection', () => {
  it('يستدعي hook بالترتيب subjectId ثم semesterId', () => {
    mockedUseUnitsBySubjectAndSemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<UnitSelection semesterId="semester-2" subjectId="physics" onSelectUnit={vi.fn()} />);

    expect(mockedUseUnitsBySubjectAndSemester).toHaveBeenCalledWith('physics', 'semester-2');
  });

  it('يعرض حالة التحميل', () => {
    mockedUseUnitsBySubjectAndSemester.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<UnitSelection semesterId="semester-2" subjectId="physics" onSelectUnit={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة الخطأ', () => {
    mockedUseUnitsBySubjectAndSemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الوحدات.' },
      reload: vi.fn(),
    });

    render(<UnitSelection semesterId="semester-2" subjectId="physics" onSelectUnit={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الوحدات.');
  });

  it('يربط إعادة المحاولة بدالة reload', () => {
    const reload = vi.fn();

    mockedUseUnitsBySubjectAndSemester.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الوحدات.' },
      reload,
    });

    render(<UnitSelection semesterId="semester-2" subjectId="physics" onSelectUnit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض الوحدات بالترتيب الذي يعيده hook', () => {
    mockedUseUnitsBySubjectAndSemester.mockReturnValue({
      data: units,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<UnitSelection semesterId="semester-2" subjectId="physics" onSelectUnit={vi.fn()} />);

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('الموجات');
    expect(cards[1]).toHaveTextContent('الضوء');
  });

  it('يمرر unit.id نفسه عند اختيار البطاقة', () => {
    const onSelectUnit = vi.fn();

    mockedUseUnitsBySubjectAndSemester.mockReturnValue({
      data: units,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(
      <UnitSelection semesterId="semester-2" subjectId="physics" onSelectUnit={onSelectUnit} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'الضوء' }));

    expect(onSelectUnit).toHaveBeenCalledTimes(1);
    expect(onSelectUnit).toHaveBeenCalledWith('light');
  });
});

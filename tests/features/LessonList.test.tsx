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
    objectiveIds: [],
    summary: 'ملخص',
    keyConcepts: [],
    examples: [],
    misconceptions: [],
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'lesson-wave-speed',
    unitId: 'unit-waves',
    title: 'سرعة الموجة',
    order: 2,
    objectiveIds: [],
    summary: 'ملخص',
    keyConcepts: [],
    examples: [],
    misconceptions: [],
    status: 'approved',
    source: 'curriculum_seed',
  },
] as NonNullable<ReturnType<typeof useLessonsByUnit>['data']>;

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

  it('يعرض الدروس المنشورة بالترتيب الذي يعيده hook', () => {
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
    expect(cards[0]).toHaveTextContent('جاهز للتعلّم');
  });

  it('يحافظ على عنوان الدرس وترتيبه', () => {
    mockedUseLessonsByUnit.mockReturnValue({
      data: lessons,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={vi.fn()} />);

    expect(screen.getByRole('button', { name: /خصائص الموجات/ })).toHaveTextContent('الدرس 1');
    expect(screen.getByRole('button', { name: /سرعة الموجة/ })).toHaveTextContent('الدرس 2');
  });

  it('يمرر lesson.id نفسه عند اختيار الدرس المنشور', () => {
    const onSelectLesson = vi.fn();

    mockedUseLessonsByUnit.mockReturnValue({
      data: lessons,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-waves" onSelectLesson={onSelectLesson} />);
    fireEvent.click(screen.getByRole('button', { name: /سرعة الموجة/ }));

    expect(onSelectLesson).toHaveBeenCalledTimes(1);
    expect(onSelectLesson).toHaveBeenCalledWith('lesson-wave-speed');
  });

  it('يعرض الدرس المسودة كقيد الإعداد ولا يسمح بفتحه', () => {
    const onSelectLesson = vi.fn();
    const draftLesson = {
      ...lessons[0],
      id: 'draft-lesson',
      title: 'درس آخر قيد الإعداد',
      status: 'draft' as const,
    };

    mockedUseLessonsByUnit.mockReturnValue({
      data: [draftLesson],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<LessonList unitId="unit-measurement" onSelectLesson={onSelectLesson} />);

    const card = screen.getByRole('button', { name: 'درس آخر قيد الإعداد' });
    expect(card).toBeDisabled();
    expect(card).toHaveTextContent('قيد الإعداد');
    fireEvent.click(card);
    expect(onSelectLesson).not.toHaveBeenCalled();
  });
  it('يعرض درس أهمية القياس المعتمد كدرس طبيعي دون شارات تجريبية', () => {
    const onSelectLesson = vi.fn();
    const goldenLesson = {
      ...lessons[0],
      id: 'g9-phy-s1-u1-l1',
      title: '1-1 أهمية القياس',
      order: 1,
      status: 'approved' as const,
    };
    mockedUseLessonsByUnit.mockReturnValue({
      data: [goldenLesson],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<LessonList unitId="g9-phy-s1-u1-length-time" onSelectLesson={onSelectLesson} />);
    const card = screen.getByRole('button', { name: '1-1 أهمية القياس' });
    expect(card).not.toBeDisabled();
    expect(card).toHaveTextContent('الدرس 1');
    expect(card).toHaveTextContent('جاهز للتعلّم');
    expect(card).not.toHaveTextContent('نموذج تجريبي');
    expect(card).not.toHaveTextContent('معاينة');
    fireEvent.click(card);
    expect(onSelectLesson).toHaveBeenCalledWith('g9-phy-s1-u1-l1');
  });

  it('يبقي درس قياس الطول والحجم في المعاينة أثناء بناء بقية المسارات', () => {
    const onSelectLesson = vi.fn();
    const previewLesson = {
      ...lessons[0],
      id: 'g9-phy-s1-u1-l2',
      title: '1-2 قياس الطول والحجم',
      order: 2,
      status: 'draft' as const,
    };
    mockedUseLessonsByUnit.mockReturnValue({
      data: [previewLesson],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<LessonList unitId="g9-phy-s1-u1-length-time" onSelectLesson={onSelectLesson} />);
    const card = screen.getByRole('button', { name: '1-2 قياس الطول والحجم' });
    expect(card).not.toBeDisabled();
    expect(card).toHaveTextContent('الدرس 2');
    expect(card).toHaveTextContent('معاينة');
    fireEvent.click(card);
    expect(onSelectLesson).toHaveBeenCalledWith('g9-phy-s1-u1-l2');
  });

  it('يبقي درس الكهرباء الساكنة المسودة في مسار المعاينة المؤقت', () => {
    const onSelectLesson = vi.fn();
    const previewLesson = {
      ...lessons[0],
      id: 'g10-phy-s1-u1-l1',
      title: '1-1 الكهرباء الساكنة',
      status: 'draft' as const,
    };
    mockedUseLessonsByUnit.mockReturnValue({
      data: [previewLesson],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<LessonList unitId="g10-phy-s1-u1-electric-charge" onSelectLesson={onSelectLesson} />);
    const card = screen.getByRole('button', { name: '1-1 الكهرباء الساكنة' });
    expect(card).not.toBeDisabled();
    expect(card).toHaveTextContent('معاينة');
    fireEvent.click(card);
    expect(onSelectLesson).toHaveBeenCalledWith('g10-phy-s1-u1-l1');
  });
});

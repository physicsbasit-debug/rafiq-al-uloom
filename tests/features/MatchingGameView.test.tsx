// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchingGameView } from '@features/games/matching/MatchingGameView';
import {
  useGamesByLesson,
  useObjectivesByIds,
} from '@services/queries/content-query.hooks';
import type { Objective } from '@shared-types/content.types';
import type { Game } from '@shared-types/game.types';

vi.mock('@services/queries/content-query.hooks', () => ({
  useGamesByLesson: vi.fn(),
  useObjectivesByIds: vi.fn(),
}));

const mockedUseGamesByLesson = vi.mocked(useGamesByLesson);
const mockedUseObjectivesByIds = vi.mocked(useObjectivesByIds);

const games: Game[] = [
  {
    id: 'game-one',
    lessonId: 'lesson-one',
    type: 'matching',
    title: 'مطابقة المفاهيم',
    instructions: 'طابق كل مفهوم مع وصفه.',
    items: [
      { left: 'الطول الموجي', right: 'المسافة بين قمتين متتاليتين' },
      { left: 'التردد', right: 'عدد الاهتزازات في الثانية' },
    ],
    objectiveIds: ['objective-two', 'objective-one'],
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'game-two',
    lessonId: 'lesson-one',
    type: 'matching',
    title: 'مطابقة الوحدات',
    instructions: 'طابق الكمية مع وحدتها.',
    items: [
      { left: 'التردد الثاني', right: 'هرتز' },
      { left: 'الزمن الدوري', right: 'ثانية' },
    ],
    objectiveIds: ['objective-one', 'objective-three'],
    status: 'approved',
    source: 'curriculum_seed',
  },
];

const objectives: Objective[] = [
  {
    id: 'objective-one',
    lessonId: 'lesson-one',
    text: 'يعرّف التردد.',
  },
  {
    id: 'objective-two',
    lessonId: 'lesson-one',
    text: 'يعرّف الطول الموجي.',
  },
  {
    id: 'objective-three',
    lessonId: 'lesson-one',
    text: 'يميّز وحدات الكميات الموجية.',
  },
];

function mockGamesSuccess(data: Game[] = games) {
  mockedUseGamesByLesson.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

function mockObjectivesSuccess(data: Objective[] = objectives) {
  mockedUseObjectivesByIds.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

beforeEach(() => {
  mockedUseGamesByLesson.mockReset();
  mockedUseObjectivesByIds.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('MatchingGameView', () => {
  it('يستدعي useGamesByLesson بالـlessonId الصحيح', () => {
    mockGamesSuccess([]);
    mockObjectivesSuccess([]);

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseGamesByLesson).toHaveBeenCalledWith('lesson-one');
  });

  it('يعرض حالة تحميل الألعاب', () => {
    mockedUseGamesByLesson.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة خطأ الألعاب', () => {
    mockedUseGamesByLesson.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الألعاب.' },
      reload: vi.fn(),
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الألعاب.');
  });

  it('يربط إعادة محاولة الألعاب بدالة reload', () => {
    const reload = vi.fn();

    mockedUseGamesByLesson.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الألعاب.' },
      reload,
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('لا يركب استعلام الأهداف قبل نجاح تحميل الألعاب', () => {
    mockedUseGamesByLesson.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseObjectivesByIds).not.toHaveBeenCalled();
  });

  it('يجمع objectiveIds بلا تكرار ويحافظ على ترتيب أول ظهور', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(mockedUseObjectivesByIds).toHaveBeenCalledWith([
      'objective-two',
      'objective-one',
      'objective-three',
    ]);
  });

  it('يعرض حالة تحميل الأهداف', () => {
    mockGamesSuccess();
    mockedUseObjectivesByIds.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات...');
  });

  it('يعرض حالة خطأ الأهداف', () => {
    mockGamesSuccess();
    mockedUseObjectivesByIds.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الأهداف.' },
      reload: vi.fn(),
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الأهداف.');
  });

  it('يربط إعادة محاولة الأهداف بدالة reload', () => {
    const reload = vi.fn();

    mockGamesSuccess();
    mockedUseObjectivesByIds.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'تعذر تحميل الأهداف.' },
      reload,
    });

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('يعرض عنوان اللعبة وتعليماتها', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'مطابقة المفاهيم' })).toBeInTheDocument();
    expect(screen.getByText('طابق كل مفهوم مع وصفه.')).toBeInTheDocument();
  });

  it('يعرض أهداف كل لعبة فقط وبترتيب objectiveIds الخاص بها', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    const articles = screen.getAllByRole('article');
    const firstObjectiveItems = within(articles[0]).getAllByRole('listitem');
    const secondObjectiveItems = within(articles[1]).getAllByRole('listitem');

    expect(firstObjectiveItems.map((item) => item.textContent)).toEqual([
      'يعرّف الطول الموجي.',
      'يعرّف التردد.',
    ]);
    expect(secondObjectiveItems.map((item) => item.textContent)).toEqual([
      'يعرّف التردد.',
      'يميّز وحدات الكميات الموجية.',
    ]);
  });

  it('يختار العنصر الأيسر ويعرض العنصر المختار', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));

    expect(screen.getByText('العنصر المختار')).toBeInTheDocument();
    expect(screen.getAllByText('الطول الموجي')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'تغيير الاختيار' })).toBeInTheDocument();
  });

  // لا نتحقق من ظهور رسالة "أحسنت..." لأن clearSelection تصفّر feedback فورًا
  // ضمن نفس دفعة التحديثات عند النجاح. هذا سلوك موروث من Phase 1،
  // وليس تغييرًا أحدثته A3d.
  it('المطابقة الخاطئة تبقي العنصر الأيسر وتسمح بمحاولة ثانية فورية', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(screen.getByRole('button', { name: 'عدد الاهتزازات في الثانية' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'ليست المطابقة الصحيحة. جرّب مرة أخرى.',
    );
    expect(screen.getByText('العنصر المختار')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'المسافة بين قمتين متتاليتين' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'المسافة بين قمتين متتاليتين' }),
    );

    expect(
      screen.queryByRole('button', { name: 'الطول الموجي' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'المسافة بين قمتين متتاليتين',
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('العنصر المختار')).not.toBeInTheDocument();
    expect(
      screen.queryByText('ليست المطابقة الصحيحة. جرّب مرة أخرى.'),
    ).not.toBeInTheDocument();
  });

  it('المطابقة الصحيحة تسجل الزوج وتزيله من القائمتين', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'المسافة بين قمتين متتاليتين' }),
    );

    expect(
      screen.queryByRole('button', { name: 'الطول الموجي' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'المسافة بين قمتين متتاليتين' }),
    ).not.toBeInTheDocument();
  });

  it('يعرض رسالة اكتمال جميع المطابقات', () => {
    mockGamesSuccess([games[0]]);
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'المسافة بين قمتين متتاليتين' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'التردد' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'عدد الاهتزازات في الثانية' }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'اكتملت جميع المطابقات بنجاح.',
    );
  });

  it('زر تغيير الاختيار يمسح اختيار اللعبة الحالية فقط', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    const articles = screen.getAllByRole('article');

    fireEvent.click(within(articles[0]).getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(within(articles[1]).getByRole('button', { name: 'التردد الثاني' }));

    fireEvent.click(
      within(articles[0]).getByRole('button', { name: 'تغيير الاختيار' }),
    );

    expect(within(articles[0]).queryByText('العنصر المختار')).not.toBeInTheDocument();
    expect(within(articles[1]).getByText('العنصر المختار')).toBeInTheDocument();
  });

  it('زر العودة يستدعي onBackToLesson', () => {
    const onBackToLesson = vi.fn();

    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={onBackToLesson} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));

    expect(onBackToLesson).toHaveBeenCalledTimes(1);
  });

  it('يبقي حالة كل لعبة مستقلة عن اللعبة الأخرى', () => {
    mockGamesSuccess();
    mockObjectivesSuccess();

    render(<MatchingGameView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    const articles = screen.getAllByRole('article');

    fireEvent.click(within(articles[0]).getByRole('button', { name: 'الطول الموجي' }));
    fireEvent.click(
      within(articles[0]).getByRole('button', {
        name: 'المسافة بين قمتين متتاليتين',
      }),
    );

    expect(
      within(articles[0]).queryByRole('button', { name: 'الطول الموجي' }),
    ).not.toBeInTheDocument();
    expect(
      within(articles[1]).getByRole('button', { name: 'التردد الثاني' }),
    ).toBeInTheDocument();
    expect(
      within(articles[1]).getByRole('button', { name: 'الزمن الدوري' }),
    ).toBeInTheDocument();
  });
});

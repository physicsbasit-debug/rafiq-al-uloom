// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { StudentActivityHub } from '@features/activities/StudentActivityHub';
import { LessonView } from '@features/student/lesson-view/LessonView';
import { createActivityCatalogService } from '@services/activities/activity-catalog.service';
import { getContentRepository } from '@services/data/content-repository.provider';
import { getSupabaseClient } from '@services/data/supabase-client';

import {
  cleanupPhase56StudentActivityFixture,
  createPhase56StudentActivityFixture,
  type Phase56StudentActivityFixture,
} from './helpers/phase-5-6-student-activity-fixtures';
import {
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function installMatchMedia(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

function StudentLessonActivityComposition({ lessonId }: { readonly lessonId: string }) {
  const [showActivities, setShowActivities] = useState(false);

  if (showActivities) {
    return (
      <StudentActivityHub lessonId={lessonId} onBackToLesson={() => setShowActivities(false)} />
    );
  }

  return (
    <LessonView
      lessonId={lessonId}
      onBackToLessons={() => undefined}
      onOpenReviewQuestions={() => undefined}
      onOpenActivities={() => setShowActivities(true)}
      onOpenMatchingGame={() => undefined}
      onOpenMasteryTest={() => undefined}
    />
  );
}

function activityCard(title: string) {
  const heading = screen.getByRole('heading', { name: title });
  const article = heading.closest('article');

  if (!article) {
    throw new Error(`Activity card not found for "${title}".`);
  }

  return within(article);
}

async function returnToHub(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الأنشطة' }));
  await screen.findByRole('heading', { name: 'الأنشطة العلمية' });
}

describeIntegration('Phase 5-6B canonical → student activity composition', () => {
  let authFixtures: SupabaseAuthFixtures;
  let student: AuthIdentity;
  let fixture: Phase56StudentActivityFixture;
  let defaultClient: ReturnType<typeof getSupabaseClient>;

  beforeAll(async () => {
    const env = readLocalSupabaseEnvironment();

    vi.stubEnv('VITE_CONTENT_PROVIDER', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', env.apiUrl);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', env.publishableKey);
    installMatchMedia();

    authFixtures = new SupabaseAuthFixtures(env);
    student = await authFixtures.createIdentity('phase-5-6b-student', 'student', 'active');

    defaultClient = getSupabaseClient();
    const { data, error } = await defaultClient.auth.signInWithPassword({
      email: student.email,
      password: student.password,
    });

    if (error || !data.session) {
      throw new Error(
        `Failed to authenticate the production content client: ${error?.message ?? 'missing session'}`
      );
    }

    fixture = createPhase56StudentActivityFixture();
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(async () => {
    try {
      if (fixture) {
        cleanupPhase56StudentActivityFixture(fixture);
      }
    } finally {
      try {
        await defaultClient?.auth.signOut();
      } finally {
        await authFixtures?.cleanup();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      }
    }
  });

  it('loads exactly the five approved canonical families through the real Supabase repository', async () => {
    const catalog = await createActivityCatalogService(
      getContentRepository()
    ).getActivitiesByLesson(fixture.lessonId);

    expect(catalog.map((activity) => activity.kind)).toEqual([
      'matching',
      'experiment',
      'simulation',
      'inquiry',
      'data',
    ]);

    expect(catalog.map((activity) => activity.title)).toEqual([
      fixture.matchingTitle,
      fixture.experimentTitle,
      fixture.simulationTitle,
      fixture.inquiryTitle,
      fixture.dataTitle,
    ]);

    expect(
      catalog.every(
        (activity) =>
          activity.lessonId === fixture.lessonId &&
          activity.status === 'approved' &&
          activity.source === 'teacher_authored'
      )
    ).toBe(true);

    expect(catalog.map((activity) => activity.objectiveIds)).toEqual([
      [fixture.objectiveAId, fixture.objectiveBId],
      [fixture.objectiveAId],
      [fixture.objectiveAId],
      [fixture.objectiveBId],
      [fixture.objectiveAId, fixture.objectiveBId],
    ]);

    expect(catalog.some((activity) => activity.id === fixture.draftGameId)).toBe(false);
    expect(catalog.some((activity) => activity.id === fixture.wrongLessonGameId)).toBe(false);
  });

  it('navigates Lesson → Hub → Registry/Host → all five real family views', async () => {
    render(<StudentLessonActivityComposition lessonId={fixture.lessonId} />);

    expect(await screen.findByRole('heading', { name: fixture.lessonTitle })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'الأنشطة العلمية' }));

    expect(await screen.findByRole('heading', { name: 'الأنشطة العلمية' })).toBeInTheDocument();

    expect(screen.queryByText(fixture.draftTitle)).not.toBeInTheDocument();
    expect(screen.queryByText(fixture.wrongLessonTitle)).not.toBeInTheDocument();

    const matchingCard = activityCard(fixture.matchingTitle);
    const experimentCard = activityCard(fixture.experimentTitle);
    const simulationCard = activityCard(fixture.simulationTitle);
    const inquiryCard = activityCard(fixture.inquiryTitle);
    const dataCard = activityCard(fixture.dataTitle);

    expect(matchingCard.getByText('مطابقة')).toBeInTheDocument();
    expect(experimentCard.getByText('تجربة')).toBeInTheDocument();
    expect(simulationCard.getByText('محاكاة')).toBeInTheDocument();
    expect(inquiryCard.getByText('استقصاء')).toBeInTheDocument();
    expect(dataCard.getByText('بيانات ورسوم')).toBeInTheDocument();

    expect(matchingCard.getByText(fixture.objectiveAText)).toBeInTheDocument();
    expect(matchingCard.getByText(fixture.objectiveBText)).toBeInTheDocument();
    expect(experimentCard.getByText(fixture.objectiveAText)).toBeInTheDocument();
    expect(simulationCard.getByText(fixture.objectiveAText)).toBeInTheDocument();
    expect(inquiryCard.getByText(fixture.objectiveBText)).toBeInTheDocument();
    expect(dataCard.getByText(fixture.objectiveAText)).toBeInTheDocument();
    expect(dataCard.getByText(fixture.objectiveBText)).toBeInTheDocument();

    fireEvent.click(matchingCard.getByRole('button', { name: 'فتح النشاط' }));
    expect(await screen.findByRole('heading', { name: 'لعبة المطابقة' })).toBeInTheDocument();
    const matchingLeftButton = screen.getByRole('button', { name: fixture.matchingLeft });
    expect(matchingLeftButton).toBeInTheDocument();

    fireEvent.click(matchingLeftButton);

    expect(screen.getByRole('heading', { name: 'اختر المقابل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fixture.matchingRight })).toBeInTheDocument();
    await returnToHub();

    fireEvent.click(
      activityCard(fixture.experimentTitle).getByRole('button', { name: 'فتح النشاط' })
    );
    expect(
      await screen.findByRole('heading', { name: fixture.experimentTitle })
    ).toBeInTheDocument();
    expect(screen.getByText(fixture.experimentTool)).toBeInTheDocument();
    expect(screen.getByText(fixture.experimentStep)).toBeInTheDocument();
    await returnToHub();

    fireEvent.click(
      activityCard(fixture.simulationTitle).getByRole('button', { name: 'فتح النشاط' })
    );
    expect(
      await screen.findByRole('heading', { name: fixture.simulationTitle })
    ).toBeInTheDocument();
    expect(screen.getByText('سرعة الموجة في هذا الوسط التعليمي')).toBeInTheDocument();
    expect(screen.getByLabelText('التردد')).toBeInTheDocument();
    expect(screen.getByLabelText('السعة')).toBeInTheDocument();
    await returnToHub();

    fireEvent.click(activityCard(fixture.inquiryTitle).getByRole('button', { name: 'فتح النشاط' }));
    expect(await screen.findByRole('heading', { name: fixture.inquiryTitle })).toBeInTheDocument();
    expect(screen.getByText(fixture.inquiryContext)).toBeInTheDocument();
    expect(screen.getByLabelText('الفرضية')).toBeInTheDocument();
    expect(screen.getByLabelText('الملاحظة أو الدليل')).toBeInTheDocument();
    expect(screen.getByLabelText('الاستنتاج')).toBeInTheDocument();
    await returnToHub();

    fireEvent.click(activityCard(fixture.dataTitle).getByRole('button', { name: 'فتح النشاط' }));
    expect(await screen.findByRole('heading', { name: fixture.dataTitle })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'جدول البيانات العلمية' })).toBeInTheDocument();
    expect(screen.getByLabelText(fixture.dataTaskPrompt)).toBeInTheDocument();
    await returnToHub();

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));
    expect(await screen.findByRole('heading', { name: fixture.lessonTitle })).toBeInTheDocument();
  });
});

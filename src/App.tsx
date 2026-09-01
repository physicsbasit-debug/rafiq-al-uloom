import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { StudentActivityHub } from '@features/activities/StudentActivityHub';
import { AccountControls } from '@features/auth/AccountControls';
import { AccountStatusView } from '@features/auth/AccountStatusView';
import { AuthEntryView } from '@features/auth/AuthEntryView';
import { AuthSessionProvider } from '@features/auth/AuthSessionProvider';
import { RequireCapability } from '@features/auth/RequireCapability';
import { useAuthSession } from '@features/auth/useAuthSession';
import { MatchingGameView } from '@features/games/matching/MatchingGameView';
import { MasteryTestView } from '@features/mastery/MasteryTestView';
import { ReviewerWorkspace } from '@features/reviewer/workspace';
import { GradeSelection } from '@features/student/grade-selection/GradeSelection';
import { LessonList } from '@features/student/lesson-list/LessonList';
import { LessonView } from '@features/student/lesson-view/LessonView';
import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { SemesterSelection } from '@features/student/semester-selection/SemesterSelection';
import { SubjectSelection } from '@features/student/subject-selection/SubjectSelection';
import { UnitSelection } from '@features/student/unit-selection/UnitSelection';
import { TeacherWorkspace } from '@features/teacher/workspace';
import { GatewayAiAuthoringProvider } from '@services/ai-authoring';
import { getCurrentAccessToken } from '@services/auth/auth.service';

type AppSurface = 'student' | 'teacher' | 'reviewer';

type Step =
  | { name: 'grade' }
  | { name: 'semester'; gradeId: string }
  | { name: 'subject'; semesterId: string }
  | { name: 'unit'; semesterId: string; subjectId: string }
  | { name: 'lessons'; unitId: string }
  | { name: 'lesson'; lessonId: string; unitId: string }
  | { name: 'review'; lessonId: string; unitId: string }
  | { name: 'activities'; lessonId: string; unitId: string }
  | { name: 'game'; lessonId: string; unitId: string }
  | { name: 'mastery'; lessonId: string; unitId: string };

interface StudentExperienceProps {
  readonly step: Step;
  readonly setStep: Dispatch<SetStateAction<Step>>;
}

function StudentExperience({ step, setStep }: StudentExperienceProps) {
  return (
    <>
      {step.name !== 'grade' ? (
        <div style={{ maxWidth: '210px', marginBottom: '1rem' }}>
          <AppButton
            label="رجوع للبداية"
            variant="secondary"
            onClick={() => setStep({ name: 'grade' })}
          />
        </div>
      ) : null}

      {step.name === 'grade' ? (
        <GradeSelection onSelectGrade={(gradeId) => setStep({ name: 'semester', gradeId })} />
      ) : null}

      {step.name === 'semester' ? (
        <SemesterSelection
          gradeId={step.gradeId}
          onSelectSemester={(semesterId) => setStep({ name: 'subject', semesterId })}
        />
      ) : null}

      {step.name === 'subject' ? (
        <SubjectSelection
          semesterId={step.semesterId}
          onSelectSubject={(subjectId) =>
            setStep({ name: 'unit', semesterId: step.semesterId, subjectId })
          }
        />
      ) : null}

      {step.name === 'unit' ? (
        <UnitSelection
          semesterId={step.semesterId}
          subjectId={step.subjectId}
          onSelectUnit={(unitId) => setStep({ name: 'lessons', unitId })}
        />
      ) : null}

      {step.name === 'lessons' ? (
        <LessonList
          unitId={step.unitId}
          onSelectLesson={(lessonId) => setStep({ name: 'lesson', lessonId, unitId: step.unitId })}
        />
      ) : null}

      {step.name === 'lesson' ? (
        <LessonView
          lessonId={step.lessonId}
          onBackToLessons={() => setStep({ name: 'lessons', unitId: step.unitId })}
          onOpenReviewQuestions={() =>
            setStep({ name: 'review', lessonId: step.lessonId, unitId: step.unitId })
          }
          onOpenActivities={() =>
            setStep({ name: 'activities', lessonId: step.lessonId, unitId: step.unitId })
          }
          onOpenMatchingGame={() =>
            setStep({ name: 'game', lessonId: step.lessonId, unitId: step.unitId })
          }
          onOpenMasteryTest={() =>
            setStep({ name: 'mastery', lessonId: step.lessonId, unitId: step.unitId })
          }
        />
      ) : null}

      {step.name === 'review' ? (
        <ReviewQuestionsView
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({ name: 'lesson', lessonId: step.lessonId, unitId: step.unitId })
          }
        />
      ) : null}

      {step.name === 'activities' ? (
        <StudentActivityHub
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({ name: 'lesson', lessonId: step.lessonId, unitId: step.unitId })
          }
        />
      ) : null}

      {step.name === 'game' ? (
        <MatchingGameView
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({ name: 'lesson', lessonId: step.lessonId, unitId: step.unitId })
          }
        />
      ) : null}

      {step.name === 'mastery' ? (
        <MasteryTestView
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({ name: 'lesson', lessonId: step.lessonId, unitId: step.unitId })
          }
        />
      ) : null}
    </>
  );
}

function resolveAiGatewayUrl(baseUrl: string | undefined): string {
  const normalized = baseUrl?.trim().replace(/\/+$/, '') ?? '';
  return normalized ? `${normalized}/functions/v1/ai-authoring-gateway` : '';
}

export function AppContent() {
  const [step, setStep] = useState<Step>({ name: 'grade' });
  const [appSurface, setAppSurface] = useState<AppSurface>('student');
  const session = useAuthSession();
  const aiProvider = useMemo(
    () =>
      new GatewayAiAuthoringProvider({
        gatewayUrl: resolveAiGatewayUrl(import.meta.env.VITE_SUPABASE_URL),
        publicApiKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        getAccessToken: getCurrentAccessToken,
      }),
    []
  );

  const authenticated = session.authState.status === 'authenticated';
  const showGuestExperience =
    session.authState.status === 'guest' && session.entryMode === 'closed';

  return (
    <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      <header
        style={{
          backgroundColor: colors.primary,
          color: colors.surface,
          padding: '1.1rem 1rem',
          boxShadow: '0 10px 30px rgba(31, 41, 55, 0.12)',
        }}
      >
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '1.55rem' }}>رفيق العلوم</h1>
          <p style={{ margin: '0.25rem 0 0', lineHeight: 1.6 }}>اكتشف • تعلّم • أتقن</p>

          {showGuestExperience ? (
            <AccountControls
              mode="guest"
              onSignIn={session.openSignIn}
              onSignUp={session.openSignUp}
            />
          ) : null}

          {authenticated && session.authorizationState?.status === 'authorized' ? (
            <AccountControls
              mode="authenticated"
              email={session.authState.user.email}
              onSignOut={session.signOut}
            />
          ) : null}
        </div>
      </header>

      <main
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '1rem',
          color: colors.textPrimary,
        }}
      >
        {session.authState.status === 'guest' && session.entryMode !== 'closed' ? (
          <AuthEntryView session={session} />
        ) : null}

        {session.authState.status === 'loading' ? (
          <AccountStatusView
            state={{ status: 'session_loading' }}
            onRetry={session.retrySession}
            onSignOut={session.signOut}
          />
        ) : null}

        {session.authState.status === 'error' ? (
          <AccountStatusView
            state={{ status: 'session_error', message: session.authState.error.message }}
            onRetry={session.retrySession}
            onSignOut={session.signOut}
          />
        ) : null}

        {authenticated && !session.authorizationState ? (
          <AccountStatusView
            state={{ status: 'session_loading' }}
            onRetry={session.refreshAuthorization}
            onSignOut={session.signOut}
          />
        ) : null}

        {authenticated && session.authorizationState?.status === 'loading_profile' ? (
          <AccountStatusView
            state={session.authorizationState}
            onRetry={session.refreshAuthorization}
            onSignOut={session.signOut}
          />
        ) : null}

        {authenticated &&
        session.authorizationState &&
        session.authorizationState.status !== 'authorized' &&
        session.authorizationState.status !== 'loading_profile' ? (
          <AccountStatusView
            state={session.authorizationState}
            onRetry={session.refreshAuthorization}
            onSignOut={session.signOut}
          />
        ) : null}

        {showGuestExperience ? <StudentExperience step={step} setStep={setStep} /> : null}

        {authenticated && session.authorizationState?.status === 'authorized' ? (
          <>
            {appSurface === 'student' ? (
              <>
                <div
                  aria-label="مساحات العمل"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <RequireCapability operation="access_teacher_workspace" fallback={<></>}>
                    <div style={{ width: '190px' }}>
                      <AppButton
                        label="مساحة المعلم"
                        variant="secondary"
                        onClick={() => setAppSurface('teacher')}
                      />
                    </div>
                  </RequireCapability>

                  <RequireCapability operation="access_reviewer_workspace" fallback={<></>}>
                    <div style={{ width: '190px' }}>
                      <AppButton
                        label="مساحة المراجع"
                        variant="secondary"
                        onClick={() => setAppSurface('reviewer')}
                      />
                    </div>
                  </RequireCapability>
                </div>

                <RequireCapability operation="access_student_experience">
                  <StudentExperience step={step} setStep={setStep} />
                </RequireCapability>
              </>
            ) : (
              <>
                <div style={{ width: '190px', marginBottom: '1rem' }}>
                  <AppButton
                    label="العودة إلى التعلم"
                    variant="secondary"
                    onClick={() => setAppSurface('student')}
                  />
                </div>

                {appSurface === 'teacher' ? (
                  <RequireCapability operation="access_teacher_workspace">
                    <TeacherWorkspace aiProvider={aiProvider} />
                  </RequireCapability>
                ) : null}

                {appSurface === 'reviewer' ? (
                  <RequireCapability operation="access_reviewer_workspace">
                    <ReviewerWorkspace />
                  </RequireCapability>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthSessionProvider>
      <AppContent />
    </AuthSessionProvider>
  );
}

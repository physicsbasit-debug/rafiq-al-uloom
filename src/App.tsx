import { type Dispatch, type SetStateAction, useState } from 'react';

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
import { GradeSelection } from '@features/student/grade-selection/GradeSelection';
import { LessonList } from '@features/student/lesson-list/LessonList';
import { LessonView } from '@features/student/lesson-view/LessonView';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { StudentJourneyAccordion } from '@features/student/navigation/StudentJourneyAccordion';
import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { SemesterSelection } from '@features/student/semester-selection/SemesterSelection';
import { PhysicsUnitSelection } from '@features/student/unit-selection/PhysicsUnitSelection';
import { VirtualLabHub } from '@features/virtual-labs/VirtualLabHub';
import { DeferredWorkspace } from '@features/workspace/DeferredWorkspace';

import './features/student/student-experience.css';
import './features/student/learning-experience.css';

type AppSurface = 'student' | 'teacher' | 'reviewer';

type Step =
  | { name: 'grade' }
  | { name: 'semester'; gradeId: string }
  | { name: 'unit'; gradeId: string; semesterId: string }
  | { name: 'lessons'; gradeId: string; semesterId: string; unitId: string }
  | { name: 'lesson'; gradeId: string; semesterId: string; unitId: string; lessonId: string }
  | {
      name: 'review' | 'activities' | 'game' | 'labs' | 'mastery';
      gradeId: string;
      semesterId: string;
      unitId: string;
      lessonId: string;
    };

interface StudentExperienceProps {
  readonly step: Step;
  readonly setStep: Dispatch<SetStateAction<Step>>;
}

const loadTeacherWorkspaceSurface = () =>
  import('@features/teacher/workspace/TeacherWorkspaceSurface');
const loadReviewerWorkspace = () =>
  import('@features/reviewer/workspace/ReviewerWorkspace').then(({ ReviewerWorkspace }) => ({
    default: ReviewerWorkspace,
  }));

function StudentContextualBackAction({ step, setStep }: StudentExperienceProps) {
  if (step.name === 'grade') return null;
  if (step.name === 'semester')
    return (
      <StudentBackAction label="العودة إلى الصفوف" onClick={() => setStep({ name: 'grade' })} />
    );
  if (step.name === 'unit')
    return (
      <StudentBackAction
        label="العودة إلى الفصول"
        onClick={() => setStep({ name: 'semester', gradeId: step.gradeId })}
      />
    );
  if (step.name === 'lessons')
    return (
      <StudentBackAction
        label="العودة إلى الوحدات"
        onClick={() =>
          setStep({ name: 'unit', gradeId: step.gradeId, semesterId: step.semesterId })
        }
      />
    );
  if (step.name === 'lesson')
    return (
      <StudentBackAction
        label="العودة إلى الدروس"
        onClick={() =>
          setStep({
            name: 'lessons',
            gradeId: step.gradeId,
            semesterId: step.semesterId,
            unitId: step.unitId,
          })
        }
      />
    );
  return (
    <StudentBackAction
      label="العودة إلى الدرس"
      onClick={() =>
        setStep({
          name: 'lesson',
          gradeId: step.gradeId,
          semesterId: step.semesterId,
          unitId: step.unitId,
          lessonId: step.lessonId,
        })
      }
    />
  );
}

function StudentExperience({ step, setStep }: StudentExperienceProps) {
  return (
    <section className="rafiq-student-shell">
      <StudentJourneyAccordion currentStep={step.name} />
      <StudentContextualBackAction step={step} setStep={setStep} />
      {step.name === 'grade' ? (
        <GradeSelection onSelectGrade={(gradeId) => setStep({ name: 'semester', gradeId })} />
      ) : null}
      {step.name === 'semester' ? (
        <SemesterSelection
          gradeId={step.gradeId}
          onSelectSemester={(semesterId) =>
            setStep({ name: 'unit', gradeId: step.gradeId, semesterId })
          }
        />
      ) : null}
      {step.name === 'unit' ? (
        <PhysicsUnitSelection
          semesterId={step.semesterId}
          onSelectUnit={(unitId) =>
            setStep({ name: 'lessons', gradeId: step.gradeId, semesterId: step.semesterId, unitId })
          }
        />
      ) : null}
      {step.name === 'lessons' ? (
        <LessonList
          unitId={step.unitId}
          onSelectLesson={(lessonId) =>
            setStep({
              name: 'lesson',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
              lessonId,
            })
          }
        />
      ) : null}
      {step.name === 'lesson' ? (
        <LessonView
          lessonId={step.lessonId}
          onBackToLessons={() =>
            setStep({
              name: 'lessons',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
            })
          }
          onOpenReviewQuestions={() =>
            setStep({
              name: 'review',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              lessonId: step.lessonId,
              unitId: step.unitId,
            })
          }
          onOpenActivities={() =>
            setStep({
              name: 'activities',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              lessonId: step.lessonId,
              unitId: step.unitId,
            })
          }
          onOpenMatchingGame={() =>
            setStep({
              name: 'game',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              lessonId: step.lessonId,
              unitId: step.unitId,
            })
          }
          onOpenVirtualLabs={() =>
            setStep({
              name: 'labs',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              lessonId: step.lessonId,
              unitId: step.unitId,
            })
          }
          onOpenMasteryTest={() =>
            setStep({
              name: 'mastery',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              lessonId: step.lessonId,
              unitId: step.unitId,
            })
          }
        />
      ) : null}
      {step.name === 'review' ? (
        <ReviewQuestionsView
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({
              name: 'lesson',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
              lessonId: step.lessonId,
            })
          }
        />
      ) : null}
      {step.name === 'activities' ? (
        <StudentActivityHub
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({
              name: 'lesson',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
              lessonId: step.lessonId,
            })
          }
        />
      ) : null}
      {step.name === 'game' ? (
        <MatchingGameView
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({
              name: 'lesson',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
              lessonId: step.lessonId,
            })
          }
        />
      ) : null}
      {step.name === 'labs' ? (
        <VirtualLabHub
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({
              name: 'lesson',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
              lessonId: step.lessonId,
            })
          }
        />
      ) : null}
      {step.name === 'mastery' ? (
        <MasteryTestView
          lessonId={step.lessonId}
          onBackToLesson={() =>
            setStep({
              name: 'lesson',
              gradeId: step.gradeId,
              semesterId: step.semesterId,
              unitId: step.unitId,
              lessonId: step.lessonId,
            })
          }
        />
      ) : null}
    </section>
  );
}

export function AppContent() {
  const [step, setStep] = useState<Step>({ name: 'grade' });
  const [appSurface, setAppSurface] = useState<AppSurface>('student');
  const [guestLearningStarted, setGuestLearningStarted] = useState(false);
  const session = useAuthSession();
  const authenticated = session.authState.status === 'authenticated';
  const isGuest = session.authState.status === 'guest';

  if (isGuest && (!guestLearningStarted || session.entryMode !== 'closed')) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh' }}>
        <AuthEntryView
          session={session}
          onStartLearning={() => {
            session.closeAuthEntry();
            setGuestLearningStarted(true);
          }}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      <header
        style={{
          background: 'linear-gradient(135deg, #004d40, #00695c)',
          color: '#ffffff',
          padding: '1rem',
          boxShadow: '0 10px 30px rgba(0, 77, 64, 0.16)',
          borderBottom: '4px solid #ffca28',
        }}
      >
        <div
          style={{
            maxWidth: '1180px',
            margin: '0 auto',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: '#ffca28', fontSize: '1.55rem' }}>رفيق العلوم</h1>
            <p style={{ margin: '0.2rem 0 0', lineHeight: 1.6 }}>
              الفيزياء • الصفان التاسع والعاشر
            </p>
          </div>
          {isGuest ? (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setStep({ name: 'grade' });
                  setGuestLearningStarted(false);
                }}
                style={headerButtonStyle}
              >
                بوابة رفيق العلوم
              </button>
              <button type="button" onClick={session.openSignIn} style={headerButtonStyle}>
                دخول الكادر التعليمي
              </button>
            </div>
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
        style={{ maxWidth: '1180px', margin: '0 auto', padding: '1rem', color: colors.textPrimary }}
      >
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
        {isGuest && guestLearningStarted ? (
          <StudentExperience step={step} setStep={setStep} />
        ) : null}
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
                    <DeferredWorkspace
                      workspaceLabel="مساحة المعلم"
                      load={loadTeacherWorkspaceSurface}
                    />
                  </RequireCapability>
                ) : null}
                {appSurface === 'reviewer' ? (
                  <RequireCapability operation="access_reviewer_workspace">
                    <DeferredWorkspace
                      workspaceLabel="مساحة المراجع"
                      load={loadReviewerWorkspace}
                    />
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

const headerButtonStyle = {
  minHeight: '42px',
  padding: '0.55rem 0.8rem',
  border: '1px solid rgba(255, 202, 40, 0.85)',
  borderRadius: '9px',
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#ffca28',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

export default function App() {
  return (
    <AuthSessionProvider>
      <AppContent />
    </AuthSessionProvider>
  );
}

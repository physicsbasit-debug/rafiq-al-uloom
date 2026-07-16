import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { MatchingGameView } from '@features/games/matching/MatchingGameView';
import { MasteryTestView } from '@features/mastery/MasteryTestView';
import { GradeSelection } from '@features/student/grade-selection/GradeSelection';
import { LessonList } from '@features/student/lesson-list/LessonList';
import { LessonView } from '@features/student/lesson-view/LessonView';
import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { SemesterSelection } from '@features/student/semester-selection/SemesterSelection';
import { SubjectSelection } from '@features/student/subject-selection/SubjectSelection';
import { UnitSelection } from '@features/student/unit-selection/UnitSelection';

type Step =
  | { name: 'grade' }
  | { name: 'semester'; gradeId: string }
  | { name: 'subject'; semesterId: string }
  | { name: 'unit'; semesterId: string; subjectId: string }
  | { name: 'lessons'; unitId: string }
  | { name: 'lesson'; lessonId: string; unitId: string }
  | { name: 'review'; lessonId: string; unitId: string }
  | { name: 'game'; lessonId: string; unitId: string }
  | { name: 'mastery'; lessonId: string; unitId: string };

export default function App() {
  const [step, setStep] = useState<Step>({ name: 'grade' });

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
            onSelectLesson={(lessonId) =>
              setStep({ name: 'lesson', lessonId, unitId: step.unitId })
            }
          />
        ) : null}

        {step.name === 'lesson' ? (
          <LessonView
            lessonId={step.lessonId}
            onBackToLessons={() => setStep({ name: 'lessons', unitId: step.unitId })}
            onOpenReviewQuestions={() =>
              setStep({ name: 'review', lessonId: step.lessonId, unitId: step.unitId })
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
      </main>
    </div>
  );
}

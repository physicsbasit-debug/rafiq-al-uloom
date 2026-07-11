import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { MatchingGameView } from '@features/games/matching/MatchingGameView';
import { GradeSelection } from '@features/student/grade-selection/GradeSelection';
import { LessonList } from '@features/student/lesson-list/LessonList';
import { LessonView } from '@features/student/lesson-view/LessonView';
import { ReviewQuestionsView } from '@features/student/review-questions/ReviewQuestionsView';
import { SemesterSelection } from '@features/student/semester-selection/SemesterSelection';
import { SubjectSelection } from '@features/student/subject-selection/SubjectSelection';
import { UnitSelection } from '@features/student/unit-selection/UnitSelection';

/**
 * App = نقطة تركيب التنقّل فقط.
 *
 * الرحلة الحالية:
 * الصف → الفصل الدراسي → المادة → الوحدة → الدروس → عرض الدرس → أسئلة المراجعة/لعبة المطابقة.
 *
 * لا توجد بيانات ثابتة هنا؛ كل البيانات تأتي من repository عبر الشاشات.
 * لعبة المطابقة في Phase 1-E تدريبية بلا درجة نهائية ولا mastery.
 */

type Step =
  | { name: 'grade' }
  | { name: 'semester'; gradeId: string }
  | { name: 'subject'; semesterId: string }
  | { name: 'unit'; semesterId: string; subjectId: string }
  | { name: 'lessons'; unitId: string }
  | { name: 'lesson'; lessonId: string; unitId: string }
  | { name: 'review'; lessonId: string; unitId: string }
  | { name: 'game'; lessonId: string; unitId: string };

export default function App() {
  const [step, setStep] = useState<Step>({ name: 'grade' });

  return (
    <main
      dir="rtl"
      style={{
        fontFamily: '"Tajawal", "IBM Plex Sans Arabic", sans-serif',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '1.5rem',
        color: '#1F2937',
      }}
    >
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>رفيق العلوم</h1>
      </header>

      {step.name !== 'grade' ? (
        <div style={{ marginBottom: '1rem' }}>
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
          onOpenMatchingGame={() =>
            setStep({ name: 'game', lessonId: step.lessonId, unitId: step.unitId })
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
    </main>
  );
}

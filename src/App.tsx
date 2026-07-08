import { useState } from 'react';
import { GradeSelection } from '@features/student/grade-selection/GradeSelection';
import { SubjectSelection } from '@features/student/subject-selection/SubjectSelection';
import { UnitSelection } from '@features/student/unit-selection/UnitSelection';
import { LessonList } from '@features/student/lesson-list/LessonList';
import { AppButton } from '@design-system/components/AppButton';

/**
 * App = نقطة تركيب التنقّل فقط.
 * تنقّل قائم على حالة بسيطة (بلا تبعية react-router في هذه الدفعة).
 * لا بيانات ثابتة (صفوف/مواد/دروس) مكتوبة هنا — كلها تأتي من الـ repository عبر الشاشات.
 * فتح الدرس الفعلي مؤجل إلى 1-C (placeholder صريح الآن).
 */

type Step =
  | { name: 'grade' }
  | { name: 'subject'; gradeId: string }
  | { name: 'unit'; subjectId: string }
  | { name: 'lessons'; unitId: string }
  | { name: 'lesson-placeholder'; lessonId: string; unitId: string };

export default function App() {
  const [step, setStep] = useState<Step>({ name: 'grade' });

  return (
    <main
      dir="rtl"
      style={{
        fontFamily: '"Tajawal", "IBM Plex Sans Arabic", sans-serif',
        maxWidth: '640px',
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
          <AppButton label="رجوع" variant="secondary" onClick={() => setStep({ name: 'grade' })} />
        </div>
      ) : null}

      {step.name === 'grade' ? (
        <GradeSelection onSelectGrade={(gradeId) => setStep({ name: 'subject', gradeId })} />
      ) : null}

      {step.name === 'subject' ? (
        <SubjectSelection
          gradeId={step.gradeId}
          onSelectSubject={(subjectId) => setStep({ name: 'unit', subjectId })}
        />
      ) : null}

      {step.name === 'unit' ? (
        <UnitSelection
          subjectId={step.subjectId}
          onSelectUnit={(unitId) => setStep({ name: 'lessons', unitId })}
        />
      ) : null}

      {step.name === 'lessons' ? (
        <LessonList
          unitId={step.unitId}
          onSelectLesson={(lessonId) =>
            setStep({ name: 'lesson-placeholder', lessonId, unitId: step.unitId })
          }
        />
      ) : null}

      {step.name === 'lesson-placeholder' ? (
        <section>
          <h2>صفحة الدرس</h2>
          <p style={{ color: '#6B7280' }}>قيد الإنشاء في المرحلة 1-C.</p>
          <AppButton
            label="العودة إلى الدروس"
            onClick={() => setStep({ name: 'lessons', unitId: step.unitId })}
          />
        </section>
      ) : null}
    </main>
  );
}

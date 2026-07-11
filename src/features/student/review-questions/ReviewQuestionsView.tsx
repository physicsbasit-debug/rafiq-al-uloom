import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { MultipleChoiceQuestionCard } from '@features/quiz/multiple-choice/MultipleChoiceQuestionCard';
import { getReviewQuestionsByLesson } from '@services/data/local-content.repository';

interface ReviewQuestionsViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}

export function ReviewQuestionsView({ lessonId, onBackToLesson }: ReviewQuestionsViewProps) {
  const questions = getReviewQuestionsByLesson(lessonId);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function handleSelectChoice(questionId: string, choiceIndex: number) {
    setAnswers((currentAnswers) => {
      if (currentAnswers[questionId] !== undefined) {
        return currentAnswers;
      }

      return {
        ...currentAnswers,
        [questionId]: choiceIndex,
      };
    });
  }

  return (
    <section>
      <header style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: '0 0 0.4rem', color: '#6B7280', fontWeight: 700 }}>تدريب قصير</p>
        <h2 style={{ margin: 0, color: '#1F2937' }}>أسئلة المراجعة</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.8 }}>
          اختر إجابة واحدة لكل سؤال. بعد اختيارك ستظهر التغذية الراجعة ولن تتمكن من تغيير الإجابة.
        </p>
      </header>

      {questions.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد أسئلة مراجعة مرتبطة بهذا الدرس بعد.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {questions.map((question, index) => (
            <MultipleChoiceQuestionCard
              key={question.id}
              question={question}
              questionNumber={index + 1}
              selectedIndex={answers[question.id]}
              onSelectChoice={handleSelectChoice}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <AppButton label="العودة إلى الدرس" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
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
    setAnswers((current) =>
      current[questionId] !== undefined ? current : { ...current, [questionId]: choiceIndex }
    );
  }

  return (
    <section>
      <header style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.25rem', color: colors.textSecondary, fontWeight: 800 }}>
          تدريب قصير
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>أسئلة المراجعة</h2>
      </header>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
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

      <div style={{ maxWidth: '220px', marginTop: '1rem' }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

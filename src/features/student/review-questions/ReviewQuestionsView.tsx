import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { spacing } from '@design-system/theme/spacing';
import { MultipleChoiceQuestionCard } from '@features/quiz/multiple-choice/MultipleChoiceQuestionCard';
import { useReviewQuestions } from '@services/queries/content-query.hooks';
import type { Question } from '@shared-types/quiz.types';

interface ReviewQuestionsViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}

interface ReviewQuestionsContentProps {
  questions: Question[];
  onBackToLesson: () => void;
}

export function ReviewQuestionsView({
  lessonId,
  onBackToLesson,
}: ReviewQuestionsViewProps) {
  const questionsQuery = useReviewQuestions(lessonId);

  return (
    <QueryBoundary
      isLoading={questionsQuery.isLoading}
      error={questionsQuery.error}
      onRetry={questionsQuery.reload}
    >
      <ReviewQuestionsContent
        questions={questionsQuery.data}
        onBackToLesson={onBackToLesson}
      />
    </QueryBoundary>
  );
}

function ReviewQuestionsContent({
  questions,
  onBackToLesson,
}: ReviewQuestionsContentProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  function handleSelectChoice(questionId: string, choiceIndex: number) {
    setAnswers((current) =>
      current[questionId] !== undefined
        ? current
        : { ...current, [questionId]: choiceIndex }
    );
  }

  return (
    <section>
      <header style={{ marginBottom: spacing.lg }}>
        <p
          style={{
            margin: `0 0 ${spacing.xs}`,
            color: colors.textSecondary,
            fontWeight: 800,
          }}
        >
          تدريب قصير
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>أسئلة المراجعة</h2>
      </header>

      <div style={{ display: 'grid', gap: spacing.md }}>
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

      <div style={{ maxWidth: '220px', marginTop: spacing.lg }}>
        <AppButton
          label="العودة إلى الدرس"
          variant="secondary"
          onClick={onBackToLesson}
        />
      </div>
    </section>
  );
}

import { ChoiceButton } from '@design-system/components/ChoiceButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import { QuestionFeedback } from '@features/quiz/feedback/QuestionFeedback';
import { getQuestionFeedback } from '@features/quiz/quiz-engine';
import type { Question } from '@shared-types/quiz.types';

interface MultipleChoiceQuestionCardProps {
  question: Question;
  questionNumber: number;
  selectedIndex?: number;
  onSelectChoice: (questionId: string, choiceIndex: number) => void;
}

export function MultipleChoiceQuestionCard({
  question,
  questionNumber,
  selectedIndex,
  onSelectChoice,
}: MultipleChoiceQuestionCardProps) {
  const hasAnswered = selectedIndex !== undefined;
  const feedback = hasAnswered ? getQuestionFeedback(question, selectedIndex) : null;

  return (
    <article
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <p
        style={{
          margin: `0 0 ${spacing.xs}`,
          color: colors.textSecondary,
          fontWeight: 800,
        }}
      >
        سؤال <bdi dir="ltr">{questionNumber}</bdi>
      </p>

      <h3
        style={{
          margin: `0 0 ${spacing.md}`,
          color: colors.textPrimary,
          fontSize: typography.fontSize.md,
          lineHeight: typography.lineHeight.xl,
        }}
      >
        {question.prompt}
      </h3>

      <div style={{ display: 'grid', gap: spacing.sm }}>
        {question.choices.map((choice, index) => (
          <ChoiceButton
            key={choice}
            label={String.fromCharCode(65 + index)}
            choice={choice}
            selected={selectedIndex === index}
            disabled={hasAnswered}
            onClick={() => onSelectChoice(question.id, index)}
            selectedHint="(اختيارك)"
          />
        ))}
      </div>

      {feedback ? <QuestionFeedback feedback={feedback} /> : null}
    </article>
  );
}

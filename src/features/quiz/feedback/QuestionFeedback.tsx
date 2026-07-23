import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { QuestionFeedbackResult } from '@features/quiz/quiz-engine';

interface QuestionFeedbackProps {
  feedback: QuestionFeedbackResult;
}

export function QuestionFeedback({ feedback }: QuestionFeedbackProps) {
  return (
    <div
      role="status"
      style={{
        marginTop: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.md,
        backgroundColor: feedback.isCorrect ? colors.successSoft : colors.errorSoft,
      }}
    >
      <p
        style={{
          margin: `0 0 ${spacing.sm}`,
          fontWeight: 900,
          color: feedback.isCorrect ? colors.successDark : colors.errorDark,
        }}
      >
        {feedback.isCorrect ? '✓ إجابة صحيحة' : '✕ إجابة خاطئة'}
      </p>

      {!feedback.isCorrect ? (
        <p
          style={{
            margin: `0 0 ${spacing.sm}`,
            color: colors.textPrimary,
            lineHeight: typography.lineHeight.lg,
          }}
        >
          <strong>الإجابة الصحيحة: </strong>
          {feedback.correctChoice}
        </p>
      ) : null}

      <p
        style={{
          margin: 0,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight.lg,
        }}
      >
        <strong>الشرح: </strong>
        {feedback.explanation}
      </p>
    </div>
  );
}

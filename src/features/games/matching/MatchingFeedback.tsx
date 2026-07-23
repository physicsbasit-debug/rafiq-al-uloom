import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

interface MatchingFeedbackProps {
  message: string;
  isCorrect: boolean;
}

export function MatchingFeedback({ message, isCorrect }: MatchingFeedbackProps) {
  return (
    <div
      role="status"
      style={{
        border: `1px solid ${isCorrect ? colors.success : colors.error}`,
        borderRadius: radius.md,
        padding: spacing.md,
        backgroundColor: isCorrect ? colors.successSoft : colors.errorSoft,
        color: isCorrect ? colors.successDark : colors.errorDark,
        fontWeight: 900,
        lineHeight: typography.lineHeight.lg,
      }}
    >
      {isCorrect ? '✓' : '✕'} {message}
    </div>
  );
}

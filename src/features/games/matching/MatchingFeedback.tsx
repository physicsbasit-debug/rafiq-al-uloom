import { colors } from '@design-system/theme/colors';

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
        borderRadius: '0.85rem',
        padding: '0.75rem',
        backgroundColor: isCorrect ? colors.successSoft : colors.errorSoft,
        color: isCorrect ? colors.successDark : colors.errorDark,
        fontWeight: 900,
        lineHeight: 1.7,
      }}
    >
      {isCorrect ? '✓' : '✕'} {message}
    </div>
  );
}

interface MatchingFeedbackProps {
  message: string;
  isCorrect: boolean;
}

export function MatchingFeedback({ message, isCorrect }: MatchingFeedbackProps) {
  return (
    <div
      role="status"
      style={{
        border: '1px solid #D1D5DB',
        borderRadius: '0.85rem',
        padding: '0.8rem',
        backgroundColor: isCorrect ? '#ECFDF5' : '#FEF2F2',
        color: isCorrect ? '#047857' : '#B91C1C',
        fontWeight: 800,
        lineHeight: 1.8,
      }}
    >
      {isCorrect ? '✓' : '✕'} {message}
    </div>
  );
}

import { colors } from '@design-system/theme/colors';
import type { QuestionFeedbackResult } from '@features/quiz/quiz-engine';

interface QuestionFeedbackProps {
  feedback: QuestionFeedbackResult;
}

export function QuestionFeedback({ feedback }: QuestionFeedbackProps) {
  return (
    <div
      role="status"
      style={{
        marginTop: '0.75rem',
        border: `1px solid ${colors.border}`,
        borderRadius: '0.85rem',
        padding: '0.75rem',
        backgroundColor: feedback.isCorrect ? colors.successSoft : colors.errorSoft,
      }}
    >
      <p
        style={{
          margin: '0 0 0.45rem',
          fontWeight: 900,
          color: feedback.isCorrect ? colors.successDark : colors.errorDark,
        }}
      >
        {feedback.isCorrect ? '✓ إجابة صحيحة' : '✕ إجابة خاطئة'}
      </p>
      {!feedback.isCorrect ? (
        <p style={{ margin: '0 0 0.45rem', color: colors.textPrimary, lineHeight: 1.7 }}>
          <strong>الإجابة الصحيحة: </strong>
          {feedback.correctChoice}
        </p>
      ) : null}
      <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.7 }}>
        <strong>الشرح: </strong>
        {feedback.explanation}
      </p>
    </div>
  );
}

import type { QuestionFeedbackResult } from '@features/quiz/quiz-engine';

interface QuestionFeedbackProps {
  feedback: QuestionFeedbackResult;
}

export function QuestionFeedback({ feedback }: QuestionFeedbackProps) {
  const shouldShowCorrectAnswer = !feedback.isCorrect;

  return (
    <div
      role="status"
      style={{
        marginTop: '0.85rem',
        border: '1px solid #D1D5DB',
        borderRadius: '0.85rem',
        padding: '0.85rem',
        backgroundColor: feedback.isCorrect ? '#ECFDF5' : '#FEF2F2',
      }}
    >
      <p
        style={{
          margin: '0 0 0.5rem',
          fontWeight: 800,
          color: feedback.isCorrect ? '#047857' : '#B91C1C',
        }}
      >
        {feedback.isCorrect ? '✓' : '✕'} {feedback.statusText}
      </p>

      {shouldShowCorrectAnswer ? (
        <p style={{ margin: '0 0 0.5rem', color: '#374151', lineHeight: 1.8 }}>
          <strong>الإجابة الصحيحة: </strong>
          {feedback.correctChoice}
        </p>
      ) : null}

      <p style={{ margin: 0, color: '#374151', lineHeight: 1.8 }}>
        <strong>الشرح: </strong>
        {feedback.explanation}
      </p>
    </div>
  );
}

import type { Question } from '@shared-types/quiz.types';
import { getQuestionFeedback } from '@features/quiz/quiz-engine';
import { QuestionFeedback } from '@features/quiz/feedback/QuestionFeedback';

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
        border: '1px solid #D1D5DB',
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: '#FFFFFF',
      }}
    >
      <p style={{ margin: '0 0 0.35rem', color: '#6B7280', fontWeight: 700 }}>
        سؤال {questionNumber}
      </p>

      <h3 style={{ margin: '0 0 1rem', color: '#1F2937', fontSize: '1rem', lineHeight: 1.8 }}>
        {question.prompt}
      </h3>

      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {question.choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = question.correctAnswerIndex === index;
          const shouldMarkCorrect = hasAnswered && isCorrect;
          const shouldMarkWrong = hasAnswered && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              type="button"
              disabled={hasAnswered}
              onClick={() => onSelectChoice(question.id, index)}
              aria-pressed={isSelected}
              style={{
                width: '100%',
                textAlign: 'right',
                border: shouldMarkCorrect
                  ? '2px solid #059669'
                  : shouldMarkWrong
                    ? '2px solid #DC2626'
                    : '1px solid #D1D5DB',
                borderRadius: '0.85rem',
                backgroundColor: shouldMarkCorrect
                  ? '#ECFDF5'
                  : shouldMarkWrong
                    ? '#FEF2F2'
                    : '#F9FAFB',
                color: '#1F2937',
                padding: '0.8rem',
                cursor: hasAnswered ? 'not-allowed' : 'pointer',
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 800, marginInlineEnd: '0.35rem' }}>
                {String.fromCharCode(65 + index)}.
              </span>
              {choice}
              {hasAnswered && isSelected ? (
                <span style={{ marginInlineStart: '0.45rem', color: '#6B7280' }}>(اختيارك)</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {feedback ? <QuestionFeedback feedback={feedback} /> : null}
    </article>
  );
}

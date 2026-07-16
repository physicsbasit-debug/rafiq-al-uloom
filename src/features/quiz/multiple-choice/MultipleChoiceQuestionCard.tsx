import { ChoiceButton } from '@design-system/components/ChoiceButton';
import { colors } from '@design-system/theme/colors';
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
        borderRadius: '1rem',
        padding: '0.9rem',
        backgroundColor: colors.surface,
      }}
    >
      <p style={{ margin: '0 0 0.3rem', color: colors.textSecondary, fontWeight: 800 }}>
        سؤال <bdi dir="ltr">{questionNumber}</bdi>
      </p>
      <h3 style={{ margin: '0 0 0.8rem', color: colors.textPrimary, fontSize: '1rem', lineHeight: 1.8 }}>
        {question.prompt}
      </h3>

      <div style={{ display: 'grid', gap: '0.55rem' }}>
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

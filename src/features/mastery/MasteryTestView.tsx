import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { ChoiceButton } from '@design-system/components/ChoiceButton';
import { MasteryBadge } from '@design-system/components/MasteryBadge';
import { colors } from '@design-system/theme/colors';
import { getQuestionFeedback } from '@features/quiz/quiz-engine';
import type { MasteryResult } from '@shared-types/mastery.types';
import type { Question } from '@shared-types/quiz.types';
import { getMasteryQuestionsByLesson } from '@services/data/local-content.repository';
import { areAllQuestionsAnswered, calculateScore, type AnswersByQuestionId } from '@utils/scoring';
import { classifyMasteryScore } from './mastery-classifier';
import { getMasteryRecommendation } from './recommendations';

interface MasteryTestViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}

function ReviewItem({
  question,
  questionNumber,
  selectedIndex,
}: {
  question: Question;
  questionNumber: number;
  selectedIndex?: number;
}) {
  const feedback = getQuestionFeedback(question, selectedIndex ?? -1);

  return (
    <article
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '0.9rem',
        padding: '0.85rem',
        backgroundColor: colors.surface,
      }}
    >
      <p style={{ margin: '0 0 0.3rem', color: colors.textSecondary, fontWeight: 800 }}>
        السؤال <bdi dir="ltr">{questionNumber}</bdi>
      </p>
      <h4 style={{ margin: '0 0 0.6rem', color: colors.textPrimary }}>{question.prompt}</h4>
      <p
        style={{
          color: feedback.isCorrect ? colors.successDark : colors.errorDark,
          fontWeight: 900,
        }}
      >
        {feedback.isCorrect ? '✓ إجابة صحيحة' : '✕ إجابة خاطئة'}
      </p>
      <p style={{ color: colors.textPrimary }}>
        <strong>اختيارك: </strong>
        {feedback.selectedChoice}
      </p>
      <p style={{ color: colors.textPrimary }}>
        <strong>الإجابة الصحيحة: </strong>
        {feedback.correctChoice}
      </p>
      <p style={{ color: colors.textPrimary, lineHeight: 1.7 }}>
        <strong>الشرح: </strong>
        {feedback.explanation}
      </p>
    </article>
  );
}

export function MasteryTestView({ lessonId, onBackToLesson }: MasteryTestViewProps) {
  const questions = getMasteryQuestionsByLesson(lessonId);
  const [answers, setAnswers] = useState<AnswersByQuestionId>({});
  const [result, setResult] = useState<MasteryResult | null>(null);
  const isComplete = areAllQuestionsAnswered(questions, answers);

  function handleSelectChoice(questionId: string, choiceIndex: number) {
    if (!result && answers[questionId] === undefined) {
      setAnswers((current) => ({ ...current, [questionId]: choiceIndex }));
    }
  }

  function handleFinishTest() {
    if (!isComplete) return;
    const scoreResult = calculateScore(questions, answers);
    const classification = classifyMasteryScore(scoreResult.score);

    setResult({
      id: `mastery-${lessonId}-local-session`,
      studentId: 'local-session',
      lessonId,
      score: scoreResult.score,
      classification,
      recommendation: getMasteryRecommendation(classification),
      createdAt: 'local-session',
    });
  }

  return (
    <section>
      <header style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.25rem', color: colors.textSecondary, fontWeight: 800 }}>
          قياس الإتقان
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>اختبار الإتقان</h2>
      </header>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {questions.map((question, questionIndex) => {
          const selectedIndex = answers[question.id];
          const hasAnswered = selectedIndex !== undefined;

          return (
            <article
              key={question.id}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: '1rem',
                padding: '0.9rem',
                backgroundColor: colors.surface,
              }}
            >
              <p style={{ margin: '0 0 0.3rem', color: colors.textSecondary, fontWeight: 800 }}>
                سؤال <bdi dir="ltr">{questionIndex + 1}</bdi>
              </p>
              <h3
                style={{
                  margin: '0 0 0.8rem',
                  color: colors.textPrimary,
                  fontSize: '1rem',
                  lineHeight: 1.8,
                }}
              >
                {question.prompt}
              </h3>
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {question.choices.map((choice, choiceIndex) => (
                  <ChoiceButton
                    key={choice}
                    label={String.fromCharCode(65 + choiceIndex)}
                    choice={choice}
                    selected={selectedIndex === choiceIndex}
                    disabled={hasAnswered || Boolean(result)}
                    onClick={() => handleSelectChoice(question.id, choiceIndex)}
                    selectedHint="(تم اختيارها)"
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {!result ? (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: colors.textSecondary, lineHeight: 1.7 }}>
            تمت الإجابة عن <bdi dir="ltr">{Object.keys(answers).length}</bdi> من{' '}
            <bdi dir="ltr">{questions.length}</bdi> أسئلة.
          </p>
          {!isComplete ? (
            <p role="status" style={{ color: colors.warning, fontWeight: 800 }}>
              أكمل الإجابة عن جميع الأسئلة لتفعيل زر إنهاء الاختبار.
            </p>
          ) : null}
          <AppButton label="إنهاء الاختبار" disabled={!isComplete} onClick={handleFinishTest} />
        </div>
      ) : (
        <section
          style={{
            marginTop: '1rem',
            border: `1px solid ${colors.border}`,
            borderRadius: '1rem',
            padding: '1rem',
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <h3 style={{ marginTop: 0, color: colors.textPrimary }}>نتيجة اختبار الإتقان</h3>
          <p style={{ color: colors.textPrimary, fontWeight: 900 }}>
            الدرجة: <bdi dir="ltr">{result.score}</bdi> من <bdi dir="ltr">100</bdi>
          </p>
          <MasteryBadge classification={result.classification} />
          <p style={{ color: colors.textPrimary, lineHeight: 1.7 }}>
            <strong>التوصية: </strong>
            {result.recommendation}
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {questions.map((question, index) => (
              <ReviewItem
                key={question.id}
                question={question}
                questionNumber={index + 1}
                selectedIndex={answers[question.id]}
              />
            ))}
          </div>
        </section>
      )}

      <div style={{ maxWidth: '220px', marginTop: '1rem' }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { MasteryBadge } from '@design-system/components/MasteryBadge';
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

interface ReviewItemProps {
  question: Question;
  questionNumber: number;
  selectedIndex?: number;
}

function ReviewItem({ question, questionNumber, selectedIndex }: ReviewItemProps) {
  const feedback = getQuestionFeedback(question, selectedIndex ?? -1);

  return (
    <article
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: '0.9rem',
        padding: '0.9rem',
        backgroundColor: '#FFFFFF',
      }}
    >
      <p style={{ margin: '0 0 0.35rem', color: '#6B7280', fontWeight: 800 }}>
        السؤال {questionNumber}
      </p>
      <h4 style={{ margin: '0 0 0.75rem', color: '#1F2937', lineHeight: 1.8 }}>
        {question.prompt}
      </h4>

      <p
        style={{
          margin: '0 0 0.45rem',
          color: feedback.isCorrect ? '#047857' : '#B91C1C',
          fontWeight: 900,
        }}
      >
        {feedback.isCorrect ? '✓ إجابة صحيحة' : '✕ إجابة خاطئة'}
      </p>

      <p style={{ margin: '0 0 0.45rem', color: '#374151', lineHeight: 1.8 }}>
        <strong>اختيارك: </strong>
        {feedback.selectedChoice ?? 'لم يجب'}
      </p>

      <p style={{ margin: '0 0 0.45rem', color: '#374151', lineHeight: 1.8 }}>
        <strong>الإجابة الصحيحة: </strong>
        {feedback.correctChoice}
      </p>

      <p style={{ margin: 0, color: '#374151', lineHeight: 1.8 }}>
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
    if (result || answers[questionId] !== undefined) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: choiceIndex,
    }));
  }

  function handleFinishTest() {
    if (!isComplete) {
      return;
    }

    const scoreResult = calculateScore(questions, answers);
    const classification = classifyMasteryScore(scoreResult.score);
    const recommendation = getMasteryRecommendation(classification);

    setResult({
      id: `mastery-${lessonId}-${Date.now()}`,
      studentId: 'local-session',
      lessonId,
      score: scoreResult.score,
      classification,
      recommendation,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <section>
      <header style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: '0 0 0.4rem', color: '#6B7280', fontWeight: 700 }}>قياس الإتقان</p>
        <h2 style={{ margin: 0, color: '#1F2937' }}>اختبار الإتقان</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.8 }}>
          أجب عن الأسئلة الخمسة. لن تظهر التغذية الراجعة أثناء الحل، وستظهر الدرجة والمراجعة بعد
          إنهاء الاختبار.
        </p>
      </header>

      {questions.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد أسئلة إتقان مرتبطة بهذا الدرس بعد.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {questions.map((question, questionIndex) => {
            const selectedIndex = answers[question.id];
            const hasAnswered = selectedIndex !== undefined;

            return (
              <article
                key={question.id}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: '1rem',
                  padding: '1rem',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <p style={{ margin: '0 0 0.35rem', color: '#6B7280', fontWeight: 700 }}>
                  سؤال {questionIndex + 1}
                </p>
                <h3 style={{ margin: '0 0 1rem', color: '#1F2937', fontSize: '1rem', lineHeight: 1.8 }}>
                  {question.prompt}
                </h3>

                <div style={{ display: 'grid', gap: '0.65rem' }}>
                  {question.choices.map((choice, choiceIndex) => {
                    const isSelected = selectedIndex === choiceIndex;

                    return (
                      <button
                        key={choice}
                        type="button"
                        disabled={hasAnswered || Boolean(result)}
                        onClick={() => handleSelectChoice(question.id, choiceIndex)}
                        aria-pressed={isSelected}
                        style={{
                          width: '100%',
                          textAlign: 'right',
                          border: isSelected ? '2px solid #2563EB' : '1px solid #D1D5DB',
                          borderRadius: '0.85rem',
                          backgroundColor: isSelected ? '#EFF6FF' : '#F9FAFB',
                          color: '#1F2937',
                          padding: '0.8rem',
                          cursor: hasAnswered || result ? 'not-allowed' : 'pointer',
                          lineHeight: 1.6,
                        }}
                      >
                        <span style={{ fontWeight: 800, marginInlineEnd: '0.35rem' }}>
                          {String.fromCharCode(65 + choiceIndex)}.
                        </span>
                        {choice}
                        {isSelected ? (
                          <span style={{ marginInlineStart: '0.45rem', color: '#6B7280' }}>
                            (تم اختيارها)
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!result ? (
        <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
          <p style={{ margin: 0, color: '#6B7280', lineHeight: 1.8 }}>
            تمت الإجابة عن {Object.keys(answers).length} من {questions.length} أسئلة.
          </p>
          <AppButton label="إنهاء الاختبار" disabled={!isComplete} onClick={handleFinishTest} />
        </div>
      ) : (
        <section
          style={{
            marginTop: '1.5rem',
            border: '1px solid #D1D5DB',
            borderRadius: '1rem',
            padding: '1rem',
            backgroundColor: '#F9FAFB',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', color: '#1F2937' }}>نتيجة اختبار الإتقان</h3>

          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: '#1F2937', fontWeight: 900 }}>
              الدرجة: {result.score} من 100
            </p>
            <p style={{ margin: 0 }}>
              <MasteryBadge classification={result.classification} />
            </p>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.8 }}>
              <strong>التوصية: </strong>
              {result.recommendation}
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
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

      <div style={{ marginTop: '1.5rem' }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

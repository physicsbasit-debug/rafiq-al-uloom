import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import {
  evaluateNumericTask,
  type NumericAnswerEvaluation,
} from '@features/data-activities/engine/data-activity.engine';
import type { NumericDataTask, ScientificDataActivity } from '@shared-types/data-activity.types';

interface DataActivityRunnerProps {
  activity: ScientificDataActivity;
  onBack: () => void;
}

const GRAPH_WIDTH = 720;
const GRAPH_HEIGHT = 360;
const GRAPH_MARGIN = {
  top: 28,
  right: 28,
  bottom: 72,
  left: 78,
} as const;

const GRAPH_COLORS = [colors.primary, colors.success, colors.warning, colors.error] as const;

const inputStyle = {
  width: '100%',
  maxWidth: '240px',
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radius.md,
  padding: spacing.sm,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  font: 'inherit',
  boxSizing: 'border-box' as const,
};

function labelWithUnit(label: string, unit: string): string {
  return unit.trim() ? `${label} (${unit})` : label;
}

function formatNumber(value: number): string {
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  return Number(normalized.toPrecision(6)).toString();
}

function DataTable({ activity }: { activity: ScientificDataActivity }) {
  const { dataset } = activity.config;

  return (
    <section
      aria-labelledby={`${activity.id}-table-title`}
      style={{ display: 'grid', gap: spacing.sm }}
    >
      <h3 id={`${activity.id}-table-title`} style={{ margin: 0, color: colors.textPrimary }}>
        جدول البيانات
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table
          aria-label="جدول البيانات العلمية"
          dir="ltr"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: colors.surface,
          }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  border: `1px solid ${colors.border}`,
                  padding: spacing.sm,
                  backgroundColor: colors.surfaceMuted,
                  color: colors.textPrimary,
                }}
              >
                {labelWithUnit(dataset.x.label, dataset.x.unit)}
              </th>
              {dataset.series.map((series) => (
                <th
                  key={series.id}
                  scope="col"
                  style={{
                    border: `1px solid ${colors.border}`,
                    padding: spacing.sm,
                    backgroundColor: colors.surfaceMuted,
                    color: colors.textPrimary,
                  }}
                >
                  {labelWithUnit(series.label, series.unit)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.x.values.map((xValue, pointIndex) => (
              <tr key={`${activity.id}-data-row-${pointIndex}`}>
                <th
                  scope="row"
                  style={{
                    border: `1px solid ${colors.border}`,
                    padding: spacing.sm,
                    color: colors.textPrimary,
                    fontWeight: 800,
                  }}
                >
                  {formatNumber(xValue)}
                </th>
                {dataset.series.map((series) => {
                  const value = series.values[pointIndex];

                  if (value === undefined) {
                    throw new Error(`Missing data point for series ${JSON.stringify(series.id)}.`);
                  }

                  return (
                    <td
                      key={`${series.id}-${pointIndex}`}
                      style={{
                        border: `1px solid ${colors.border}`,
                        padding: spacing.sm,
                        textAlign: 'center',
                        color: colors.textPrimary,
                      }}
                    >
                      {formatNumber(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataLineGraph({ activity }: { activity: ScientificDataActivity }) {
  const { dataset, presentation } = activity.config;
  const allYValues = dataset.series.flatMap((series) => series.values);
  const firstXValue = dataset.x.values[0];
  const lastXValue = dataset.x.values[dataset.x.values.length - 1];
  const firstYValue = allYValues[0];

  if (firstXValue === undefined || lastXValue === undefined || firstYValue === undefined) {
    return null;
  }

  let yMin = Math.min(...allYValues);
  let yMax = Math.max(...allYValues);

  if (yMin === yMax) {
    const padding = Math.abs(firstYValue) > 0 ? Math.abs(firstYValue) * 0.1 : 1;
    yMin -= padding;
    yMax += padding;
  }

  const plotLeft = GRAPH_MARGIN.left;
  const plotRight = GRAPH_WIDTH - GRAPH_MARGIN.right;
  const plotTop = GRAPH_MARGIN.top;
  const plotBottom = GRAPH_HEIGHT - GRAPH_MARGIN.bottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const xSpan = lastXValue - firstXValue;
  const ySpan = yMax - yMin;

  const xToPixel = (value: number) =>
    xSpan === 0 ? plotLeft + plotWidth / 2 : plotLeft + ((value - firstXValue) / xSpan) * plotWidth;

  const yToPixel = (value: number) => plotBottom - ((value - yMin) / ySpan) * plotHeight;

  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + (index / 4) * ySpan);

  return (
    <section
      aria-labelledby={`${activity.id}-graph-title`}
      style={{ display: 'grid', gap: spacing.sm }}
    >
      <h3 id={`${activity.id}-graph-title`} style={{ margin: 0, color: colors.textPrimary }}>
        الرسم الخطي
      </h3>

      <p style={{ margin: 0, color: colors.textSecondary, lineHeight: typography.lineHeight.xl }}>
        يزداد المحور الأفقي من اليسار إلى اليمين، ويزداد المحور الرأسي من الأسفل إلى الأعلى.
      </p>

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: spacing.sm,
          backgroundColor: colors.surface,
        }}
      >
        <svg
          role="img"
          aria-label={`رسم خطي يوضح ${presentation.yAxisLabel} حسب ${presentation.xAxisLabel}`}
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          style={{ display: 'block', width: '100%', height: 'auto', direction: 'ltr' }}
        >
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotRight}
            y2={plotBottom}
            stroke={colors.textSecondary}
            strokeWidth="2"
          />
          <line
            x1={plotLeft}
            y1={plotTop}
            x2={plotLeft}
            y2={plotBottom}
            stroke={colors.textSecondary}
            strokeWidth="2"
          />

          {dataset.x.values.map((value, index) => {
            const x = xToPixel(value);

            return (
              <g key={`${activity.id}-x-tick-${index}`}>
                <line
                  x1={x}
                  y1={plotBottom}
                  x2={x}
                  y2={plotBottom + 7}
                  stroke={colors.textSecondary}
                />
                <text
                  x={x}
                  y={plotBottom + 24}
                  textAnchor="middle"
                  fontSize="13"
                  fill={colors.textSecondary}
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          {yTicks.map((value, index) => {
            const y = yToPixel(value);

            return (
              <g key={`${activity.id}-y-tick-${index}`}>
                <line x1={plotLeft - 7} y1={y} x2={plotLeft} y2={y} stroke={colors.textSecondary} />
                <text
                  x={plotLeft - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="13"
                  fill={colors.textSecondary}
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          <text
            x={plotLeft + plotWidth / 2}
            y={GRAPH_HEIGHT - 18}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={colors.textPrimary}
          >
            {presentation.xAxisLabel}
          </text>

          <text
            x={20}
            y={plotTop + plotHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={colors.textPrimary}
            transform={`rotate(-90 20 ${plotTop + plotHeight / 2})`}
          >
            {presentation.yAxisLabel}
          </text>

          {dataset.series.map((series, seriesIndex) => {
            const color = GRAPH_COLORS[seriesIndex % GRAPH_COLORS.length] ?? colors.primary;
            const points = series.values.map((value, pointIndex) => {
              const xValue = dataset.x.values[pointIndex];

              if (xValue === undefined) {
                throw new Error(`Missing x value for point ${pointIndex}.`);
              }

              return {
                x: xToPixel(xValue),
                y: yToPixel(value),
              };
            });

            return (
              <g key={series.id}>
                <polyline
                  data-series-id={series.id}
                  points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((point, pointIndex) => (
                  <circle
                    key={`${series.id}-point-${pointIndex}`}
                    data-series-id={series.id}
                    data-point-index={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={color}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div
        aria-label="مفتاح الرسم"
        style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md, color: colors.textPrimary }}
      >
        {dataset.series.map((series, seriesIndex) => {
          const color = GRAPH_COLORS[seriesIndex % GRAPH_COLORS.length] ?? colors.primary;

          return (
            <span
              key={`${series.id}-legend`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '999px',
                  backgroundColor: color,
                  display: 'inline-block',
                }}
              />
              {labelWithUnit(series.label, series.unit)}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function evaluationMessage(evaluation: NumericAnswerEvaluation): string {
  if (evaluation.status === 'empty') {
    return 'أدخل إجابة أولًا.';
  }

  if (evaluation.status === 'invalid_number') {
    return 'أدخل قيمة رقمية صالحة باستخدام الأرقام 0-9.';
  }

  if (evaluation.status === 'correct') {
    return 'إجابة صحيحة.';
  }

  return 'الإجابة غير صحيحة. راجع البيانات وحاول مرة أخرى.';
}

function evaluationStyle(evaluation: NumericAnswerEvaluation) {
  if (evaluation.status === 'correct') {
    return {
      border: `1px solid ${colors.success}`,
      backgroundColor: colors.successSoft,
      color: colors.successDark,
    };
  }

  if (evaluation.status === 'incorrect') {
    return {
      border: `1px solid ${colors.error}`,
      backgroundColor: colors.errorSoft,
      color: colors.errorDark,
    };
  }

  return {
    border: `1px solid ${colors.warning}`,
    backgroundColor: colors.warningSoft,
    color: colors.warning,
  };
}

function DataTaskCard({
  activityId,
  task,
  index,
  answer,
  evaluation,
  onAnswerChange,
  onCheck,
}: {
  activityId: string;
  task: NumericDataTask;
  index: number;
  answer: string;
  evaluation: NumericAnswerEvaluation | undefined;
  onAnswerChange: (value: string) => void;
  onCheck: () => void;
}) {
  const inputId = `${activityId}-${task.id}-answer`;
  const headingId = `${activityId}-${task.id}-title`;

  return (
    <article
      aria-labelledby={headingId}
      style={{
        display: 'grid',
        gap: spacing.sm,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <h3 id={headingId} style={{ margin: 0, color: colors.textPrimary }}>
        المهمة {index + 1}
      </h3>

      <label
        htmlFor={inputId}
        style={{ color: colors.textPrimary, fontWeight: 800, lineHeight: typography.lineHeight.xl }}
      >
        {task.prompt}
      </label>

      {task.unit.trim() ? (
        <p style={{ margin: 0, color: colors.textSecondary }}>الوحدة المطلوبة: {task.unit}</p>
      ) : null}

      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={answer}
        onChange={(event) => onAnswerChange(event.currentTarget.value)}
        placeholder="مثال: 1.7"
        style={inputStyle}
      />

      <div style={{ maxWidth: '190px' }}>
        <AppButton label="تحقق من الإجابة" onClick={onCheck} />
      </div>

      {evaluation ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: spacing.sm,
            borderRadius: radius.md,
            fontWeight: 800,
            ...evaluationStyle(evaluation),
          }}
        >
          {evaluationMessage(evaluation)}
        </p>
      ) : null}
    </article>
  );
}

export function DataActivityRunner({ activity, onBack }: DataActivityRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Partial<Record<string, NumericAnswerEvaluation>>>(
    {}
  );

  const showTable =
    activity.config.presentation.mode === 'table' ||
    activity.config.presentation.mode === 'table_and_line_graph';
  const showGraph =
    activity.config.presentation.mode === 'line_graph' ||
    activity.config.presentation.mode === 'table_and_line_graph';

  return (
    <section style={{ display: 'grid', gap: spacing.lg }}>
      <header>
        <p style={{ margin: `0 0 ${spacing.xs}`, color: colors.textSecondary, fontWeight: 800 }}>
          تحليل البيانات والرسوم
        </p>
        <h2 style={{ margin: `0 0 ${spacing.sm}`, color: colors.textPrimary }}>{activity.title}</h2>
        <p style={{ margin: 0, color: colors.textSecondary, lineHeight: typography.lineHeight.xl }}>
          {activity.instructions}
        </p>
      </header>

      <section
        aria-labelledby={`${activity.id}-context-title`}
        style={{
          display: 'grid',
          gap: spacing.sm,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: spacing.lg,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <h3 id={`${activity.id}-context-title`} style={{ margin: 0, color: colors.textPrimary }}>
          السياق العلمي
        </h3>
        <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
          {activity.config.context}
        </p>
      </section>

      {showTable ? <DataTable activity={activity} /> : null}
      {showGraph ? <DataLineGraph activity={activity} /> : null}

      <section
        aria-labelledby={`${activity.id}-tasks-title`}
        style={{ display: 'grid', gap: spacing.md }}
      >
        <h3 id={`${activity.id}-tasks-title`} style={{ margin: 0, color: colors.textPrimary }}>
          مهام تحليل البيانات
        </h3>

        {activity.config.tasks.map((task, index) => (
          <DataTaskCard
            key={task.id}
            activityId={activity.id}
            task={task}
            index={index}
            answer={answers[task.id] ?? ''}
            evaluation={evaluations[task.id]}
            onAnswerChange={(value) => {
              setAnswers((current) => ({ ...current, [task.id]: value }));
              setEvaluations((current) => ({ ...current, [task.id]: undefined }));
            }}
            onCheck={() => {
              const evaluation = evaluateNumericTask(
                activity.config.dataset,
                task,
                answers[task.id] ?? ''
              );
              setEvaluations((current) => ({ ...current, [task.id]: evaluation }));
            }}
          />
        ))}
      </section>

      <div style={{ maxWidth: '220px' }}>
        <AppButton label="العودة إلى الأنشطة" variant="secondary" onClick={onBack} />
      </div>
    </section>
  );
}

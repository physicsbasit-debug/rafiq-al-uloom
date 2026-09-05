import { useMemo, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import { getActivityRegistryEntry } from '@features/activities/activity-registry';
import { StudentActivityHost } from '@features/activities/StudentActivityHost';
import { getStudentExperimentSafetyDecision } from '@features/activities/student-experiment-safety';
import { useActivitiesByLesson } from '@services/queries/activity-query.hooks';
import { useObjectivesByIds } from '@services/queries/content-query.hooks';
import type { AvailableLearningActivity } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';

interface StudentActivityHubProps {
  lessonId: string;
  onBackToLesson: () => void;
}

interface ActivityHubObjectivesLoaderProps {
  activities: AvailableLearningActivity[];
  onBackToLesson: () => void;
}

function EmptyActivityState({ onBackToLesson }: { onBackToLesson: () => void }) {
  return (
    <section>
      <h2 style={{ color: colors.textPrimary }}>الأنشطة العلمية</h2>
      <p style={{ color: colors.textSecondary }}>لا توجد أنشطة علمية متاحة لهذا الدرس حاليًا.</p>
      <div style={{ maxWidth: '220px', marginTop: spacing.lg }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

function ActivityHubContent({
  activities,
  objectives,
  onBackToLesson,
  onRetryObjectives,
}: {
  activities: AvailableLearningActivity[];
  objectives: Objective[];
  onBackToLesson: () => void;
  onRetryObjectives: () => void;
}) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const objectivesById = useMemo(
    () => new Map(objectives.map((objective) => [objective.id, objective])),
    [objectives]
  );

  const invalidLink = activities
    .flatMap((activity) =>
      activity.objectiveIds.map((objectiveId) => ({
        activity,
        objectiveId,
        objective: objectivesById.get(objectiveId),
      }))
    )
    .find(({ activity, objective }) => !objective || objective.lessonId !== activity.lessonId);

  if (invalidLink) {
    return (
      <div
        role="alert"
        style={{
          border: `1px solid ${colors.error}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          backgroundColor: colors.errorSoft,
          color: colors.errorDark,
        }}
      >
        <p style={{ margin: `0 0 ${spacing.md}` }}>
          تعذر تحميل الأنشطة لأن أحد ارتباطات أهداف التعلم مفقود أو غير متوافق مع الدرس.
        </p>
        <div style={{ maxWidth: '220px' }}>
          <AppButton label="إعادة المحاولة" variant="secondary" onClick={onRetryObjectives} />
        </div>
      </div>
    );
  }

  if (selectedActivityId) {
    const selectedActivity = activities.find((activity) => activity.id === selectedActivityId);

    if (!selectedActivity) {
      return (
        <div role="alert">
          <p>تعذر العثور على النشاط المحدد.</p>
          <AppButton
            label="العودة إلى الأنشطة"
            variant="secondary"
            onClick={() => setSelectedActivityId(null)}
          />
        </div>
      );
    }

    return (
      <StudentActivityHost
        activity={selectedActivity}
        objectivesById={objectivesById}
        onBackToActivities={() => setSelectedActivityId(null)}
      />
    );
  }

  return (
    <section>
      <header style={{ marginBottom: spacing.lg }}>
        <p
          style={{
            margin: `0 0 ${spacing.xs}`,
            color: colors.textSecondary,
            fontWeight: 800,
          }}
        >
          تعلّم بالتجربة والتفاعل
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>الأنشطة العلمية</h2>
      </header>

      <div style={{ display: 'grid', gap: spacing.md }}>
        {activities.map((activity) => {
          const registryEntry = getActivityRegistryEntry(activity.kind);
          const linkedObjectives = activity.objectiveIds.map(
            (objectiveId) => objectivesById.get(objectiveId) as Objective
          );
          const experimentSafety =
            activity.kind === 'experiment'
              ? getStudentExperimentSafetyDecision(activity.content.safetyLevel)
              : null;

          return (
            <article
              key={activity.id}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: radius.lg,
                padding: spacing.lg,
                backgroundColor: colors.surface,
              }}
            >
              <p
                style={{
                  margin: `0 0 ${spacing.xs}`,
                  color: colors.textSecondary,
                  fontWeight: 800,
                }}
              >
                {registryEntry?.label ?? activity.kind}
              </p>

              <h3 style={{ margin: `0 0 ${spacing.sm}`, color: colors.textPrimary }}>
                {activity.title}
              </h3>

              <p
                style={{ margin: `0 0 ${spacing.xs}`, color: colors.textPrimary, fontWeight: 900 }}
              >
                أهداف التعلم:
              </p>
              <ul
                style={{
                  margin: `0 0 ${spacing.md}`,
                  paddingInlineStart: spacing.lg,
                  color: colors.textPrimary,
                  lineHeight: typography.lineHeight.xl,
                }}
              >
                {linkedObjectives.map((objective) => (
                  <li key={objective.id}>{objective.text}</li>
                ))}
              </ul>

              {experimentSafety ? (
                <p
                  style={{
                    margin: `0 0 ${spacing.md}`,
                    padding: spacing.sm,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceMuted,
                    color: colors.textPrimary,
                    fontWeight: 800,
                  }}
                >
                  السلامة: {experimentSafety.safetyLabel}
                </p>
              ) : null}

              {experimentSafety?.mode === 'blocked' ? (
                <p
                  role="status"
                  style={{ margin: 0, color: colors.textSecondary, fontWeight: 900 }}
                >
                  غير متاح للتنفيذ
                </p>
              ) : (
                <div style={{ maxWidth: '220px' }}>
                  <AppButton
                    label={experimentSafety?.hubActionLabel ?? 'فتح النشاط'}
                    onClick={() => setSelectedActivityId(activity.id)}
                  />
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div style={{ maxWidth: '220px', marginTop: spacing.lg }}>
        <AppButton label="العودة إلى الدرس" variant="secondary" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

function ActivityHubObjectivesLoader({
  activities,
  onBackToLesson,
}: ActivityHubObjectivesLoaderProps) {
  const objectiveIds = useMemo(
    () => [...new Set(activities.flatMap((activity) => activity.objectiveIds))],
    [activities]
  );
  const objectivesQuery = useObjectivesByIds(objectiveIds);

  return (
    <QueryBoundary
      isLoading={objectivesQuery.isLoading}
      error={objectivesQuery.error}
      onRetry={objectivesQuery.reload}
    >
      <ActivityHubContent
        activities={activities}
        objectives={objectivesQuery.data}
        onBackToLesson={onBackToLesson}
        onRetryObjectives={objectivesQuery.reload}
      />
    </QueryBoundary>
  );
}

export function StudentActivityHub({ lessonId, onBackToLesson }: StudentActivityHubProps) {
  const activitiesQuery = useActivitiesByLesson(lessonId);

  return (
    <QueryBoundary
      isLoading={activitiesQuery.isLoading}
      error={activitiesQuery.error}
      onRetry={activitiesQuery.reload}
    >
      {activitiesQuery.data.length === 0 ? (
        <EmptyActivityState onBackToLesson={onBackToLesson} />
      ) : (
        <ActivityHubObjectivesLoader
          activities={activitiesQuery.data}
          onBackToLesson={onBackToLesson}
        />
      )}
    </QueryBoundary>
  );
}

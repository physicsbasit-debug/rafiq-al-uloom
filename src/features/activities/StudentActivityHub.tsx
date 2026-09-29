import { useMemo, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { getActivityRegistryEntry } from '@features/activities/activity-registry';
import { StudentActivityHost } from '@features/activities/StudentActivityHost';
import { getStudentExperimentSafetyDecision } from '@features/activities/student-experiment-safety';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { StudentIcon, type StudentIconName } from '@features/student/navigation/StudentIcon';
import { useActivitiesByLesson } from '@services/queries/activity-query.hooks';
import { useObjectivesByIds } from '@services/queries/content-query.hooks';
import type { AvailableLearningActivity, LearningActivityKind } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';

interface StudentActivityHubProps {
  lessonId: string;
  onBackToLesson: () => void;
}

interface ActivityHubObjectivesLoaderProps {
  activities: AvailableLearningActivity[];
  onBackToLesson: () => void;
}

const activityIcon: Record<LearningActivityKind, StudentIconName> = {
  matching: 'game',
  experiment: 'experiment',
  simulation: 'simulation',
  inquiry: 'inquiry',
  data: 'data',
};

function EmptyActivityState({ onBackToLesson }: { onBackToLesson: () => void }) {
  return (
    <section className="rafiq-empty-learning-state">
      <span aria-hidden="true">
        <StudentIcon name="activities" width="38" height="38" />
      </span>
      <h2>الأنشطة العلمية</h2>
      <p>لا توجد أنشطة علمية متاحة لهذا الدرس حاليًا.</p>
      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
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
    <section className="rafiq-activity-hub">
      <header className="rafiq-learning-hub-hero">
        <span className="rafiq-learning-hub-hero-icon" aria-hidden="true">
          <StudentIcon name="activities" width="34" height="34" />
        </span>
        <div>
          <p>تعلّم بالتجربة والتفاعل</p>
          <h2>الأنشطة العلمية</h2>
          <span>اختر نشاطًا، نفّذه، ثم اربط ما لاحظته بهدف التعلم.</span>
        </div>
      </header>

      <div className="rafiq-activity-grid">
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
            <article key={activity.id} className="rafiq-activity-card">
              <div className="rafiq-activity-card-head">
                <span className="rafiq-activity-kind-icon" aria-hidden="true">
                  <StudentIcon name={activityIcon[activity.kind]} width="28" height="28" />
                </span>
                <div>
                  <span className="rafiq-activity-kind-chip">
                    {registryEntry?.label ?? activity.kind}
                  </span>
                  <h3>{activity.title}</h3>
                </div>
              </div>

              <div className="rafiq-activity-objectives">
                <strong>ما الذي ستتعلّمه؟</strong>
                <ul>
                  {linkedObjectives.map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
                </ul>
              </div>

              {experimentSafety ? (
                <p className="rafiq-activity-safety">السلامة: {experimentSafety.safetyLabel}</p>
              ) : null}

              {experimentSafety?.mode === 'blocked' ? (
                <p role="status" className="rafiq-activity-blocked">
                  غير متاح للتنفيذ
                </p>
              ) : (
                <button
                  type="button"
                  className="rafiq-activity-open"
                  onClick={() => setSelectedActivityId(activity.id)}
                >
                  {experimentSafety?.hubActionLabel ?? 'فتح النشاط'}
                  <StudentIcon name="chevron-left" width="20" height="20" />
                </button>
              )}
            </article>
          );
        })}
      </div>

      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
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

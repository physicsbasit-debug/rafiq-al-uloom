import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { getActivityRegistryEntry } from '@features/activities/activity-registry';
import { getStudentExperimentSafetyDecision } from '@features/activities/student-experiment-safety';
import { getStudentActivityRenderer } from '@features/activities/student-activity-renderer.registry';
import type { AvailableLearningActivity } from '@shared-types/activity.types';
import type { Objective } from '@shared-types/content.types';

interface StudentActivityHostProps {
  activity: AvailableLearningActivity;
  objectivesById: ReadonlyMap<string, Objective>;
  onBackToActivities: () => void;
}

function HostError({
  message,
  onBackToActivities,
}: {
  message: string;
  onBackToActivities: () => void;
}) {
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
      <p style={{ margin: `0 0 ${spacing.md}` }}>{message}</p>
      <div style={{ maxWidth: '220px' }}>
        <AppButton label="العودة إلى الأنشطة" variant="secondary" onClick={onBackToActivities} />
      </div>
    </div>
  );
}

export function StudentActivityHost({
  activity,
  objectivesById,
  onBackToActivities,
}: StudentActivityHostProps) {
  const registryEntry = getActivityRegistryEntry(activity.kind);

  if (!registryEntry || registryEntry.availability !== 'available') {
    return (
      <HostError
        message="هذا النوع من الأنشطة غير متاح للتشغيل حاليًا."
        onBackToActivities={onBackToActivities}
      />
    );
  }

  const invalidObjective = activity.objectiveIds.find((objectiveId) => {
    const objective = objectivesById.get(objectiveId);
    return !objective || objective.lessonId !== activity.lessonId;
  });

  if (invalidObjective) {
    return (
      <HostError
        message="تعذر فتح النشاط لأن ارتباطه بأهداف التعلم غير مكتمل."
        onBackToActivities={onBackToActivities}
      />
    );
  }

  if (activity.kind === 'experiment') {
    const safetyDecision = getStudentExperimentSafetyDecision(activity.content.safetyLevel);

    if (!safetyDecision.allowHost) {
      return (
        <HostError
          message="هذه التجربة غير متاحة للتنفيذ للطالب بسبب متطلبات السلامة."
          onBackToActivities={onBackToActivities}
        />
      );
    }
  }

  const renderer = getStudentActivityRenderer(activity.kind);

  if (!renderer) {
    return (
      <HostError
        message="لا يوجد مشغّل متاح لهذا النشاط."
        onBackToActivities={onBackToActivities}
      />
    );
  }

  return <>{renderer({ activity, objectivesById, onBackToActivities })}</>;
}

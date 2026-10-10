import { StudentIcon, type StudentIconName } from '@features/student/navigation/StudentIcon';
import type { LessonActionAccess } from '@features/student/lesson-progress/lesson-unlock';

interface LessonAction {
  readonly label: string;
  readonly description: string;
  readonly icon: StudentIconName;
  readonly onClick: () => void;
  readonly featured?: boolean;
  readonly enabled: boolean;
  readonly lockedDescription?: string;
}

interface LessonActionGridProps {
  readonly onOpenReviewQuestions: () => void;
  readonly onOpenActivities: () => void;
  readonly onOpenMatchingGame: () => void;
  readonly onOpenVirtualLabs: () => void;
  readonly onOpenMasteryTest: () => void;
  readonly onBackToLessons: () => void;
  readonly actionAccess?: LessonActionAccess;
}

export function LessonActionGrid({
  onOpenReviewQuestions,
  onOpenActivities,
  onOpenMatchingGame,
  onOpenVirtualLabs,
  onOpenMasteryTest,
  onBackToLessons,
  actionAccess,
}: LessonActionGridProps) {
  const access: LessonActionAccess = actionAccess ?? {
    review: true,
    activities: true,
    game: true,
    labs: true,
    mastery: true,
  };
  const actions: LessonAction[] = [
    {
      label: 'أسئلة المراجعة',
      description: 'تحقق من فهمك للمفاهيم الأساسية.',
      icon: 'review',
      onClick: onOpenReviewQuestions,
      enabled: access.review,
      lockedDescription: 'أكمل الشرح الأساسي أولًا.',
    },
    {
      label: 'الأنشطة العلمية',
      description: 'استقصاء ومحاكاة وبيانات وتجارب موجهة.',
      icon: 'activities',
      onClick: onOpenActivities,
      enabled: access.activities,
      lockedDescription: 'أكمل أسئلة المراجعة أولًا.',
    },
    {
      label: 'الألعاب التعليمية',
      description: 'تدرّب بطريقة تفاعلية وتلقَّ تغذية راجعة مباشرة.',
      icon: 'game',
      onClick: onOpenMatchingGame,
      enabled: access.game,
      lockedDescription: 'ادخل الأنشطة العلمية أولًا.',
    },
    {
      label: 'المختبرات الافتراضية',
      description: 'افتح مختبرات رفيق العلوم ونفّذ التجربة بنفسك.',
      icon: 'lab',
      onClick: onOpenVirtualLabs,
      featured: true,
      enabled: access.labs,
      lockedDescription: 'غير متوفر حاليًا.',
    },
    {
      label: 'اختبار الإتقان',
      description: 'اختبر جاهزيتك بعد إنهاء تعلم الدرس.',
      icon: 'mastery',
      onClick: onOpenMasteryTest,
      enabled: access.mastery,
      lockedDescription: 'ادخل الألعاب التعليمية أولًا.',
    },
  ];

  return (
    <section className="rafiq-lesson-actions" aria-label="مسارات التعلم والتدريب">
      <header>
        <p>اختر طريقتك التالية</p>
        <h3>تعلّم، جرّب، وتدرّب</h3>
      </header>

      <div className="rafiq-lesson-action-grid">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            aria-label={action.label}
            className={`rafiq-lesson-action-card${action.featured ? ' is-featured' : ''}${action.enabled ? '' : ' is-locked'}`}
            onClick={action.onClick}
            disabled={!action.enabled}
          >
            <span className="rafiq-lesson-action-icon" aria-hidden="true">
              <StudentIcon name={action.icon} width="30" height="30" />
            </span>
            <span className="rafiq-lesson-action-copy">
              <strong>{action.label}</strong>
              <span>{action.enabled ? action.description : action.lockedDescription}</span>
              {!action.enabled ? <small className="rafiq-lesson-action-lock">مغلق</small> : null}
            </span>
            <span className="rafiq-lesson-action-arrow" aria-hidden="true">
              <StudentIcon name="chevron-left" width="22" height="22" />
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="rafiq-return-lessons-button" onClick={onBackToLessons}>
        العودة إلى الدروس
      </button>
    </section>
  );
}

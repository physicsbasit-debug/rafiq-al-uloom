import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { StudentIcon } from '@features/student/navigation/StudentIcon';

import {
  getVirtualLabsForLesson,
  groupVirtualLabsByGrade,
  type VirtualLabDefinition,
} from './virtual-lab.registry';

interface VirtualLabHubProps {
  readonly lessonId: string;
  readonly onBackToLesson: () => void;
}

function VirtualLabCard({ lab }: { readonly lab: VirtualLabDefinition }) {
  return (
    <article className="rafiq-virtual-lab-card">
      <div className="rafiq-virtual-lab-card-top">
        <span className="rafiq-virtual-lab-card-icon" aria-hidden="true">
          <StudentIcon name="lab" width="30" height="30" />
        </span>

        <div className="rafiq-virtual-lab-tags">
          <span>{lab.semesterLabel}</span>
        </div>
      </div>

      <h3>{lab.title}</h3>
      <p>{lab.description}</p>

      <dl className="rafiq-virtual-lab-context">
        <div>
          <dt>الوحدة</dt>
          <dd>{lab.unitLabel}</dd>
        </div>
        <div>
          <dt>الدرس</dt>
          <dd>{lab.lessonLabel}</dd>
        </div>
      </dl>

      <a
        href={lab.url}
        target="_blank"
        rel="noreferrer"
        className="rafiq-virtual-lab-launch"
        aria-label={`ابدأ مختبر ${lab.title}`}
      >
        ابدأ المختبر
        <StudentIcon name="chevron-left" width="20" height="20" />
      </a>
    </article>
  );
}

export function VirtualLabHub({ lessonId, onBackToLesson }: VirtualLabHubProps) {
  const lessonLabs = getVirtualLabsForLesson(lessonId);
  const gradeGroups = groupVirtualLabsByGrade();
  const hasDirectLabs = lessonLabs.length > 0;

  return (
    <section className="rafiq-virtual-lab-hub">
      <header className="rafiq-learning-hub-hero">
        <span className="rafiq-learning-hub-hero-icon" aria-hidden="true">
          <StudentIcon name="lab" width="34" height="34" />
        </span>
        <div>
          <p>تعلّم بالتجربة</p>
          <h2>المختبرات الافتراضية</h2>
          <span>
            كل مختبر موصوف بالصف والوحدة والدرس حتى يبقى الكتالوج منظمًا مع توسّع رفيق العلوم.
          </span>
        </div>
      </header>

      {hasDirectLabs ? (
        <section className="rafiq-lab-grade-group" aria-label="مختبرات هذا الدرس">
          <div className="rafiq-lab-grade-heading">
            <div>
              <span>مرتبطة بالدرس الحالي</span>
              <h3>مختبرات هذا الدرس</h3>
            </div>
            <strong>{lessonLabs.length}</strong>
          </div>

          <div className="rafiq-virtual-lab-grid">
            {lessonLabs.map((lab) => (
              <VirtualLabCard key={lab.id} lab={lab} />
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="rafiq-lab-context-note" role="status">
            لا يوجد مختبر مربوط مباشرة بهذا الدرس حتى الآن. تظهر المكتبة أدناه مرتبة حسب الصف، وسيتم
            الربط التلقائي بالدرس عند إضافة كتالوج التاسع والعاشر الكامل.
          </div>

          <div className="rafiq-lab-grade-groups">
            {gradeGroups.map((group) => (
              <section
                key={group.gradeId}
                className="rafiq-lab-grade-group"
                aria-label={`مختبرات ${group.gradeLabel}`}
              >
                <div className="rafiq-lab-grade-heading">
                  <div>
                    <span>مكتبة المختبرات</span>
                    <h3>{group.gradeLabel}</h3>
                  </div>
                  <strong>{group.labs.length}</strong>
                </div>

                <div className="rafiq-virtual-lab-grid">
                  {group.labs.map((lab) => (
                    <VirtualLabCard key={lab.id} lab={lab} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
    </section>
  );
}

import { useMemo, useState } from 'react';

import { AppButton } from '@design-system/components/AppButton';
import { authoringService, type AuthoringService, type LessonRevision } from '@services/authoring';

import { TeacherDraftList } from './TeacherDraftList';
import type { TeacherRevisionFilter, TeacherWorkspaceProps } from './teacher-workspace.types';
import { filterTeacherRevisions } from './teacher-workspace.utils';
import { useTeacherDrafts } from './useTeacherDrafts';

interface TeacherWorkspaceInternalProps extends TeacherWorkspaceProps {
  readonly service?: AuthoringService;
}

const FILTERS: readonly { value: TeacherRevisionFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'pending_review', label: 'قيد المراجعة' },
  { value: 'rejected', label: 'يحتاج إلى تعديل' },
  { value: 'approved', label: 'معتمد' },
];

const noopCreate = () => undefined;
const noopOpenRevision: (revision: LessonRevision) => void = () => undefined;

export function TeacherWorkspace({
  service = authoringService,
  onCreateLesson = noopCreate,
  onOpenRevision = noopOpenRevision,
}: TeacherWorkspaceInternalProps) {
  const [filter, setFilter] = useState<TeacherRevisionFilter>('all');
  const { revisions, isLoading, error, reload } = useTeacherDrafts(service);

  const filteredRevisions = useMemo(
    () => filterTeacherRevisions(revisions, filter),
    [filter, revisions]
  );

  const emptyMessage =
    revisions.length === 0
      ? 'لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.'
      : 'لا توجد مسودات مطابقة لهذا التصنيف.';

  return (
    <section aria-labelledby="teacher-workspace-title">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 id="teacher-workspace-title" style={{ margin: 0 }}>
            مساحة المعلم
          </h2>
          <p style={{ margin: '0.35rem 0 0' }}>أنشئ محتوى الدروس وتابع حالة نسخك.</p>
        </div>
        <div style={{ width: '190px' }}>
          <AppButton label="إنشاء درس جديد" onClick={onCreateLesson} />
        </div>
      </div>

      <div
        aria-label="تصفية المسودات"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}
      >
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            style={{
              minHeight: '40px',
              padding: '0.45rem 0.8rem',
              borderRadius: '999px',
              border: '1px solid currentColor',
              background: filter === item.value ? 'currentColor' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <span style={{ color: filter === item.value ? 'white' : 'inherit' }}>{item.label}</span>
          </button>
        ))}
      </div>

      <TeacherDraftList
        revisions={filteredRevisions}
        isLoading={isLoading}
        error={error}
        emptyMessage={emptyMessage}
        onRetry={reload}
        onOpenRevision={onOpenRevision}
      />
    </section>
  );
}

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Grade9ImportanceMeasurementLesson } from '@features/student/lesson-view/Grade9ImportanceMeasurementLesson';
const objectives = [
  {
    id: 'g9-s1-u1-l1-o1',
    lessonId: 'g9-phy-s1-u1-l1',
    text: 'يستخدم المسطرة والمخبار المدرج لإيجاد الطول أو الحجم، ويصف استخدامهما.',
  },
  {
    id: 'g9-s1-u1-l1-o4',
    lessonId: 'g9-phy-s1-u1-l1',
    text: 'يفهم كيف يستخدم أداة الميكرومتر لقياس الأبعاد الصغيرة جدًا.',
  },
];
describe('Grade9ImportanceMeasurementLesson', () => {
  it('renders official objectives without source labels or design-method labels', () => {
    render(
      <Grade9ImportanceMeasurementLesson
        objectives={objectives}
        onBackToLessons={vi.fn()}
        onOpenReviewQuestions={vi.fn()}
        onOpenActivities={vi.fn()}
        onOpenMatchingGame={vi.fn()}
        onOpenVirtualLabs={vi.fn()}
        onOpenMasteryTest={vi.fn()}
      />
    );
    expect(screen.getByText(objectives[0].text)).toBeInTheDocument();
    expect(screen.getByText(objectives[1].text)).toBeInTheDocument();
    expect(screen.queryByText(/دليل المعلم/)).not.toBeInTheDocument();
    expect(screen.queryByText(/كتاب الطالب/)).not.toBeInTheDocument();
    expect(screen.queryByText(/كورنيل/)).not.toBeInTheDocument();
    expect(screen.queryByText(/نشاط متمايز/)).not.toBeInTheDocument();
  });
  it('uses cues, main notes, and a bottom summary', () => {
    const onOpenReviewQuestions = vi.fn();
    render(
      <Grade9ImportanceMeasurementLesson
        objectives={objectives}
        onBackToLessons={vi.fn()}
        onOpenReviewQuestions={onOpenReviewQuestions}
        onOpenActivities={vi.fn()}
        onOpenMatchingGame={vi.fn()}
        onOpenVirtualLabs={vi.fn()}
        onOpenMasteryTest={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'أسئلة تقود تفكيرك' })).toBeInTheDocument();
    expect(screen.getByText('الخلاصة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'أسئلة المراجعة' }));
    expect(onOpenReviewQuestions).toHaveBeenCalledOnce();
  });
});

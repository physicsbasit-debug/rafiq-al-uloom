// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherObjectivesEditor } from '@features/teacher/workspace/TeacherObjectivesEditor';
import type { LessonRevisionPayload } from '@services/authoring';

const objective: LessonRevisionPayload['objectives'][number] = {
  key: 'teacher-objective-1',
  text: 'يفسر خصائص الموجات',
};

describe('Phase 5-5D1 TeacherObjectivesEditor activity guard', () => {
  it('يمنع حذف هدف مرتبط بنشاط دون حذف أو إعادة ربط صامتة', () => {
    const onChange = vi.fn();
    const isObjectiveReferencedByActivity = vi.fn(
      (objectiveKey: string) => objectiveKey === objective.key
    );

    render(
      <TeacherObjectivesEditor
        objectives={[objective]}
        questions={[]}
        readOnly={false}
        disabled={false}
        isObjectiveReferencedByActivity={isObjectiveReferencedByActivity}
        onChange={onChange}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حذف الهدف 1',
      })
    );

    expect(isObjectiveReferencedByActivity).toHaveBeenCalledWith(objective.key);

    expect(screen.getByRole('alert')).toHaveTextContent('مرتبط بنشاط علمي موجود');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(objective.text)).toBeInTheDocument();
  });
});

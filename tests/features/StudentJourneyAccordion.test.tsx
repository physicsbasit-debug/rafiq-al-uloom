// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StudentJourneyAccordion } from '@features/student/navigation/StudentJourneyAccordion';

describe('StudentJourneyAccordion', () => {
  it('يرتب رحلة الفيزياء من الصف إلى الدرس دون خطوة مادة مستقلة', () => {
    render(<StudentJourneyAccordion currentStep="grade" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('الصف');
    expect(items[1]).toHaveTextContent('الفصل');
    expect(items[2]).toHaveTextContent('الوحدة');
    expect(items[3]).toHaveTextContent('الدرس');
    expect(screen.queryByText('المادة')).not.toBeInTheDocument();
  });

  it('يميّز المرحلة الحالية والمراحل المكتملة دون جعل المؤشر أداة تنقل', () => {
    render(<StudentJourneyAccordion currentStep="unit" />);

    expect(screen.getByLabelText('مرحلة الصف - مكتملة')).toBeInTheDocument();
    expect(screen.getByLabelText('مرحلة الفصل - مكتملة')).toBeInTheDocument();
    expect(screen.getByLabelText('مرحلة الوحدة - الحالية')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByLabelText('مرحلة الدرس - قادمة')).toBeInTheDocument();
    expect(screen.queryByLabelText(/مرحلة المادة/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

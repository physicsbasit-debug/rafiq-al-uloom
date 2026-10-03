// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudentJourneyAccordion } from '@features/student/navigation/StudentJourneyAccordion';

describe('physics-only student journey', () => {
  it('يعرض أربع مراحل دون شاشة المادة', () => {
    render(<StudentJourneyAccordion currentStep="unit" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByText('المادة')).not.toBeInTheDocument();
    expect(screen.getByText('من الصف إلى الدرس في أربع خطوات واضحة')).toBeInTheDocument();
  });
});

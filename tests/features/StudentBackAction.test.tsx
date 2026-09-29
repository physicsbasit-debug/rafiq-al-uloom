// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudentBackAction } from '@features/student/navigation/StudentBackAction';

describe('StudentBackAction', () => {
  it('يعرض زر الرجوع بهوية الطالب ويستدعي الحدث', () => {
    const onClick = vi.fn();
    render(<StudentBackAction label="العودة إلى الدرس" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الدرس' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('يدعم زر الرجوع إلى البداية بهوية مستقلة', () => {
    render(<StudentBackAction label="الرجوع إلى البداية" kind="home" onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'الرجوع إلى البداية' })).toBeInTheDocument();
  });
});

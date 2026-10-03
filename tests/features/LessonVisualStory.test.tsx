// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LessonVisualStory } from '@features/student/lesson-view/LessonVisualStory';

describe('LessonVisualStory', () => {
  it('يعرض القصة البصرية لدرس أهمية القياس', () => {
    render(<LessonVisualStory lessonId="g9-phy-s1-u1-l1" />);
    expect(screen.getByRole('heading', { name: 'لماذا نحتاج إلى القياس؟' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });
  it('يعرض القصة البصرية لدرس الكهرباء الساكنة', () => {
    render(<LessonVisualStory lessonId="g10-phy-s1-u1-l1" />);
    expect(
      screen.getByRole('heading', { name: 'الكهرباء الساكنة: تجاذب أم تنافر؟' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });
  it('لا يضيف قصة بصرية إلى درس خارج النموذج المرجعي', () => {
    const { container } = render(<LessonVisualStory lessonId="other-lesson" />);
    expect(container).toBeEmptyDOMElement();
  });
});

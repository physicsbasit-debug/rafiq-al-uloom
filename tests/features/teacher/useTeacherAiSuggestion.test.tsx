// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTeacherAiSuggestion } from '@features/teacher/workspace/useTeacherAiSuggestion';
import { DeterministicAiAuthoringProvider } from '@services/ai-authoring';

const request = {
  target: 'lesson_summary' as const,
  context: {
    language: 'ar' as const,
    gradeLabel: 'الصف العاشر',
    subjectLabel: 'الفيزياء',
    unitTitle: 'الموجات',
    lessonTitle: 'الانعكاس',
  },
};

describe('useTeacherAiSuggestion', () => {
  it('يمسح suggestion مكتمل فور بدء طلب جديد على نفس hook instance', async () => {
    const provider = new DeterministicAiAuthoringProvider({ latencyMs: 25 });
    const { result } = renderHook(() =>
      useTeacherAiSuggestion({ provider, activeIdentity: 'summary', contextKey: 'context-a' })
    );

    await act(async () => {
      await result.current.requestSuggestion(request, 'snapshot-1');
    });
    expect(result.current.state.status).toBe('suggested');

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.requestSuggestion(request, 'snapshot-2');
    });
    expect(result.current.state.status).toBe('loading');

    await act(async () => pending);
    expect(result.current.state.status).toBe('suggested');
  });

  it('يهمل نتيجة قديمة بعد تغير context أثناء الطلب', async () => {
    const provider = new DeterministicAiAuthoringProvider({ latencyMs: 25 });
    const { result, rerender } = renderHook(
      ({ contextKey }) =>
        useTeacherAiSuggestion({ provider, activeIdentity: 'summary', contextKey }),
      { initialProps: { contextKey: 'context-a' } }
    );

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.requestSuggestion(request, 'snapshot');
    });
    rerender({ contextKey: 'context-b' });
    await act(async () => pending);

    expect(result.current.state.status).toBe('idle');
  });

  it('يبقي suggestion المكتمل ظاهرًا بعد تغير context ويعلّمه كسياق قديم', async () => {
    const provider = new DeterministicAiAuthoringProvider();
    const { result, rerender } = renderHook(
      ({ contextKey }) =>
        useTeacherAiSuggestion({ provider, activeIdentity: 'question-a', contextKey }),
      { initialProps: { contextKey: 'context-a' } }
    );

    await act(async () => {
      await result.current.requestSuggestion(request, 'snapshot');
    });
    expect(result.current.state.status).toBe('suggested');
    expect(result.current.isSuggestionContextCurrent).toBe(true);

    rerender({ contextKey: 'context-b' });

    expect(result.current.state.status).toBe('suggested');
    expect(result.current.isSuggestionContextCurrent).toBe(false);
  });

  it('يلغي الطلب ويمسح الاقتراح عند تغير هوية المحرر النشط', async () => {
    const provider = new DeterministicAiAuthoringProvider({ latencyMs: 25 });
    const { result, rerender } = renderHook(
      ({ identity }) =>
        useTeacherAiSuggestion({ provider, activeIdentity: identity, contextKey: 'context-a' }),
      { initialProps: { identity: 'question-a' as string | null } }
    );

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.requestSuggestion(request, 'snapshot');
    });
    rerender({ identity: 'question-b' });
    await act(async () => pending);

    expect(result.current.state.status).toBe('idle');
  });

  it('يلغي pending request عند unmount بلا late mutation', async () => {
    const provider = new DeterministicAiAuthoringProvider({ latencyMs: 25 });
    const { result, unmount } = renderHook(() =>
      useTeacherAiSuggestion({ provider, activeIdentity: 'summary', contextKey: 'context-a' })
    );

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.requestSuggestion(request, 'snapshot');
    });
    unmount();
    await pending;
  });
});

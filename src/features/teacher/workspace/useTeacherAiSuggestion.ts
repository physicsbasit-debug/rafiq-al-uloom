import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AiAuthoringProvider,
  AiAuthoringTarget,
  AiGenerationRequest,
  AiGenerationSuccess,
  AiInvalidOutputReason,
} from '@services/ai-authoring';

type ScopedTeacherAiSuggestionState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'loading';
      readonly target: AiAuthoringTarget;
      readonly identityScopeKey: string;
      readonly requestContextKey: string;
    }
  | {
      readonly status: 'suggested';
      readonly result: AiGenerationSuccess;
      readonly destinationSnapshot: string;
      readonly requestContextKey: string;
      readonly identityScopeKey: string;
    }
  | {
      readonly status: 'invalid_output';
      readonly target: AiAuthoringTarget;
      readonly reason: AiInvalidOutputReason;
      readonly identityScopeKey: string;
      readonly requestContextKey: string;
    }
  | {
      readonly status: 'unavailable';
      readonly target: AiAuthoringTarget;
      readonly reason: string;
      readonly identityScopeKey: string;
      readonly requestContextKey: string;
    };

export type TeacherAiSuggestionState =
  | { readonly status: 'idle' }
  | Exclude<ScopedTeacherAiSuggestionState, { readonly status: 'idle' }>;

interface UseTeacherAiSuggestionOptions {
  readonly provider: AiAuthoringProvider;
  readonly activeIdentity: string | null;
  readonly contextKey: string;
}

function createIdentityScopeKey(activeIdentity: string | null): string {
  return JSON.stringify([activeIdentity]);
}

export function useTeacherAiSuggestion({
  provider,
  activeIdentity,
  contextKey,
}: UseTeacherAiSuggestionOptions) {
  const identityScopeKey = createIdentityScopeKey(activeIdentity);
  const [trackedIdentityScopeKey, setTrackedIdentityScopeKey] = useState(identityScopeKey);
  const [trackedProvider, setTrackedProvider] = useState(provider);
  const [state, setState] = useState<ScopedTeacherAiSuggestionState>({ status: 'idle' });
  const sequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  // Changing editor identity/provider invalidates completed and pending suggestions.
  // Context changes are intentionally different: they cancel/ignore pending work,
  // but a completed suggestion remains visible so acceptance can re-check current
  // state (notably the deleted-objective red scenario).
  if (trackedIdentityScopeKey !== identityScopeKey || trackedProvider !== provider) {
    setTrackedIdentityScopeKey(identityScopeKey);
    setTrackedProvider(provider);
    setState({ status: 'idle' });
  }

  const cancelPending = useCallback(() => {
    sequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  // Context changes cancel pending requests. Completed suggestions are not cleared.
  useEffect(() => cancelPending, [identityScopeKey, provider, contextKey, cancelPending]);

  const requestSuggestion = useCallback(
    async (request: AiGenerationRequest, destinationSnapshot: string): Promise<void> => {
      cancelPending();

      const sequence = sequenceRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      const requestContextKey = contextKey;
      const requestIdentityScopeKey = identityScopeKey;

      // Starting a new request clears any completed but unaccepted suggestion.
      setState({
        status: 'loading',
        target: request.target,
        identityScopeKey: requestIdentityScopeKey,
        requestContextKey,
      });

      const result = await provider.generate(request, { signal: controller.signal });

      if (controller.signal.aborted || sequence !== sequenceRef.current) {
        return;
      }

      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }

      if (result.status === 'aborted') {
        setState({ status: 'idle' });
        return;
      }

      if (result.status === 'success') {
        setState({
          status: 'suggested',
          result,
          destinationSnapshot,
          requestContextKey,
          identityScopeKey: requestIdentityScopeKey,
        });
        return;
      }

      if (result.status === 'invalid_output') {
        setState({
          status: 'invalid_output',
          target: result.target,
          reason: result.reason,
          identityScopeKey: requestIdentityScopeKey,
          requestContextKey,
        });
        return;
      }

      setState({
        status: 'unavailable',
        target: result.target,
        reason: result.reason,
        identityScopeKey: requestIdentityScopeKey,
        requestContextKey,
      });
    },
    [cancelPending, contextKey, identityScopeKey, provider]
  );

  const rejectSuggestion = useCallback(() => {
    cancelPending();
    setState({ status: 'idle' });
  }, [cancelPending]);

  const visibleState: TeacherAiSuggestionState = (() => {
    if (state.status === 'idle') return state;
    if (state.identityScopeKey !== identityScopeKey) return { status: 'idle' };

    // A changed context invalidates pending/failure UI for that request, but
    // deliberately preserves a completed suggestion for current-time acceptance checks.
    if (state.status !== 'suggested' && state.requestContextKey !== contextKey) {
      return { status: 'idle' };
    }

    return state;
  })();

  const isSuggestionContextCurrent =
    visibleState.status === 'suggested' && visibleState.requestContextKey === contextKey;

  return {
    state: visibleState,
    requestSuggestion,
    rejectSuggestion,
    isSuggestionContextCurrent,
  };
}

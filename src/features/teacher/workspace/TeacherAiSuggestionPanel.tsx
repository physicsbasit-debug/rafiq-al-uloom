import type { ReactNode } from 'react';

import { AppButton } from '@design-system/components/AppButton';

import type { TeacherAiSuggestionState } from './useTeacherAiSuggestion';

interface TeacherAiSuggestionPanelProps {
  readonly state: TeacherAiSuggestionState;
  readonly disabled: boolean;
  readonly requestLabel: string;
  readonly contextAvailable: boolean;
  readonly onRequest: () => void;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly preview?: ReactNode;
  readonly notice?: string | null;
}

export function TeacherAiSuggestionPanel({
  state,
  disabled,
  requestLabel,
  contextAvailable,
  onRequest,
  onAccept,
  onReject,
  preview,
  notice = null,
}: TeacherAiSuggestionPanelProps) {
  const requestDisabled = disabled || !contextAvailable || state.status === 'loading';

  return (
    <div className="teacher-ai-panel" aria-label="مساعد الذكاء الاصطناعي">
      <div className="teacher-ai-panel-heading">
        <strong>مساعد الصياغة</strong>
        <span>الاقتراح منفصل عن بياناتك الحالية حتى تختار استخدامه.</span>
      </div>

      {!contextAvailable ? (
        <p className="teacher-ai-panel-note">
          أكمل معرف وحدة معروف وعنوان الدرس حتى يمكن بناء سياق الاقتراح بأمان.
        </p>
      ) : null}

      {notice ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          {notice}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="teacher-ai-panel-status" role="status">
          جارٍ إعداد الاقتراح...
        </div>
      ) : null}

      {state.status === 'invalid_output' ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          وصل اقتراح غير صالح، ولم يتغير أي شيء في النموذج.
        </div>
      ) : null}

      {state.status === 'unavailable' ? (
        <div className="teacher-alert teacher-alert--warning" role="alert">
          المساعد غير متاح حاليًا، ويمكنك متابعة التأليف اليدوي كالمعتاد.
        </div>
      ) : null}

      {state.status === 'suggested' ? (
        <div className="teacher-ai-suggestion" aria-label="اقتراح الذكاء الاصطناعي">
          <div className="teacher-ai-suggestion-preview">{preview}</div>
          <div className="teacher-ai-actions">
            <div className="teacher-ai-action">
              <AppButton label="استخدام الاقتراح" onClick={onAccept} disabled={disabled} />
            </div>
            <div className="teacher-ai-action teacher-ai-action--secondary">
              <AppButton
                label="رفض الاقتراح"
                variant="secondary"
                onClick={onReject}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ) : null}

      <button
        className="teacher-inline-action teacher-ai-request"
        type="button"
        disabled={requestDisabled}
        onClick={onRequest}
      >
        {state.status === 'suggested' ? 'اقتراح جديد' : requestLabel}
      </button>
    </div>
  );
}

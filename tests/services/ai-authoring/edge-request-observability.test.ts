import { describe, expect, it, vi } from 'vitest';

import {
  EDGE_REQUEST_ID_HEADER,
  resolveEdgeRequestId,
  writeEdgeDiagnostic,
} from '../../../supabase/functions/ai-authoring-gateway/edge-request-observability.ts';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const FALLBACK_ID = '22222222-2222-4222-8222-222222222222';

function requestWithId(value?: string): Request {
  return new Request('http://localhost/functions/v1/ai-authoring-gateway', {
    headers: value ? { [EDGE_REQUEST_ID_HEADER]: value } : undefined,
  });
}

describe('Phase 6-3D Edge request observability', () => {
  it('يحافظ على request id صالحًا قادمًا من المتصفح', () => {
    expect(resolveEdgeRequestId(requestWithId(REQUEST_ID), () => FALLBACK_ID)).toBe(REQUEST_ID);
  });

  it('يستبدل request id مفقودًا أو غير صالح بمعرف مولد آمن', () => {
    expect(resolveEdgeRequestId(requestWithId(), () => FALLBACK_ID)).toBe(FALLBACK_ID);
    expect(resolveEdgeRequestId(requestWithId('Bearer secret-token'), () => FALLBACK_ID)).toBe(
      FALLBACK_ID
    );
  });

  it('يسجل الحقول التشغيلية المسموحة فقط حتى مع خصائص عدائية إضافية', () => {
    const sink = vi.fn();
    writeEdgeDiagnostic(
      {
        requestId: REQUEST_ID,
        outcome: 'provider_timeout',
        target: 'objective',
        statusCode: 504,
        token: 'secret-token',
        userId: 'private-user',
        body: { lessonTitle: 'private lesson text' },
        error: new Error('private provider message'),
      } as never,
      sink
    );

    expect(sink).toHaveBeenCalledWith({
      event: 'ai_gateway_request',
      requestId: REQUEST_ID,
      outcome: 'provider_timeout',
      target: 'objective',
      statusCode: 504,
    });
    const serialized = JSON.stringify(sink.mock.calls[0]?.[0]);
    for (const secret of [
      'secret-token',
      'private-user',
      'private lesson text',
      'private provider message',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('يطوي القيم غير المعروفة بدل تسجيل النص الخام', () => {
    const sink = vi.fn();
    writeEdgeDiagnostic(
      {
        requestId: 'leaked@example.com',
        outcome: 'private backend detail',
        target: 'private lesson',
        statusCode: 999,
      } as never,
      sink
    );
    expect(sink).toHaveBeenCalledWith({
      event: 'ai_gateway_request',
      requestId: '00000000-0000-4000-8000-000000000000',
      outcome: 'unknown',
      target: 'unknown',
      statusCode: 0,
    });
  });

  it('لا يسمح بفشل sink أن يكسر مسار Edge', () => {
    expect(() =>
      writeEdgeDiagnostic(
        {
          requestId: REQUEST_ID,
          outcome: 'success',
          target: 'lesson_summary',
          statusCode: 200,
        },
        () => {
          throw new Error('logging backend failed');
        }
      )
    ).not.toThrow();
  });
});

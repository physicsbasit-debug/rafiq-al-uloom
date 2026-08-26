import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  AiGenerationRequest,
  AiGenerationResult,
  AiInvalidOutputReason,
  AiRequestValidationReason,
  AiSuggestion,
} from '../../src/services/ai-authoring/ai-authoring.types';
import type {
  RuntimeAiGenerationRequest,
  RuntimeAiGenerationResult,
  RuntimeAiInvalidOutputReason,
  RuntimeAiRequestValidationReason,
  RuntimeAiSuggestion,
} from '../../src/services/ai-authoring/ai-authoring.runtime-contract';

const GATEWAY_DIR = resolve(process.cwd(), 'supabase/functions/ai-authoring-gateway');
const PUBLIC_CONTRACT = resolve(
  process.cwd(),
  'src/services/ai-authoring/ai-authoring.contract.ts'
);
const RUNTIME_CONTRACT = resolve(
  process.cwd(),
  'src/services/ai-authoring/ai-authoring.runtime-contract.ts'
);
const QUOTA_MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/20260821183000_add_ai_authoring_quota.sql'
);

function readGatewayFiles(): readonly { readonly path: string; readonly content: string }[] {
  return readdirSync(GATEWAY_DIR)
    .filter((name) => name.endsWith('.ts') || name === 'deno.json')
    .map((name) => ({
      path: resolve(GATEWAY_DIR, name),
      content: readFileSync(resolve(GATEWAY_DIR, name), 'utf8'),
    }));
}

describe('architecture: Phase 4-3A/4-3B/4-3C AI gateway boundary', () => {
  it('يستخدم مصدر validator تنفيذيًا واحدًا للمتصفح والـEdge والمزوّد الحي', () => {
    const publicContract = readFileSync(PUBLIC_CONTRACT, 'utf8');
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');
    const liveProvider = readFileSync(resolve(GATEWAY_DIR, 'live-server-provider.ts'), 'utf8');
    const runtimeContract = readFileSync(RUNTIME_CONTRACT, 'utf8');

    expect(publicContract).toContain("from './ai-authoring.runtime-contract'");
    expect(publicContract).toContain('validateAiGenerationRequestRuntime');
    expect(publicContract).toContain('validateAiProviderOutputRuntime');
    expect(handler).toContain(
      '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts'
    );
    expect(liveProvider).toContain('validateAiProviderOutputRuntime');
    expect(liveProvider).toContain(
      '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts'
    );
    expect(runtimeContract).not.toMatch(/^import\s/m);
  });

  it('يثبت تكافؤ الأنواع العامة وأنواع النواة المشتركة وقت البناء', () => {
    expectTypeOf<RuntimeAiGenerationRequest>().toEqualTypeOf<AiGenerationRequest>();
    expectTypeOf<RuntimeAiGenerationResult>().toEqualTypeOf<AiGenerationResult>();
    expectTypeOf<RuntimeAiSuggestion>().toEqualTypeOf<AiSuggestion>();
    expectTypeOf<RuntimeAiInvalidOutputReason>().toEqualTypeOf<AiInvalidOutputReason>();
    expectTypeOf<RuntimeAiRequestValidationReason>().toEqualTypeOf<AiRequestValidationReason>();
  });

  it('يزيل المزود الحتمي القديم من مسار Edge بدل إبقاء legacy runtime', () => {
    expect(existsSync(resolve(GATEWAY_DIR, 'fake-server-provider.ts'))).toBe(false);
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');
    expect(handler).not.toContain('generateFakeServerResult');
    expect(handler).toContain('generateLiveServerResult');
  });

  it('يفرض حد body الحقيقي قبل تفويض التطبيق ولا يخلطه مع platform verify_jwt', () => {
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');

    expect(handler).toContain('request.body.getReader()');
    expect(handler).toContain('totalBytes > MAX_BODY_BYTES');
    expect(handler).not.toContain('await request.text()');

    const sizeRead = handler.indexOf('await readBoundedBody(request)');
    const authRead = handler.indexOf('await authorizeActiveTeacher(request)');
    expect(sizeRead).toBeGreaterThan(-1);
    expect(authRead).toBeGreaterThan(sizeRead);
  });

  it('يجمد الترتيب validation ثم quota ثم live provider', () => {
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');

    const validation = handler.lastIndexOf('validateAiGenerationRequestRuntime(parsed.body)');
    const quota = handler.lastIndexOf('await consumeAiAuthoringQuota(request)');
    const provider = handler.lastIndexOf('await generateLiveServerResult(generationRequest');

    expect(validation).toBeGreaterThan(-1);
    expect(quota).toBeGreaterThan(validation);
    expect(provider).toBeGreaterThan(quota);
    expect(handler).toContain("quota.status === 'rate_limited'");
    expect(handler).toContain("'quota_unavailable'");
  });

  it('يجمد عقد quota الذري كما أغلق في 4-3B', () => {
    const migration = readFileSync(QUOTA_MIGRATION, 'utf8');
    const quotaClient = readFileSync(resolve(GATEWAY_DIR, 'gateway-quota.ts'), 'utf8');

    expect(migration).toMatch(
      /CREATE FUNCTION public\.consume_ai_authoring_quota\(\)\s*RETURNS TABLE/
    );
    expect(migration).toContain('v_user_id := auth.uid()');
    expect(migration).toContain('ON CONFLICT (user_id) DO NOTHING');
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('clock_timestamp()');
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path = ''");
    expect(quotaClient).toContain("body: '{}'");
  });

  it('يبقي أسرار Gemini وموديله وtimeout ملكًا للخادم فقط', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'live-server-provider.ts'), 'utf8');
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');

    expect(provider).toContain('GEMINI_API_KEY');
    expect(provider).toContain("GEMINI_MODEL = 'gemini-3.5-flash'");
    expect(provider).toContain('PROVIDER_TIMEOUT_MS = 25_000');
    expect(provider).toContain("'x-goog-api-key': apiKey");
    expect(provider).not.toContain('?key=');
    expect(handler).not.toContain('GEMINI_API_KEY');
    expect(handler).not.toContain('GEMINI_MODEL');
    expect(handler).not.toContain('PROVIDER_TIMEOUT_MS');
  });

  it('يفصل قناة التعليمات الموثوقة عن مغلف بيانات السياق ولا يفعّل tools', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'live-server-provider.ts'), 'utf8');

    expect(provider).toContain('trustedInstructionFor(request.target)');
    expect(provider).toContain("schemaVersion: 'ai-authoring-context-v1'");
    expect(provider).toContain('context: request.context');
    expect(provider).toContain('JSON.stringify({');
    expect(provider).not.toMatch(/tools\s*:/);
    expect(provider).not.toMatch(/toolConfig\s*:/);
    expect(provider).not.toContain('objective.text}`');
    expect(provider).not.toContain('currentSummary}`');
  });

  it('يستخدم JSON Schema الحقيقي في Gemini بدل responseSchema المقيد', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'live-server-provider.ts'), 'utf8');

    expect(provider).toContain('responseJsonSchema: responseJsonSchemaFor(request.target)');
    expect(provider).not.toContain('responseSchema: responseJsonSchemaFor(request.target)');
    expect(provider).toContain('additionalProperties: false');
  });

  it('يبقي runtime output validator بين بيانات المزود وأي نجاح', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'live-server-provider.ts'), 'utf8');
    const parse = provider.indexOf('JSON.parse(candidateText)');
    const validate = provider.indexOf('validateAiProviderOutputRuntime(request, candidate)');
    const success = provider.lastIndexOf("status: 'success'");

    expect(parse).toBeGreaterThan(-1);
    expect(validate).toBeGreaterThan(parse);
    expect(success).toBeGreaterThan(validate);
  });

  it('لا يملك Gateway مسار نشر أو Revision أو Service Role أو logging للمحتوى', () => {
    const forbidden = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'service_role',
      'create_lesson_revision',
      'save_lesson_revision',
      'submit_lesson_revision',
      'review_lesson_revision',
      'content_revisions',
      'content_review_events',
      'AuthoringService',
      'ReviewerWorkspace',
      'console.log',
      'console.error',
      'console.debug',
    ];

    const violations = readGatewayFiles().flatMap(({ path, content }) =>
      forbidden.filter((token) => content.includes(token)).map((token) => `${path}: ${token}`)
    );

    expect(violations).toEqual([]);
  });

  it('لا يعيد المحاولة تلقائيًا داخل مزود 4-3C', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'live-server-provider.ts'), 'utf8');
    expect(provider).toContain('one provider transport attempt only');
    expect((provider.match(/await fetchImpl\(/g) ?? []).length).toBe(1);
    expect(provider).not.toMatch(/backoff/i);
  });
});

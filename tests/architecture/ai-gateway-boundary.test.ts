import { readFileSync, readdirSync } from 'node:fs';
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

describe('architecture: Phase 4-3A/4-3B local AI gateway boundary', () => {
  it('يستخدم مصدر validator تنفيذيًا واحدًا للمتصفح والـEdge', () => {
    const publicContract = readFileSync(PUBLIC_CONTRACT, 'utf8');
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');
    const fakeProvider = readFileSync(resolve(GATEWAY_DIR, 'fake-server-provider.ts'), 'utf8');
    const runtimeContract = readFileSync(RUNTIME_CONTRACT, 'utf8');

    expect(publicContract).toContain("from './ai-authoring.runtime-contract'");
    expect(publicContract).toContain('validateAiGenerationRequestRuntime');
    expect(publicContract).toContain('validateAiProviderOutputRuntime');

    expect(handler).toContain(
      '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts'
    );
    expect(fakeProvider).toContain(
      '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts'
    );

    expect(runtimeContract).not.toMatch(/^import\s/m);
    expect(readdirSync(GATEWAY_DIR).some((name) => /server[-_.]?validator/i.test(name))).toBe(
      false
    );
  });

  it('يثبت تكافؤ الأنواع العامة وأنواع النواة المشتركة وقت البناء', () => {
    expectTypeOf<RuntimeAiGenerationRequest>().toEqualTypeOf<AiGenerationRequest>();
    expectTypeOf<RuntimeAiGenerationResult>().toEqualTypeOf<AiGenerationResult>();
    expectTypeOf<RuntimeAiSuggestion>().toEqualTypeOf<AiSuggestion>();
    expectTypeOf<RuntimeAiInvalidOutputReason>().toEqualTypeOf<AiInvalidOutputReason>();
    expectTypeOf<RuntimeAiRequestValidationReason>().toEqualTypeOf<AiRequestValidationReason>();
  });

  it('لا يحتاج deno.json إلى alias أو relative import shim بعد استخراج النواة', () => {
    const deno = JSON.parse(readFileSync(resolve(GATEWAY_DIR, 'deno.json'), 'utf8')) as Record<
      string,
      unknown
    >;

    expect(deno).not.toHaveProperty('imports');
    expect(deno).not.toHaveProperty('scopes');
  });

  it('يفرض حد body الحقيقي قبل تفويض التطبيق ولا يخلطه مع platform verify_jwt', () => {
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');

    expect(handler).toContain('request.body.getReader()');
    expect(handler).toContain('totalBytes > MAX_BODY_BYTES');
    expect(handler).not.toContain('await request.text()');
    expect(handler).not.toContain('reader.cancel(');

    const sizeRead = handler.indexOf('await readBoundedBody(request)');
    const authRead = handler.indexOf('await authorizeActiveTeacher(request)');

    expect(sizeRead).toBeGreaterThan(-1);
    expect(authRead).toBeGreaterThan(-1);
    expect(sizeRead).toBeLessThan(authRead);
  });

  it('يضع الحصة بعد validation وقبل provider دون مسار تجاوز', () => {
    const handler = readFileSync(resolve(GATEWAY_DIR, 'gateway-handler.ts'), 'utf8');

    const validation = handler.lastIndexOf('validateAiGenerationRequestRuntime(parsed.body)');
    const quota = handler.lastIndexOf('await consumeAiAuthoringQuota(request)');
    const provider = handler.lastIndexOf('generateFakeServerResult(generationRequest)');

    expect(validation).toBeGreaterThan(-1);
    expect(quota).toBeGreaterThan(validation);
    expect(provider).toBeGreaterThan(quota);

    expect(handler).toContain("quota.status === 'forbidden'");
    expect(handler).toContain("quota.status === 'unavailable'");
    expect(handler).toContain("quota.status === 'rate_limited'");
    expect(handler).toContain("'quota_unavailable'");
  });

  it('يجمد عقد quota الذري بلا معاملات ولا وقت أو حدود من العميل', () => {
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
    expect(migration).toContain('TO authenticated');

    expect(quotaClient).toContain('/rest/v1/rpc/consume_ai_authoring_quota');
    expect(quotaClient).toContain("body: '{}'");
    expect(quotaClient).not.toMatch(/\b(userId|user_id|quotaLimit|quota_limit|timestamp)\b/);
  });

  it('لا يملك Gateway أي مسار نشر/Revision أو Service Role', () => {
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
    ];

    const violations = readGatewayFiles().flatMap(({ path, content }) =>
      forbidden.filter((token) => content.includes(token)).map((token) => `${path}: ${token}`)
    );

    expect(violations).toEqual([]);
  });

  it('لا يدخل مفتاح AI أو مزود حي إلى 4-3B', () => {
    const forbidden = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'api.openai.com',
      'api.anthropic.com',
      'generativelanguage.googleapis.com',
    ];

    const violations = readGatewayFiles().flatMap(({ path, content }) =>
      forbidden.filter((token) => content.includes(token)).map((token) => `${path}: ${token}`)
    );

    expect(violations).toEqual([]);
  });

  it('يبقي المزود الخادمي في 4-3B حتميًا ومحليًا', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'fake-server-provider.ts'), 'utf8');

    expect(provider).toContain("providerFamily: 'local_fake'");
    expect(provider).toContain("modelLabel: 'phase-4-3a-deterministic'");
    expect(provider).not.toContain('fetch(');
  });
});

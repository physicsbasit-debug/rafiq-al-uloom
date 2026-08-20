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

function readGatewayFiles(): readonly { readonly path: string; readonly content: string }[] {
  return readdirSync(GATEWAY_DIR)
    .filter((name) => name.endsWith('.ts') || name === 'deno.json')
    .map((name) => ({
      path: resolve(GATEWAY_DIR, name),
      content: readFileSync(resolve(GATEWAY_DIR, name), 'utf8'),
    }));
}

describe('architecture: Phase 4-3A local AI gateway boundary', () => {
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

  it('لا يملك Gateway أي مسار نشر/Revision أو Service Role أو RPC', () => {
    const forbidden = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'service_role',
      '.rpc(',
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

  it('لا يدخل مفتاح AI أو مزود حي إلى 4-3A', () => {
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

  it('يبقي المزود الخادمي في 4-3A حتميًا ومحليًا', () => {
    const provider = readFileSync(resolve(GATEWAY_DIR, 'fake-server-provider.ts'), 'utf8');

    expect(provider).toContain("providerFamily: 'local_fake'");
    expect(provider).toContain("modelLabel: 'phase-4-3a-deterministic'");
    expect(provider).not.toContain('fetch(');
  });
});

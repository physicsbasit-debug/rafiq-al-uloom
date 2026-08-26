import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const PROVIDER_PATH = 'src/services/ai-authoring/gateway-ai-authoring.provider.ts';
const RESPONSE_PATH = 'src/services/ai-authoring/gateway-ai-authoring.response.ts';
const APP_PATH = 'src/App.tsx';
const WORKSPACE_PATH = 'src/features/teacher/workspace/TeacherWorkspace.tsx';

describe('architecture: Phase 4-3D browser AI gateway boundary', () => {
  it('لا يدخل Gemini secret أو endpoint أو Service Role إلى browser AI', () => {
    const browserAi = `${read(PROVIDER_PATH)}\n${read(RESPONSE_PATH)}\n${read(APP_PATH)}`;
    for (const forbidden of [
      'GEMINI_API_KEY',
      'generativelanguage.googleapis.com',
      'SUPABASE_SERVICE_ROLE_KEY',
      'service_role',
      'responseJsonSchema',
    ]) {
      expect(browserAi).not.toContain(forbidden);
    }
  });

  it('يبقى Gateway provider مستقلًا عن Supabase وReact وTeacher feature', () => {
    const provider = read(PROVIDER_PATH);
    expect(provider).not.toContain('@supabase/supabase-js');
    expect(provider).not.toContain('getSupabaseClient');
    expect(provider).not.toContain('@features/teacher');
    expect(provider).not.toContain("from 'react'");
  });

  it('يبقي Supabase wiring خارج TeacherWorkspace', () => {
    const workspace = read(WORKSPACE_PATH);
    expect(workspace).not.toContain('@supabase/supabase-js');
    expect(workspace).not.toContain('getSupabaseClient');
    expect(workspace).not.toContain('ai-authoring-gateway');
    expect(workspace).not.toContain('.auth.getSession(');
  });

  it('يسلسل AiGenerationRequest نفسها فقط كجسم الطلب ولا يضيف تحكمات مزود', () => {
    const provider = read(PROVIDER_PATH);
    expect(provider).toContain('body: JSON.stringify(request)');
    for (const forbidden of ['modelLabel:', 'prompt:', 'timeout:', 'schema:', 'providerFamily:']) {
      expect(provider).not.toContain(forbidden);
    }
  });

  it('ينفذ fetch واحدة بنيويًا ولا يحتوي retry loop', () => {
    const provider = read(PROVIDER_PATH);
    expect(provider.match(/await fetchImpl\(/g) ?? []).toHaveLength(1);
    expect(provider).not.toMatch(/\bwhile\s*\(/);
    expect(provider).not.toMatch(/\bfor\s*\(/);
    expect(provider).not.toContain('setTimeout(');
    expect(provider).not.toContain('new AbortController(');
  });

  it('يركب App مزود Gateway ثابتًا ويمرره صراحة إلى TeacherWorkspace', () => {
    const app = read(APP_PATH);
    expect(app).toContain('useMemo(');
    expect(app).toContain('new GatewayAiAuthoringProvider({');
    expect(app).toContain('getSupabaseClient().auth.getSession()');
    expect(app).toContain('publicApiKey: import.meta.env.VITE_SUPABASE_ANON_KEY');
    expect(app).toContain('<TeacherWorkspace aiProvider={aiProvider} />');
    expect(app).not.toContain('<TeacherWorkspace aiProvider={new GatewayAiAuthoringProvider');
  });

  it('يزيل deterministic silent fallback من TeacherWorkspace', () => {
    const workspace = read(WORKSPACE_PATH);
    expect(workspace).toContain('readonly aiProvider: AiAuthoringProvider;');
    expect(workspace).not.toContain('defaultAiProvider');
    expect(workspace).not.toContain('DeterministicAiAuthoringProvider');
  });

  it('لا يفتح Browser AI أي Authoring RPC أو مسار نشر', () => {
    const browserAi = `${read(PROVIDER_PATH)}\n${read(RESPONSE_PATH)}`;
    for (const forbidden of [
      '.rpc(',
      'create_lesson_revision',
      'save_lesson_revision',
      'submit_lesson_revision',
      'review_lesson_revision',
      'publish',
    ]) {
      expect(browserAi).not.toContain(forbidden);
    }
  });

  it('يبقي Suggestion Buffer هو وجهة نتيجة AI ولا يفتح مسار كتابة مباشر', () => {
    const hook = read('src/features/teacher/workspace/useTeacherAiSuggestion.ts');
    expect(hook).toContain('provider.generate(request, { signal: controller.signal })');
    expect(hook).toContain("status: 'suggested'");
    expect(hook).not.toContain('saveLessonRevision');
    expect(hook).not.toContain('submitLessonRevision');
  });

  it('لا يوسع AuthSession العام ليحمل access token الخام', () => {
    const authTypes = read('src/services/auth/auth.types.ts');
    expect(authTypes).not.toContain('accessToken');
    expect(authTypes).not.toContain('access_token');
  });

  it('يبقي AiGenerationResult على الحالات الخمس المجمدة فقط', () => {
    const types = read('src/services/ai-authoring/ai-authoring.types.ts');
    const start = types.indexOf('export type AiGenerationSuccess');
    const end = types.indexOf('export interface AiGenerationOptions');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = types.slice(start, end);
    const statuses = [...block.matchAll(/readonly status:\s*'([^']+)'/g)].map((match) => match[1]);
    expect([...new Set(statuses)].sort()).toEqual(
      ['aborted', 'invalid_output', 'rejected', 'success', 'unavailable'].sort()
    );
  });
});

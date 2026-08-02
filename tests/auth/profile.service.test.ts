import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProfileService } from '@services/auth/profile.service';

interface QueryResponse {
  readonly data: unknown | null;
  readonly error: unknown;
}

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    display_name: 'طالب العلوم',
    role: 'student',
    status: 'active',
    created_at: '2026-08-03T00:00:00.000Z',
    updated_at: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function createQueryMock(response: QueryResponse | Promise<QueryResponse>) {
  const responsePromise = Promise.resolve(response);
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    abortSignal: vi.fn(),
    then: responsePromise.then.bind(responsePromise),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockReturnValue(query);
  query.abortSignal.mockReturnValue(query);

  const from = vi.fn(() => query);

  return {
    client: { from } as unknown as Pick<SupabaseClient, 'from'>,
    from,
    query,
  };
}

function abortError(): Error {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Profile service', () => {
  it('يقرأ الأعمدة الصريحة من profiles بمعرف المستخدم ويستخدم maybeSingle', async () => {
    const mock = createQueryMock({ data: validRow(), error: null });
    const service = createProfileService(mock.client);

    await service.getUserProfile('user-1');

    expect(mock.from).toHaveBeenCalledWith('profiles');
    expect(mock.query.select).toHaveBeenCalledWith(
      'id,display_name,role,status,created_at,updated_at'
    );
    expect(mock.query.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(mock.query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('يعيد UserProfile محولًا عند صلاحية الصف', async () => {
    const mock = createQueryMock({ data: validRow(), error: null });
    const service = createProfileService(mock.client);

    await expect(service.getUserProfile('user-1')).resolves.toEqual({
      status: 'success',
      profile: {
        id: 'user-1',
        displayName: 'طالب العلوم',
        role: 'student',
        status: 'active',
        createdAt: '2026-08-03T00:00:00.000Z',
        updatedAt: '2026-08-03T00:00:00.000Z',
      },
    });
  });

  it('يقبل display_name فارغًا بقيمة null', async () => {
    const mock = createQueryMock({
      data: validRow({ display_name: null }),
      error: null,
    });
    const service = createProfileService(mock.client);

    const result = await service.getUserProfile('user-1');

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.profile.displayName).toBeNull();
    }
  });

  it('يمرر AbortSignal الفعلية إلى PostgREST', async () => {
    const mock = createQueryMock({ data: validRow(), error: null });
    const controller = new AbortController();
    const service = createProfileService(mock.client);

    await service.getUserProfile('user-1', { signal: controller.signal });

    expect(mock.query.abortSignal).toHaveBeenCalledWith(controller.signal);
  });

  it('يفحص الإلغاء قبل إنشاء استعلام الشبكة', async () => {
    const mock = createQueryMock({ data: validRow(), error: null });
    const controller = new AbortController();
    controller.abort();
    const service = createProfileService(mock.client);

    await expect(
      service.getUserProfile('user-1', { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('يحافظ على AbortError القادمة من PostgREST', async () => {
    const error = abortError();
    const mock = createQueryMock({ data: null, error });
    const service = createProfileService(mock.client);

    await expect(service.getUserProfile('user-1')).rejects.toBe(error);
  });

  it('يعيد missing_profile عند عدم وجود صف', async () => {
    const mock = createQueryMock({ data: null, error: null });
    const service = createProfileService(mock.client);

    await expect(service.getUserProfile('user-1')).resolves.toEqual({
      status: 'error',
      error: {
        code: 'missing_profile',
        message: 'تعذر العثور على ملف المستخدم.',
      },
    });
  });

  it.each([
    { field: 'role', override: { role: 'admin' } },
    { field: 'status', override: { status: 'inactive' } },
    { field: 'id', override: { id: 'other-user' } },
    { field: 'created_at', override: { created_at: null } },
  ])('يرفض قيمة $field غير صالحة دون fallback', async (testCase) => {
    const mock = createQueryMock({
      data: validRow(testCase.override),
      error: null,
    });
    const service = createProfileService(mock.client);

    await expect(service.getUserProfile('user-1')).resolves.toEqual({
      status: 'error',
      error: {
        code: 'invalid_profile',
        message: 'بيانات حساب المستخدم غير صالحة.',
      },
    });
  });

  it('يصنف خطأ الشبكة برسالة عامة ولا يكشف النص الخام', async () => {
    const rawError = new TypeError('fetch failed against internal host');
    const mock = createQueryMock({ data: null, error: rawError });
    const service = createProfileService(mock.client);
    const result = await service.getUserProfile('user-1');

    expect(result).toEqual({
      status: 'error',
      error: {
        code: 'network_error',
        message: 'تعذر الاتصال بخدمة بيانات الحساب حاليًا.',
      },
    });
    expect(JSON.stringify(result)).not.toContain('internal host');
  });

  it('يصنف خطأ الخدمة 5xx برسالة عامة', async () => {
    const mock = createQueryMock({
      data: null,
      error: { status: 503, message: 'database unavailable' },
    });
    const service = createProfileService(mock.client);

    await expect(service.getUserProfile('user-1')).resolves.toEqual({
      status: 'error',
      error: {
        code: 'service_unavailable',
        message: 'خدمة بيانات الحساب غير متاحة مؤقتًا.',
      },
    });
  });

  it('يحفظ الخطأ الخام داخل cause تشخيصيًا فقط', async () => {
    const rawError = new Error('private postgrest details');
    const diagnostics: Error[] = [];
    const mock = createQueryMock({ data: null, error: rawError });
    const service = createProfileService(mock.client, {
      reportDiagnostic: (error) => diagnostics.push(error),
    });

    const result = await service.getUserProfile('user-1');

    expect(result.status).toBe('error');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.cause).toBe(rawError);
    expect(JSON.stringify(result)).not.toContain('private postgrest');
  });
});

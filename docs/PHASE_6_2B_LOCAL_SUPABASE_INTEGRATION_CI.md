# Phase 6-2B — Local Supabase Integration CI

**Baseline:** `2214236f3e95ef129dda4741f6d137e1a993a730`
**Branch:** `phase-6-production-readiness`
**Fix:** `6-2B Fix 1 — Minimal Supabase Stack`

## الحالة

6-2A مغلقة بعد نجاح GitHub Actions Run #1 على commit نفسه.

6-2B الأولى كشفت أن تشغيل كامل Supabase local stack يمكن أن يفشل في health checks لخدمات جانبية غير مطلوبة للاختبارات، رغم نجاح migrations وseed.

الاختبار اليدوي أثبت أن:

- جميع migrations تطبق بنجاح.
- seed يطبق بنجاح.
- `supabase db reset` ينجح.
- Edge Function `ai-authoring-gateway` تبدأ بنجاح.
- الفشل السابق كان في خدمات محلية جانبية غير مطلوبة لمسار التكامل.

## Minimal CI Stack

6-2B Fix 1 تستبعد عند `supabase start`:

```text
vector
logflare
storage-api
imgproxy
studio
mailpit
realtime
postgres-meta
supavisor
```

عبر:

```bash
supabase start   -x vector,logflare,storage-api,imgproxy,studio,mailpit,realtime,postgres-meta,supavisor
```

وتبقي الخدمات اللازمة لاختبارات المشروع:

- PostgreSQL
- Auth
- API gateway
- REST
- Edge Runtime

لا يتم تعديل `supabase/config.toml`.

## سبب عدم استخدام ignore-health-check

لا تستخدم البوابة:

```text
--ignore-health-check
```

لأن الهدف ليس إخفاء خدمة غير سليمة، بل عدم تشغيل خدمات لا يحتاجها نطاق الاختبار أصلًا.

## Recovery

إذا نجح reset ولكن لم تعد API متاحة:

```text
stop --no-backup
→ start_minimal_supabase
→ readiness check
```

ويستخدم recovery نفس قائمة الاستبعاد، فلا يعيد تشغيل full stack خطأً.

## بقية العقد

تبقى كما هي:

- لا Remote Supabase.
- لا production secrets.
- لا `GEMINI_API_KEY`.
- لا `RUN_LIVE_GEMINI_TESTS=true`.
- لا `--no-verify-jwt`.
- Edge readiness عبر HTTP 401.
- cleanup حتمي عبر `trap cleanup EXIT`.

## بوابة قبول Fix 1

```bash
npx --no-install prettier --check .
npm run lint
npm run build
npx --no-install vitest run tests/architecture/phase-6-2b-supabase-ci.test.ts
npm run verify:ci-static
npm run verify:ci-supabase
git diff --check
```

النتيجة المطلوبة:

```text
LOCAL SUPABASE CI GATE PASSED
```

بعد النجاح المحلي فقط يتم commit/push، ثم يجب أن ينجح job:

```text
Local Supabase Integration
```

على GitHub Actions نفسها.

**NEXT:** `6-2C — CI Runtime Review + Phase 6-2 Closure`

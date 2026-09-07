# Phase 6-2A — Static CI + Supply Chain Gate

**Baseline:** `1ed94babda99fc85ba5d92b757dfdd58326b0467`
**Branch:** `phase-6-production-readiness`

## الهدف

هذه الدفعة هي الجزء الأول من 6-2. تضيف بوابة GitHub Actions للـstatic/core/supply-chain فقط.

لا تشغّل Remote Supabase ولا Gemini الحي ولا أسرار production.

## تقسيم 6-2

```text
6-2A  Static/Core/Supply-chain CI
6-2B  Local Supabase integration CI
6-2C  CI runtime review + closure
```

## بوابة GitHub Actions

الـworkflow يعمل على:

- Pull Requests.
- push إلى `main`.
- push إلى `phase-6-production-readiness` أثناء بناء Phase 6.
- تشغيل يدوي عبر `workflow_dispatch`.

ويستخدم:

- `actions/checkout@v6`
- `fetch-depth: 0`
- `actions/setup-node@v7`
- Node 22
- npm cache
- `npm ci`

لا يطلب أي GitHub secret في 6-2A.

## الأمر المحلي الموحد

```bash
npm run verify:ci-static
```

يشغّل:

1. Prettier
2. ESLint
3. Build
4. Core/unit tests
5. اختبارات عقود 6-1 و6-2
6. Auth client boundary
7. Mastery-results client boundary
8. tracked secret scan
9. forward-only migration guard
10. production-env contract self-check بقيم وهمية عامة
11. `npm audit --audit-level=high`
12. `git diff --check`

## سياسة Dependency Audit

في 6-2A:

- high وcritical advisories حاجبة.
- moderate/low تبقى ظاهرة للمراجعة ولا تفشل البوابة تلقائيًا.
- لا تستخدم `npm audit fix` داخل CI لأن CI لا تعدل dependency tree.

## Secret Scan

الفاحص يبحث عن أنماط عالية الثقة فقط، ولا يطبع القيمة المطابقة.

كما يمنع تعقب ملفات `.env` غير قائمة السماح المعتمدة.

هذا الفاحص طبقة إضافية ولا يلغي مراجعة GitHub أو أي secret scanning متاح من المنصة لاحقًا.

## Migration Immutability

المرجع المجمد:

```text
Phase 5 frozen commit
5f46fca6ee4617720d0770b2139c9a844aaa08b6
```

يمنع:

- تعديل migration قديمة.
- حذف migration.
- إعادة تسميتها.
- تعديل migration جديدة بعد تسجيلها في commit لاحق.

يسمح:

- migration جديدة forward-only.

## ما لم يتغير

- production source code.
- SQL/migrations.
- Remote Supabase.
- Auth/RLS behavior.
- AI gateway.
- Phase 5 frozen contracts.

## بوابة قبول 6-2A

يجب أن تنجح محليًا:

```bash
npx --no-install prettier --check .
npm run lint
npm run build
npx --no-install vitest run tests/architecture/phase-6-2-ci-supply-chain.test.ts
node scripts/check-tracked-secrets.mjs
node scripts/check-forward-only-migrations.mjs
npm run verify:ci-static
git diff --check
```

بعد commit/push يجب أن تظهر GitHub Actions وتنجح على commit نفسه.

لا تغلق 6-2 كاملة بعد 6-2A.

**NEXT:** `6-2B — Local Supabase Integration CI`

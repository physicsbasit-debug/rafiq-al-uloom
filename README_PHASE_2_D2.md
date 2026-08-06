# Phase 2-D2 — Client Persistence Service

## الحالة

حزمة التطبيق النهائية بعد اعتماد كلاود.

## ما تضيفه

```text
src/services/mastery-results/*
src/services/auth/authorization.operations.ts
src/services/auth/authorization.policy.ts
tests/mastery-results/*
tests/auth/mastery-results-authorization.policy.test.ts
tests/architecture/no-direct-mastery-results-rpc.test.ts
docs/PHASE_2_D2_CLIENT_PERSISTENCE_DESIGN.md
```

## ما لا تضيفه

- لا React.
- لا تعديل على `MasteryTestView`.
- لا Migration أو SQL.
- لا تعديل على RPC المثبتة.
- لا dependency جديدة.
- لا Git tag.

## ترتيب الملفات

1. `mastery-results.types.ts`
2. `supabase-mastery-results.repository.ts`
3. `mastery-results.fingerprint.ts`
4. `mastery-results.service.ts`
5. تعديلات Authorization
6. اختبارات Repository/Service/Fingerprint
7. اختبار الحد المعماري
8. وثيقة التصميم

## معايير القبول

- أسباب الرفض السبعة مطابقة للـRPC حرفيًا.
- استجابة RPC تُعامل كـ`unknown` وتفشل مغلقًا.
- البصمة تُحسب داخل Service باستخدام UTF-8 byte length.
- لا استدعاء مباشر لـRPC من React.
- لا عميل Supabase إضافي.
- التهيئة كسولة.
- `AbortError` لا يُبتلع.
- الصلاحية الجديدة تمر عبر السياسة المركزية.
- Build وLint وPrettier والاختبارات كلها ناجحة في Codespaces.

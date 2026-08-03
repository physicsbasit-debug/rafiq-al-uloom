# Phase 2-C5-A: Auth Lifecycle Integration Hardening

## الحالة

هذه حزمة برمجية محدودة لدورة حياة Auth داخل الذاكرة، مبنية على نقطة الإغلاق:

```text
commit: d9f38bd
431 basic tests
50 Supabase integration tests
481 total tests
```

وتلتزم بعقد `Phase 2-C5-0` المعتمد.

لا تغلق هذه الحزمة Phase 2-C5-A قبل مراجعة الكود الفعلي وتشغيل الفحوص في Codespaces.

## الفجوة المثبتة

كان مسار الاستعادة يعمل هكذا:

```text
session_error
→ retrySession()
→ getCurrentSession() يعيد authenticated
→ refreshAuthorization()
```

لكن `refreshAuthorization()` لا تعمل قبل أن تعرف `authorization.service` قيمة `currentUserId` من حدث Auth سابق.

عند استعادة جلسة بلا `INITIAL_SESSION` أو `SIGNED_IN` جديد تكون النتيجة السابقة:

```text
authState = authenticated
authorizationState = null
Profile requests = 0
```

أي أن الواجهة قد تبقى في تحميل Authorization بلا نهاية.

## الإصلاح الجذري المحدود

أضيف إلى عقد `AuthorizationService`:

```ts
ensureAuthorizationForUser(userId: string): Promise<void>
```

تستخدمه `retrySession()` بعد استعادة جلسة مصادقة:

```ts
await services.authorization.ensureAuthorizationForUser(state.user.id);
```

### سلوك العملية الجديدة

- تحمل Profile لهوية مستعادة حتى لو لم يصل Auth event جديد.
- تنتظر الطلب الجاري إذا كانت الهوية نفسها قيد التحميل.
- لا تعيد قراءة Profile محملة وصالحة للهوية نفسها.
- تعيد المحاولة بعد `profile_error`.
- تلغي طلب مستخدم سابق عند الانتقال إلى مستخدم جديد.
- تشترك أحداث `initial_session` و`signed_in` في المسار نفسه لمنع ازدواج الطلب.

تبقى `refreshAuthorization()` منفصلة بوصفها إعادة قراءة صريحة وقسرية للحالة الإدارية الحالية.

## قرار C2-B محفوظ

لا تعاد قراءة Profile تلقائيًا عند:

```text
token_refreshed
user_updated
password_recovery
mfa_challenge_verified
unknown
```

هذه الحزمة لا تضيف Polling أو Realtime أو Cache TTL، ولا تستخدم تجديد التوكن لتعويض فجوة التهيئة.

## الملفات المعدلة

```text
src/services/auth/authorization.service.ts
src/features/auth/AuthSessionProvider.tsx
tests/auth/authorization.service.test.ts
tests/features/auth/AuthSessionProvider.test.tsx
```

## الملف الجديد

```text
tests/features/auth/AuthSessionLifecycle.test.tsx
```

## ملفات التعليمات

```text
README_PHASE_2_C5_A.md
APPLY_PHASE_2_C5_A.txt
```

## الاختبارات الجديدة

### Authorization service: اختباران

1. تحميل Profile صراحة لهوية مستعادة قبل أي Auth event.
2. منع تكرار طلب Profile عند وصول `signed_in` أثناء مزامنة الهوية نفسها.

### دورة الحياة المتكاملة: 14 اختبارًا

1. استعادة جلسة authenticated بلا حدث جديد وتحميل Authorization.
2. الاستعادة إلى Guest بلا طلب Profile.
3. تجاهل نتيجة Retry قديمة بعد حدث أحدث لمستخدم آخر.
4. عدم إعادة القراءة عند `token_refreshed`.
5. عدم إعادة القراءة عند `user_updated`.
6. عدم إعادة القراءة عند `password_recovery`.
7. عدم إعادة القراءة عند `mfa_challenge_verified`.
8. عدم إعادة القراءة عند `unknown`.
9. تحديث الحالة إلى suspended عبر `refreshAuthorization()` الصريح.
10. التعافي من `profile_error` عبر التحديث الصريح.
11. مسح Auth وAuthorization عند `signed_out` خارجي.
12. إبقاء الجلسة والتفويض عند فشل Sign Out.
13. منع نتيجة Profile قديمة للمستخدم A من الانتقال إلى B.
14. الفشل المغلق ومسح Authorization عند Auth error event.

## الأعداد المتوقعة

```text
39 test files
447 basic tests
50 Supabase integration tests
497 total tests
```

هذه أعداد متوقعة وليست نتيجة اعتماد قبل تشغيل Codespaces.

## حدود الحزمة

لا تعديل على:

```text
src/App.tsx
src/services/auth/auth.service.ts
src/services/auth/auth.types.ts
src/services/auth/authorization.policy.ts
src/features/auth/RequireCapability.tsx
supabase/*
package.json
```

ولا توجد Migration أو Policy أو Dependency جديدة.

## الفحوص المنفذة في بيئة التجهيز

```text
TypeScript syntax transpile للملفات المعدلة                 PASS
Strict contract check لملفات الإنتاج بمصرحات خارجية        PASS
Strict contract check للاختبارات الجديدة والمعدلة           PASS
تشغيل مباشر لنواة الخدمة القديمة: 0 طلب وstate=null         CONFIRMED
تشغيل مباشر للنواة الجديدة: طلب واحد وauthorized            CONFIRMED
اختبار مباشر لمنع الطلب المكرر أثناء signed_in              CONFIRMED
Overlay فوق المستودع المرفوع                                PASS
```

تعذر تشغيل `npm ci` بسبب 404 من سجل الحزم الداخلي للحزمة:

```text
zod-validation-error@4.0.2
```

لذلك تبقى فحوص Vitest وBuild وLint وPrettier حاسمة في Codespaces بعد مراجعة كلاود.

## معايير القبول

```text
ensureAuthorizationForUser موجودة في العقد والتنفيذ
retrySession يمرر user.id صراحة
لا إعادة Profile عند أحداث C2-B الخمسة
لا طلب مكرر للهوية نفسها
نتيجة Retry القديمة لا تتجاوز حدثًا أحدث
فشل Sign Out لا ينتج Guest وهميًا
لا تعديل على App أو RLS أو Policy
447/447 basic tests
50/50 integration tests
Build وLint وPrettier ناجحة
Git نظيف ومتزامن
```

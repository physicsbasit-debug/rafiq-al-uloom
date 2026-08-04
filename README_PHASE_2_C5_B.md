# Phase 2-C5-B: Real Supabase Auth Composition Tests

## النطاق

هذه الدفعة تضيف اختبارات تكامل حقيقية للسلسلة:

```text
Supabase Auth
→ createAuthService
→ createProfileService
→ createAuthorizationService
→ Auth events
→ Profile
→ AuthorizationState
→ RLS
```

لا تستخدم React، ولا تحاكي عميل Supabase أو استجابات Profile، ولا تعدل أي ملف إنتاجي أو Migration أو Grant أو RLS.

## الملفات

```text
tests/integration/helpers/auth-composition-harness.ts
tests/integration/supabase-auth-composition.integration.ts
README_PHASE_2_C5_B.md
APPLY_PHASE_2_C5_B.txt
```

## السيناريوهات الجديدة

- جلسة أولية فارغة تنتج `guest/null`.
- تسجيل دخول حقيقي لكل دور نشط ينتج `authorized` بالدور الصحيح ويقرأ صفًا من الكتالوج السحابي.
- `pending` و`suspended` ينجحان في Auth لكن لا يحصلان على محتوى سحابي.
- تسجيل خروج حقيقي يمسح Auth وAuthorization.
- Profile مفقودة تنتج `profile_error` ثم تتعافى عبر `refreshAuthorization()` بعد الاستعادة الإدارية.
- تغيير `active → suspended` يمنع قاعدة البيانات فورًا قبل تحديث الواجهة، ثم يزامن الواجهة صراحة.
- تغيير `student → teacher` لا يظهر قبل Refresh ويظهر بعده من `public.profiles`.
- تبديل مستخدمين على العميل نفسه لا يحتفظ بدور أو Profile المستخدم السابق.

## التسلسل داخل الملف

يستخدم الملف:

```ts
describe('...', { concurrent: false }, () => { ... });
```

اختبارات الملف تعمل بالتسلسل افتراضيًا في إعداد المشروع الحالي، لكن الخيار الصريح يحصّن الملف إذا فُعّل `sequence.concurrent` عالميًا مستقبلًا. لا نستخدم `describe.sequential` لأنها واجهة مهملة وتُزال في Vitest 5.

## عدد الاختبارات

تضيف الدفعة 11 اختبار تكامل:

```text
50 اختبارات تكامل سابقة
+11 C5-B
=61 اختبار تكامل متوقع
```

مع بقاء 447 اختبارًا أساسيًا، يصبح الإجمالي المتوقع:

```text
508 اختبارات
```

## الحدود

لا تعيد هذه الدفعة اختبار تفاصيل C2/C4 مثل قراءة المحتوى المعتمد، منع الكتابة، أخطاء `42501`، حارس React، أو مصفوفة `authorizeOperation`. تستخدم صف `grades` ثابتًا لإثبات RLS بلا قلب حالات Seed وبلا سباق مع ملفات التكامل الأخرى. وهي لا تحاول إثارة `token_refreshed` أو `user_updated` أو أحداث البريد وMFA على Supabase الحقيقية؛ عقد هذه الأحداث مُغطى في C5-A.

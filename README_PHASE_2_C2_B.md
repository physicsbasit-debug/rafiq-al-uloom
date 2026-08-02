# Phase 2-C2-B: UserProfile + AuthorizationState Client Read Layer

## الهدف

إضافة طبقة TypeScript لقراءة `public.profiles` من العميل وربطها بأحداث المصادقة الحالية دون إضافة واجهات React أو تعديل عقد Phase 2-C1.

## الملفات المضافة

```text
src/services/auth/authorization.types.ts
src/services/auth/profile.service.ts
src/services/auth/authorization.service.ts
tests/auth/profile.service.test.ts
tests/auth/authorization.service.test.ts
tests/integration/supabase-profile-read.integration.ts
README_PHASE_2_C2_B.md
APPLY_PHASE_2_C2_B.txt
```

## ما تنفذه الدفعة

- تعريف `UserRole` و`UserStatus` و`UserProfile`.
- تعريف حالات التفويض:
  - `loading_profile`
  - `authorized`
  - `pending`
  - `suspended`
  - `profile_error`
- قراءة صف المستخدم من `public.profiles` عبر PostgREST.
- تمرير `AbortSignal` الفعلية إلى `.abortSignal(signal)`.
- الحفاظ على `AbortError` دون تحويلها إلى خطأ عام.
- التحقق وقت التشغيل من كل قيم `role` و`status` وبقية حقول الصف.
- اعتبار صف Profile المفقود خطأ `missing_profile`، بلا fallback صامت.
- قراءة Profile عند `initial_session`، وعند `signed_in` فقط عند الحاجة.
- عدم إعادة القراءة عند:
  - `token_refreshed`
  - `user_updated`
  - `password_recovery`
  - `mfa_challenge_verified`
  - `unknown`
- إلغاء الطلب الجاري عند تغيير المستخدم أو تسجيل الخروج أو إزالة آخر مستمع.
- منع النتائج المتأخرة من استبدال حالة مستخدم أحدث.
- توفير `refreshAuthorization()` للتحديث اليدوي الصريح.
- الحفاظ على اشتراك Auth مركزي واحد.

## تعليق maybeSingle الوقائي

يستخدم قارئ Profile:

```ts
.eq('id', userId).maybeSingle()
```

وهذا آمن هنا تحديدًا لأن `profiles.id` مفتاح أساسي يمنع تعدد الصفوف بنيويًا. يحتوي الكود تعليقًا يمنع نسخ هذا النمط إلى استعلام غير فريد دون إعادة تقييم الافتراض.

## ما لا تنفذه الدفعة

- لا واجهات تسجيل دخول.
- لا React Context أو Provider.
- لا تعديل على `auth.service.ts` أو `auth.types.ts`.
- لا تعديل SQL أو Migration.
- لا تعديل `role` أو `status` أو `display_name` من العميل.
- لا `mastery_results`.
- لا ملكية مسودات أو صلاحيات مراجعة محتوى.

## الاختبارات

### اختبارات الوحدة

- عقد استعلام Profile وقائمة الأعمدة الصريحة.
- `AbortSignal` و`AbortError`.
- التحقق الصارم من الصف وقيم الدور والحالة.
- إخفاء أخطاء PostgREST الخام وحفظ `cause` تشخيصيًا.
- توقيت إعادة قراءة Profile حسب AuthEvent.
- الإلغاء ومنع Race Conditions.
- الاشتراك المركزي و`refreshAuthorization()`.

### اختبار التكامل

`tests/integration/supabase-profile-read.integration.ts` يختبر على Supabase المحلية:

1. قراءة Profile المستخدم المسجل عبر `ProfileService` الإنتاجية.
2. حجب Profile مستخدم آخر عبر RLS وتحويل عدم ظهور الصف إلى `missing_profile`.

تبقى اختبارات C2-A وB3c الحالية ضمن `npm run test:supabase` دون تعديل.

## معايير القبول

```text
npm run build
npm run lint
npm run test
npx prettier --check .
npm run test:supabase
git status
```

المطلوب:

- نجاح جميع الاختبارات الأساسية.
- نجاح اختبارات C2-A القديمة.
- نجاح اختبارات B3c القديمة 13/13.
- نجاح اختباري التكامل الجديدين.
- عدم تعديل أي ملف خارج النطاق المعتمد.
- `nothing to commit, working tree clean` بعد التثبيت النهائي.

# رفيق العلوم — تشغيل المصادقة والصلاحيات

## 1. الغرض

هذه الوثيقة تصف السلوك التشغيلي الفعلي لمسار المصادقة والتفويض بعد Phase 2-C5-B. لا تمنح صلاحيات جديدة ولا تستبدل RLS أو GRANT.

## 2. متغيرات البيئة الأمامية

المسموح داخل تطبيق Vite:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`VITE_SUPABASE_ANON_KEY` مفتاح عميل عام، وتظل الحماية معتمدة على RLS وGRANT.

الممنوع داخل `src/` و`public/` و`dist/`:

```text
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY
POSTGRES_PASSWORD
SUPABASE_DB_PASSWORD
JWT_SECRET
GOTRUE_JWT_SECRET
PGRST_JWT_SECRET
```

## 3. التشغيل المحلي

```bash
npx supabase start
npx supabase db reset
npm run test:supabase
npm run verify:auth-closure
```

أمر `verify:auth-closure` لا يبدأ Supabase تلقائيًا. يجب تشغيل البيئة المحلية قبل الأمر.

## 4. حالات Auth

```text
loading
 guest
authenticated
error
```

- `guest` هو عدم وجود جلسة سحابية.
- `error` هو فشل تحديد الجلسة، ولا يُعامل كـGuest.
- وضع الزائر المحلي يبقى خارج محرك الصلاحيات.

## 5. حالات Authorization

```text
loading_profile
authorized
pending
suspended
profile_error
```

مصدر `role` و`status` هو `public.profiles` فقط.

## 6. حالات الحساب

```text
pending
active
suspended
```

- `pending`: المصادقة قد تنجح، لكن الوصول السحابي يبقى محجوبًا.
- `active`: تُطبق مصفوفة العمليات حسب الدور.
- `suspended`: الوصول السحابي محجوب.

## 7. دورة تسجيل الدخول والخروج

تسجيل الدخول الحقيقي يمر عبر:

```text
Supabase Auth
→ auth.service
→ authorization.service
→ profile.service
→ AuthorizationState
```

نجاح Sign Out ينتج:

```text
AuthState = guest
AuthorizationState = null
```

فشل Sign Out لا يحول التطبيق إلى Guest كذبًا، لأن الجلسة الفعلية قد تبقى صالحة.

## 8. استعادة الجلسة

مسار Retry المعتمد:

```text
retrySession()
→ getCurrentSession()
→ ensureAuthorizationForUser(userId)
```

لا يعتمد Retry على وصول `INITIAL_SESSION` أو `SIGNED_IN` جديد بعد استعادة الجلسة.

## 9. أحداث لا تعيد قراءة Profile

لا تعاد قراءة Profile تلقائيًا عند:

```text
token_refreshed
user_updated
password_recovery
mfa_challenge_verified
unknown
```

هذه الأحداث تخص جلسة مهيأة، ولا تثبت تغير `public.profiles`.

## 10. التغيير الإداري أثناء التشغيل

تغيير `role` أو `status` يتم فقط عبر مسار موثوق:

- Supabase Dashboard.
- SQL إداري.
- Backend موثوق مستقبلًا.

ولا يتم من تطبيق العميل.

الاختبار المركزي المثبت:

```text
active → suspended
→ RLS تمنع البيانات فورًا
→ Authorization المحلية قد تبقى قديمة مؤقتًا
→ refreshAuthorization()
→ AuthorizationState = suspended
```

هذا يثبت أن الحماية الخلفية فورية، بينما مزامنة الواجهة صريحة.

## 11. حدود استدعاءات Supabase Auth

الوصول المباشر إلى Supabase Auth محصور في:

```text
src/services/auth/auth.service.ts
```

الفاحص لا يعتمد على اسم متغير مثل `supabase`. يمنع أي وصول إلى namespace باسم `.auth` أو `['auth']` خارج الملف المعتمد، بما يشمل أمثلة Supabase المعروفة:

```text
getSession
getUser
signInWithPassword
signUp
signOut
onAuthStateChange
admin.*
mfa.*
```

وهو يمنع أيضًا أي عملية Auth جديدة مستقبلية تحت namespace نفسها، فلا تتحول قائمة الأمثلة إلى ثغرة عند توسع المكتبة.

الاستثناء الوحيد هو `services.auth.*` داخل `AuthSessionProvider.tsx` للعمليات المعرفة في واجهة التطبيق الداخلية `AuthService`. هذا ليس Supabase Client، بل واجهة تطبيقية تمر أصلًا عبر `auth.service.ts`.

## 12. معالجة الأعطال

### Supabase غير متاحة

- لا يظهر محتوى محمي.
- تظهر رسالة عامة.
- لا تُعرض رسالة Supabase الخام للمستخدم.

### Session Error

- لا يُعامل كـGuest.
- يمكن استخدام Retry أو Sign Out وفق واجهة C3.

### Profile Error

- تبقى الجلسة مصادقة.
- لا يمنح Authorization.
- يمكن استخدام `refreshAuthorization()` بعد معالجة السبب.

### Pending وSuspended

- تظهر شاشة الحالة المناسبة.
- RLS تمنع البيانات السحابية.

### متغيرات البيئة مفقودة

يفشل إنشاء عميل Supabase برسالة إعداد واضحة، ولا يحدث fallback سحابي صامت.

## 13. الحدود المؤجلة

لا تتضمن Phase 2-C:

- Password reset UI.
- Resend confirmation email.
- MFA enrollment.
- OAuth providers.
- Account deletion.
- Admin dashboard.
- Realtime Profile subscription.
- حفظ نتائج الطالب سحابيًا.
- مساحات المعلم والمراجع الفعلية.
- Code splitting لحزمة Vite.

هذه البنود تُعالج في مراحلها المخصصة.

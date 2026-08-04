# Phase 2-C5-C1: Operational Closure Verification

## الغرض

تضيف هذه الدفعة أدوات التحقق التشغيلي والتوثيق اللازم قبل التجميد النهائي لمسار Auth.

لا تحتوي:

- تعديلًا على `src/`.
- اختبارات جديدة.
- Migration أو RLS أو GRANT جديدًا.
- Dependency جديدة.
- إنشاءً تلقائيًا لوسم Git.

## نقطة الأساس

```text
commit 4c69442
447 basic tests passed
61 Supabase integration tests passed
508 total tests
```

## الملفات

```text
scripts/verify-auth-security.sh
scripts/check-auth-client-boundaries.mjs
docs/AUTH_OPERATIONS.md
docs/ARCHITECTURE.md
docs/PHASES.md
package.json
README_PHASE_2_C5_C.md
APPLY_PHASE_2_C5_C.txt
```

## أمر التحقق

```bash
npm run verify:auth-closure
```

ينفذ بالترتيب:

```text
build
lint
basic tests
Prettier
client boundary and dist secret scan
Supabase status
Supabase db reset
Supabase integration tests
git diff --check
```

يستخدم السكربت:

```bash
set -euo pipefail
```

ويتوقف عند أول فشل. لا يبدأ Supabase تلقائيًا.

## اكتشاف استدعاءات Supabase Auth

الفاحص لا يبحث عن النص `supabase.auth` ولا يفترض اسمًا معينًا للعميل.

بدلًا من ذلك يمنع أي وصول برمجي إلى namespace باسم:

```text
.auth
['auth']
```

داخل `src/` خارج:

```text
src/services/auth/auth.service.ts
```

وبذلك يكتشف مثلًا:

```text
client.auth.signInWithPassword(...)
sdk.auth.signOut(...)
getClient().auth.onAuthStateChange(...)
client['auth'].admin.createUser(...)
```

كما يمنع استخراج namespace إلى alias خارج الملف المعتمد.

القائمة التالية أمثلة موثقة وليست سقف الفحص:

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

الاستثناء التطبيقي المحدود هو `services.auth.*` داخل `AuthSessionProvider.tsx` للعمليات المعرفة في واجهة `AuthService` الداخلية. هذه الاستدعاءات لا تصل إلى Supabase مباشرة؛ بل تمر عبر `auth.service.ts`.

هذا التصميم يمنع النجاح الكاذب الناتج عن تغيير اسم المتغير، ويمنع أيضًا فشل الفحص بسبب استخدام واجهة التطبيق الداخلية المشروعة.

## فحص الأسرار

يفحص:

```text
src/
public/
dist/
```

ويمنع معرفات Service Role وكلمات مرور PostgreSQL وأسرار JWT. يفحص الرمز العام `service_role` بصرامة داخل `src/` و`public/`، بينما يعتمد داخل `dist/` على المعرفات الحساسة الدقيقة والقيم السرية الفعلية لتجنب إنذار زائف ناتج عن نص داخلي في Dependency مجمعة.

كما يقرأ القيم الحساسة الموجودة في بيئة التشغيل، إن كانت بطول مناسب، ويتأكد أنها لا تظهر حرفيًا داخل `dist/` من دون طباعتها.

المسموح:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```


## توافق مخرجات Supabase CLI المحلية

تقبل اختبارات التكامل صيغتي مفاتيح العميل العام:

```text
PUBLISHABLE_KEY
ANON_KEY
```

يستخدم `PUBLISHABLE_KEY` عند وجوده، ويعود إلى `ANON_KEY` في إصدارات CLI التي تعرض المفتاح القديم. كما يُشتق عنوان REST من `API_URL` عند غياب `REST_URL`. لا يُعد غياب `REST_URL` أو `PUBLISHABLE_KEY` وحده دليلًا على أن Supabase غير جاهزة.

فحص الجاهزية بعد `db reset` ينتظر فقط القيم اللازمة فعليًا:

```text
API_URL
SERVICE_ROLE_KEY
PUBLISHABLE_KEY أو ANON_KEY
```

## المتطلبات

- Node وnpm وGit.
- Dependencies مثبتة.
- Supabase CLI المحلية من `devDependencies`.
- Docker وSupabase local stack قيد التشغيل مسبقًا.

## النتيجة المتوقعة

```text
447 basic tests passed
61 Supabase integration tests passed
508 total tests
Auth client boundary scan passed
Auth closure verification passed
```

تحذير Vite الخاص بحجم Chunk لا يحجب C5-C ما دام Build ناجحًا.

## ما لا يحدث في C5-C1

- لا تُعلن Phase 2-C كاملة.
- لا يُنشأ `v0.4-auth-security-complete`.
- لا تُعدل نسخة `package.json`.

بعد نجاح التحقق وتثبيت C5-C1، تأتي C5-C2 لتحديث وثائق الإغلاق، ثم يعاد التحقق وتُنشأ العلامة يدويًا فوق الالتزام النهائي.

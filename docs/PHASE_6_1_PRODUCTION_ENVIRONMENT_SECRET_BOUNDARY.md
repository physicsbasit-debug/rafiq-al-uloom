# Phase 6-1 — Production Environment + Secret Boundary

**Baseline:** `a1307dc4b09faca434b7c5d356670b9fba780da0`
**Branch:** `phase-6-production-readiness`

## الحالة

6-0 مغلقة. هذه الدفعة تنفذ عقد بيئة الإنتاج وحدود الأسرار فقط، دون Remote Supabase أو نشر أو migration جديدة أو تغيير في منطق المنتج.

## القرارات

### 1. Browser-visible configuration

القيم العامة الوحيدة المطلوبة للواجهة الإنتاجية:

```text
VITE_CONTENT_PROVIDER=supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

يبقى اسم `VITE_SUPABASE_ANON_KEY` مؤقتًا للتوافق مع الكود المجمد، لكن قيمته في أي نشر إنتاجي جديد يجب أن تكون Supabase publishable key حديثة.

لا نعيد تسمية المتغير في 6-1 لأن إعادة التسمية ستوسع التغيير عبر طبقات العميل والاختبارات دون فائدة أمنية مباشرة.

### 2. Server-only secrets

يمنع إدخال أي من الآتي تحت `VITE_*` أو في Git:

- `GEMINI_API_KEY`
- Supabase secret/service-role keys
- database passwords
- SMTP credentials
- OAuth client secrets
- private signing keys
- backup/storage private credentials

أي `VITE_*` يعد browser-visible بحكم bundling.

### 3. Git environment policy

`.gitignore` يتجاهل:

```text
.env
.env.*
```

مع استثناء الملفات الآمنة المتعقبة عمدًا:

```text
.env.development
.env.test
.env.example
```

لا تحتوي هذه الاستثناءات على أسرار إنتاجية.

### 4. Production environment verifier

الأمر:

```bash
npm run verify:production-env
```

يفشل إذا:

- لم يكن provider هو `supabase`.
- كان Supabase URL نسبيًا أو HTTP أو محليًا.
- غاب publishable key.
- كانت القيمة `sb_secret_...`.
- لم تكن قيمة النشر الجديدة `sb_publishable_...`.
- ظهر متغير خادمي حساس تحت `VITE_*`.

الفاحص لا يطبع قيم الأسرار.

## سبب فرض publishable key الحديثة

Supabase توصي حاليًا باستخدام `sb_publishable_...` في المكونات العامة، و`sb_secret_...` في المكونات الخادمية فقط. مفاتيح `anon/service_role` القديمة في مسار الإهمال، لذلك لا نبدأ نشرًا إنتاجيًا جديدًا بعقد قديم.

## ما لم يتغير

- `src/services/data/supabase-client.ts`
- Auth/RLS logic
- AI gateway production code
- migrations
- local Supabase configuration
- Phase 5 frozen behavior

## اختبارات القبول

يجب أن تنجح:

```bash
npx --no-install prettier --check .
npm run lint
npm run build
npm run test
npx --no-install vitest run tests/architecture/phase-6-1-production-environment.test.ts
git diff --check
```

ويجب اختبار الفاحص يدويًا بقيم بيئة آمنة، مثل:

```bash
VITE_CONTENT_PROVIDER=supabase \
VITE_SUPABASE_URL=https://school-project.supabase.co \
VITE_SUPABASE_ANON_KEY=sb_publishable_test_public_key_123456789 \
npm run verify:production-env
```

لا يتم في 6-1:

- ربط Remote Supabase.
- إنشاء production project.
- ضبط Gemini secret.
- نشر Edge Functions.
- تشغيل production data.
- تعديل migrations.

## معيار الإغلاق

6-1 تغلق فقط عندما:

- يكون diff محصورًا في ملفات هذه الدفعة.
- اختبار البيئة الجديد ناجح.
- full core suite ناجحة.
- build/lint/prettier ناجحة.
- لا يوجد secret حقيقي.
- لا يوجد production deployment.
- Git نظيف ومتزامن بعد commit/push.

**NEXT:** `6-2 — CI + Supply Chain Gate`

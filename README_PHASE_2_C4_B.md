# Phase 2-C4-B: Direct PostgREST Authorization Bypass Tests

## النطاق

تثبت هذه الدفعة أن تجاوز `App.tsx` و`RequireCapability` و`authorizeOperation` وإرسال الطلبات مباشرة إلى Supabase عبر PostgREST لا يمنح أي صلاحية إضافية.

هذه دفعة اختبارات فقط. لا تضيف Migration أو Policy أو `GRANT` جديدًا، ولا تعدل أي ملف داخل `src/`.

## الملفات

```text
tests/integration/supabase-authorization-bypass.integration.ts
tests/integration/supabase-profiles-authorization.integration.ts
README_PHASE_2_C4_B.md
APPLY_PHASE_2_C4_B.txt
```

## ما تنفذه

- تنشئ جلسات Supabase حقيقية مستقلة للحالات التالية:
  - `active student`
  - `active teacher`
  - `active reviewer`
  - `pending student`
  - `suspended student`
  - `anon`
- تستخدم `supabase-js .from(...)` مباشرة، أي مسار PostgREST بلا React أو محرك صلاحيات.
- تثبت أن الأدوار النشطة تقرأ الكتالوج السحابي.
- تثبت أن `pending` و`suspended` يحصلان على صفوف فارغة بسبب RLS.
- تثبت أن `anon` يُرفض بـSQLSTATE `42501` بسبب غياب `GRANT SELECT`.
- تثبت أن جميع الأدوار النشطة لا تقرأ دروس `draft`.
- تختبر `INSERT` على `lessons` بحمولة صحيحة بنيويًا ومشتقة من سجل Seed فعلي:
  - أسماء أعمدة صحيحة.
  - أنواع صحيحة.
  - مفتاح أجنبي موجود.
  - `id` و`display_order` فريدان.
  - بلا `.select()` أو `RETURNING`.
- تثبت أن `INSERT` و`UPDATE` و`DELETE` للمحتوى تُرفض عند طبقة صلاحية الجدول، لا عند RLS.
- تثبت أن المراجع لا يستطيع تغيير حالة درس إلى `approved` مباشرة.
- تثبت أن الطالب والمعلم والمراجع لا يستطيعون تعديل `display_name` أو `role` أو `status` في ملفاتهم.
- تقرأ البيانات إداريًا قبل وبعد محاولات الكتابة للتأكد من عدم تغيرها.
- تنظف أي صف اختبار غير متوقع داخل `finally`.
- تعيد استخدام `SupabaseAuthFixtures` الفعلية بلا تعديل على عقدها.

## تقوية اختبار C2-A القائم

يُعدّل اختبار approved الحالي داخل:

```text
tests/integration/supabase-profiles-authorization.integration.ts
```

بدل إنشاء اختبار ثانٍ يقلب حالة Seed بالتوازي.

الاختبار القائم أصبح يثبت أن المحتوى المعتمد يُقرأ بواسطة:

```text
active student
active teacher
active reviewer
```

ويثبت داخل النافذة نفسها أن:

```text
pending
suspended
```

لا يقرآن الدرس المعتمد، ثم يعيد جميع حالات Seed إلى `draft` داخل `finally`.

هذا يمنع تكرار تعديل الحالة عبر ملفين تكامليين قد يعملان بالتوازي.

## طبقات المنع التي تتحقق منها الاختبارات

### غياب GRANT

المتوقع:

```text
error.code = 42501
error.message contains "permission denied"
error.message contains table name
error.message does not contain "row-level security"
```

### رفض RLS للقراءة

المتوقع:

```text
error = null
data = []
```

لا يُخلط بين الطبقتين، ولا يُكتفى بعبارة عامة مثل "فشل الطلب".

## الاختبارات الجديدة

تضيف الحزمة 18 اختبار تكامل جديدًا:

```text
1  قراءة الكتالوج لكل الأدوار النشطة
2  رفض pending وsuspended عبر RLS
1  رفض anon عبر GRANT
1  إخفاء draft عن الأدوار النشطة
3  رفض INSERT للمحتوى
3  رفض UPDATE للمحتوى
3  رفض DELETE للمحتوى
1  رفض اعتماد المحتوى من reviewer
3  رفض تصعيد صلاحيات profiles
```

كما تقوي اختبار approved الموجود دون زيادة عدد اختباراته.

العدد المتوقع بعد التطبيق، قبل التشغيل الفعلي:

```text
431 basic tests
50 Supabase integration tests
481 total tests
```

هذه أعداد متوقعة وليست نتيجة قبول حتى تعمل الاختبارات على PostgreSQL المحلية.

## ما لا تنفذه

- لا Migration أو SQL جديد.
- لا تعديل على RLS أو Grants.
- لا تعديل داخل `src/`.
- لا فتح كتابة للمعلم أو المراجع.
- لا إنشاء مساحة معلم أو مراجع.
- لا استدعاء `authorizeOperation` داخل اختبارات التكامل.
- لا إضافة `service_role` إلى كود العميل.
- لا إنشاء Fixture دائمة أو بيانات Seed جديدة.

## الفحوص المطلوبة

بعد مراجعة الملفات الفعلية:

```text
npx supabase db reset
npm run test:supabase
npm run build
npm run lint
npm run test
npx prettier --check .
git status
```

المطلوب:

- نجاح 50/50 اختبار تكامل.
- بقاء 431/431 اختبارًا أساسيًا.
- نجاح build وlint وPrettier.
- عدم وجود أي تعديل في `supabase/migrations/*` أو `src/*`.
- بقاء Git نظيفًا بعد تثبيت أي تنسيق مطلوب.

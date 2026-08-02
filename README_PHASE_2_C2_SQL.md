# Phase 2-C2-A: Profiles + Authorization RLS Database Foundation

هذه الحزمة تنفذ الأساس الأمني لملفات المستخدمين والتفويض في Supabase فقط.

## النطاق

- إنشاء `public.profiles`.
- ربطه واحدًا إلى واحد مع `auth.users` عبر `ON DELETE CASCADE`.
- اعتماد الأدوار: `student / teacher / reviewer`.
- اعتماد الحالات: `pending / active / suspended`.
- إنشاء Profile افتراضي `student + pending` لكل مستخدم Auth جديد.
- منح المستخدم المصادق عليه قراءة صفه فقط.
- منع `INSERT / UPDATE / DELETE` عن `authenticated` على `profiles`.
- منح `service_role` صراحة `SELECT / UPDATE` فقط على `profiles`.
- حذف سياسات القراءة العامة العشر من B2b قبل إنشاء سياسات C2-A.
- سحب قراءة المحتوى السحابي من `anon`.
- السماح للحسابات النشطة فقط بقراءة المحتوى المعتمد.
- الحفاظ على `GRANT SELECT` لـ`service_role` على جداول المحتوى العشرة.
- إضافة اختبارات مستخدمين وجلسات حقيقية، مع بقاء اختبار B3c القديم 13/13 بلا تعديل.

## حارس الحسابات السابقة

تتوقف Migration عمدًا إذا كان `auth.users` يحتوي أي حساب قبل التطبيق. لا تنفذ الحزمة فوق مشروع يحوي مستخدمين حقيقيين دون Migration Backfill منفصلة ومراجعة.

## الملفات

```text
supabase/migrations/20260803014500_add_profiles_and_authorization_rls.sql
tests/integration/supabase-profiles-authorization.integration.ts
tests/integration/helpers/supabase-auth-fixtures.ts
scripts/verify-supabase-local.sh
README_PHASE_2_C2_SQL.md
APPLY_PHASE_2_C2_SQL.txt
```

## تصميم Fixtures

- عميل `service_role` إداري واحد لا يستدعي `signInWithPassword` إطلاقًا.
- كل هوية تحصل على عميل مستقل بالمفتاح العام.
- المستخدمون يُنشؤون عبر `auth.admin.createUser` مع تأكيد البريد.
- الدور والحالة يُعدلان إداريًا بعد أن ينشئ Trigger الملف الافتراضي.
- الجلسة الحقيقية تُنشأ عبر `signInWithPassword` على عميل الهوية المستقل.
- `persistSession / autoRefreshToken / detectSessionInUrl` معطلة في بيئة Node.
- المستخدمون التجريبيون يُحذفون في `afterAll`.
- أي اختبار يغيّر `role/status` يستعيد القيم داخل `finally` في الاختبار نفسه.

## اختبارات الذرية

ينشئ اختبار التكامل Trigger مؤقتًا على `public.profiles` يرفض بريد Sentinel محددًا. يجب أن يفشل `auth.admin.createUser` كاملًا، وألا يبقى سجل في `auth.users` أو `profiles`. ثم يُحذف Trigger الاختبار داخل `finally` ويُثبت أن استعلام المستخدمين اليتامى يعيد صفرًا.

## معايير القبول

- `npx supabase db reset` ينجح من نقطة نظيفة.
- `scripts/verify-supabase-local.sh` ينجح.
- `npm run test:supabase` ينجح.
- اختبار B3c القديم يظل 13/13 بلا تعديل.
- `has_table_privilege('service_role', ..., 'SELECT')` يعيد `true` للجداول العشرة.
- اختبارات C2-A تستخدم جلسات مستخدم حقيقية.
- محاولات المستخدم لتعديل `display_name/role/status` تفشل بـSQLSTATE `42501`.
- `service_role` تنجح في `SELECT/UPDATE` وتفشل في `INSERT/DELETE` على `profiles`.
- `anon/pending/suspended` لا يقرؤون المحتوى السحابي.
- `active student/teacher/reviewer` يقرؤون الكتالوج والمحتوى المعتمد فقط.
- لا توجد سياسة B2b عامة قديمة متبقية.
- لا يوجد مستخدم Auth بلا Profile.

## خطة التراجع المحلية

هذه الحزمة لا تُطبّق على مشروع بعيد أو إنتاجي في هذه الدفعة. عند الحاجة إلى التراجع في البيئة المحلية يكون المسار المعتمد هو `npx supabase db reset` على نقطة Git السابقة. أمّا أي تراجع على قاعدة تحوي مستخدمين أو Profiles حقيقية فيحتاج Migration عكسية مستقلة ونسخة احتياطية، ولا يُنفذ بحذف الجدول يدويًا.

## خارج النطاق

- `AuthorizationState` وقارئ Profile في TypeScript.
- واجهات تسجيل الدخول.
- تعديل الملف الشخصي من العميل.
- لوحة إدارة الحسابات.
- ملكية المسودات ومراجعتها.
- `mastery_results`.

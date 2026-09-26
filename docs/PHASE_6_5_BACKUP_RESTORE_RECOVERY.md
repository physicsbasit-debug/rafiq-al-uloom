# Phase 6-5 — Backup + Restore + Migration Recovery

**Baseline:** `bd14bd4467f824d0c0013490e2ba2f6fc8b625b8`
**Branch:** `phase-6-production-readiness`

## الهدف

إغلاق فجوة الاستعادة التشغيلية قبل النشر الحقيقي. النسخة الاحتياطية لا تُعد صالحة لمجرد
إنشائها؛ القبول يتطلب Restore Drill حقيقي على قاعدة غير إنتاجية ومقارنة النتيجة بالمصدر.

لا تغيّر هذه المرحلة منطق المنتج أو SQL أو RLS أو Auth أو عقود Gemini.

## قرار الاستعادة

المحاولة الأولى باستخدام raw whole-database `pg_dump` أثبتت أنها المسار الخطأ مع Supabase:
النسخة الخام تضم كائنات داخلية تديرها المنصة، مثل Realtime ووظائف ذات إعدادات وصلاحيات لا
يملك مستخدم الاستعادة العادي إعادة إنشائها. لذلك لا نعالج كل خطأ داخلي بإضافة استثناء جديد.

العقد المعتمد يفصل بين مصدرَي الحقيقة:

- **Schema recovery:** من migrations المتتبعة في Git فقط، وبترتيب forward-only.
- **Data recovery:** من `supabase db dump --data-only --use-copy` مع حصر صريح في
  `public,private,auth`. الحصر الصريح مهم لأن إصدارات CLI/ميزات المنصة قد تضيف جداول
  managed جديدة مثل Storage/Vector لا تخص بيانات المنتج ولا ينبغي استعادتها يدويًا.

بهذا لا نحاول نسخ Supabase نفسها؛ نعيد بناء منصة نظيفة ثم نعيد بيانات رفيق العلوم إليها.

## نطاق التحقق

بعد الاستعادة نقارن fingerprints للجداول في:

- `public`: محتوى التطبيق وبياناته التشغيلية.
- `private`: الحالة الخادمية الخاصة مثل quota state.
- `auth`: بيانات Auth التي يعيد dump البيانات حفظها.
- `supabase_migrations.schema_migrations`: سجل migrations المطبقة الذي يجب أن يطابق
  المصدر بعد إعادة البناء من ملفات Git.
- `supabase_migrations.seed_files` **ليس** جزءًا من مقارنة الاستعادة؛ فهو metadata تشغيلي
  يسجله `db reset` عند تنفيذ seed، بينما الـdrill يتعمد استخدام `--no-seed` ثم يعيد بيانات
  المنتج من backup. سلامة بيانات seed نفسها تُثبت عبر fingerprints للجداول الفعلية، لا عبر
  وجود سجل `seed_files`.

الكود، migrations، Edge Functions، وعقود التطبيق يعاد بناؤها من Git عند deployment SHA
المعتمد. أسرار Edge وSMTP ومفاتيح الأطراف الخارجية لا تدخل backup أو Git.

لا يوجد في التطبيق الحالي استخدام لملفات Supabase Storage كبيانات منتج. إذا أضيفت ملفات
Storage مستقبلًا، فنسخ metadata وحده لا يكفي ويجب إضافة backup مستقل للـobjects.

## Restore Drill المحلي

الأمر المعتمد:

```bash
npm run verify:backup-recovery
```

ويقوم بما يأتي:

1. يشغل forward-only migration guard.
2. يبني fingerprints للمصدر دون طباعة الصفوف.
3. ينشئ data backup باستخدام Supabase CLI مع
   `--local --data-only --use-copy --schema public,private,auth`، وبذلك لا تدخل
   schemas المنصة غير المستخدمة في المنتج مثل Storage/Vector في ملف الاستعادة.
4. يتحقق من SHA-256 والحجم.
5. ينفذ `supabase db reset --no-seed` **محليًا فقط** لإعادة بناء schema من migrations.
6. يعيد البيانات داخل transaction واحدة مع
   `SET session_replication_role = replica` حتى لا تعاد triggers أثناء import.
7. يقارن counts + content fingerprints بعد الاستعادة بالمصدر.
8. يتحقق من أن `schema_migrations` أعيد بناؤها، مع استبعاد `seed_files` من
   المقارنة لأنه metadata خاص بتنفيذ seed وليس بيانات استعادة.
9. يحذف backup المؤقت بعد نجاح drill.
10. إذا فشل drill بعد إنشاء backup، يحتفظ بالنسخة المؤقتة بصلاحيات مقيدة ويطبع مسارها
    بدل حذف آخر وسيلة استعادة.

إعادة الضبط في هذه المرحلة مقصورة على **Supabase المحلية**. لا يوجد `--linked` ولا
`--db-url` في verifier.

## Production backup

في Phase 6-7، قبل أول migration أو نشر يمس البيانات:

- يؤخذ `pre-migration backup` من المشروع الحقيقي باستخدام مسار Supabase المدعوم.
- يحفظ خارج Git وخارج نفس failure domain للمشروع.
- يكون مشفرًا ومقيد الوصول.
- تسجل SHA-256 والحجم ووقت الإنشاء وdeployment SHA دون طباعة المحتوى أو الأسرار.
- ينفذ restore verification على recovery/staging project، لا على production.

لا `db reset` على الإنتاج، ولا Restore Drill مباشر فوق الإنتاج.

## Retention

الحد التشغيلي المبدئي:

- Daily logical backups: **14 يومًا**.
- Weekly backups: **8 أسابيع**.
- Monthly backups: **6 أشهر**.
- `pre-migration backup`: 30 يومًا على الأقل، وعدم حذفه قبل نجاح post-deploy verification
  والنسخة الدورية التالية.

هذه سياسة تشغيلية للمشروع، وليست ادعاءً بأن الخطة المجانية تنفذها تلقائيًا.

## RPO / RTO

### RPO

الهدف الاعتيادي: **24 ساعة** كحد أقصى عند الاعتماد على daily logical backup.

قبل migration إنتاجية يؤخذ `pre-migration backup` مباشرة، فيصبح RPO لحادث migration
قريبًا من checkpoint نفسه.

### RTO

الهدف الأولي: **ساعتين** لاستعادة البيانات، إعادة نشر deployment SHA المعتمد، وتشغيل
Security + Smoke/UAT الأساسية.

هذا Target وليس SLA. تقاس المدة الفعلية على recovery/staging في Phase 6-7 وتراجع إذا
أثبت القياس أنها غير واقعية.

## Forward-only migration recovery

- لا تعديل migration مطبقة.
- لا حذف migration تاريخية لإخفاء خطأ.
- لا `db reset` على الإنتاج.
- أي إصلاح بعد migration فاشلة يكون عبر **migration تصحيحية جديدة** forward-only متى
  كانت البيانات سليمة ويمكن الإصلاح بأمان.

### Runbook بعد migration فاشلة

1. أوقف بقية deployment فورًا.
2. لا تعدل migration التاريخية ولا تعاود التنفيذ عشوائيًا.
3. سجل migration والخطأ والحالة الفعلية.
4. افحص schema والبيانات قبل افتراض rollback كامل.
5. إذا كان الإصلاح آمنًا بلا فقد بيانات، أنشئ migration تصحيحية جديدة واختبرها على recovery.
6. إذا حدث تلف بيانات، استعد `pre-migration backup` أولًا على recovery/staging.
7. شغّل fingerprints وdatabase/RLS audit وSmoke/UAT قبل أي قرار إنتاجي.
8. وثق الحادث والقرار ثم استأنف deployment فقط بعد وضوح الحالة.

## ما يبقى لـPhase 6-7

الـdrill المحلي لا يدعي أنه يثبت:

- credentials الإنتاجية.
- سرعة restore على Supabase السحابية الحقيقية.
- استعادة Edge/SMTP/OAuth secrets.
- ملفات Storage المستقبلية.
- disaster recovery لمزود الاستضافة.

Phase 6-7 يجب أن يكرر المبدأ نفسه على recovery/staging حقيقية قبل 6-Freeze.

## معيار الإغلاق

```text
architecture contract               PASS
forward-only migration guard        PASS
Supabase-filtered logical backup    PASS
schema rebuild from migrations      PASS
data restore                        PASS
source/restore fingerprints         MATCH
migration history rebuild           PASS
failure-safe backup retention       PASS
full static CI gate                 PASS
full local Supabase CI gate         PASS
GitHub Actions                      PASS
```

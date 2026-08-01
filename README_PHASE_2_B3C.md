# Phase 2-B3c — Provider Parity Tests

## الهدف

إثبات التكافؤ العميق بين `asyncLocalContentRepository` و`SupabaseContentRepository`
على بيانات Supabase المحلية بعد `db reset`، مع إبقاء الاختبارات الافتراضية مستقلة عن Docker والشبكة.

## التشغيل

```bash
npm run test
```

يبقى هذا الأمر محليًا بالكامل ولا يشغّل اختبارات Supabase التكاملية.

لاختبارات التكافؤ:

```bash
npx supabase db reset
npm run test:supabase
```

يستخرج الاختبار `API_URL` و`SERVICE_ROLE_KEY` المحليين وقت التشغيل من
`npx supabase status -o env`. لا يُخزّن أي مفتاح في Git، ولا يُستخدم مفتاح الخدمة
داخل كود التطبيق؛ استخدامه محصور في اختبار التكامل المحلي لتجاوز RLS ومقارنة كامل
بيانات `draft` مع المزوّد المحلي.

## قرارات الترتيب

- ترتيب المواد داخل الفصل الدراسي يتبع أول ظهور للمادة في الوحدات المرتبة بـ`order`.
- `getObjectivesByIds` يحافظ على ترتيب المعرّفات المطلوبة.
- المنطق مشترك بين المزوّد المحلي ومزوّد Supabase عبر `content-ordering.ts`.

## خارج النطاق

- لا تبديل للمزوّد الافتراضي.
- لا تعديل للشاشات أو hooks.
- لا Auth ولا `mastery_results`.
- لا تعديل على `seed.sql`.

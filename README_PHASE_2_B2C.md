# Phase 2-B2c — Supabase Seed Generation

## الهدف

توليد `supabase/seed.sql` آليًا من ملفات TypeScript الموجودة في `src/content/seed/`.

## التشغيل

```bash
npx tsx scripts/generate-supabase-seed.ts
```

## قواعد المرحلة

- ملفات TypeScript الحالية هي مصدر الحقيقة الوحيد.
- لا يوجد اتصال شبكي أو استخدام لعميل Supabase أو مفاتيح بيئة.
- حالات المحتوى تبقى `draft` كما هي، ولذلك لا تظهر للعامة عبر سياسات RLS الحالية.
- المسار المدعوم لإعادة التطبيق هو قاعدة نظيفة عبر `npx supabase db reset`.
- لا تُستخدم `seed.sql` كأداة مزامنة عامة لقاعدة قائمة عند تغيير ترتيب أهداف الألعاب.

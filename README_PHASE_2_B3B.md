# Phase 2-B3b — SupabaseContentRepository

## النطاق

تنفيذ مزوّد قراءة Supabase خلف عقد `ContentRepository` الحالي، باستخدام دالة مصنع قابلة للحقن وكائن افتراضي كسول التهيئة.

## القرارات المثبتة

- `createSupabaseContentRepository(client?)` بدل الصنف.
- لا تهيئة لعميل Supabase عند مجرد استيراد الوحدة.
- استعلامات دفعية ثابتة للدروس/الأهداف والألعاب/علاقات الأهداف، بلا N+1.
- تمرير `AbortSignal` لكل استعلام فعلي.
- إعادة رمي `AbortError` كما هو، وتغليف بقية الأخطاء باسم العملية مرة واحدة.
- استخدام Mappers المعتمدة في B3a لكل صف مجال.
- لا تعديل على الشاشات أو hooks أو اختيار المزوّد الافتراضي في هذه الدفعة.

## الفحوص

```bash
npm run build
npm run lint
npm run test
npx prettier --check .
```

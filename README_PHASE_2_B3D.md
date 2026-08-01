# Phase 2-B3d: Provider Selection + B3 Closure

## الهدف

توصيل اختيار مزود المحتوى فعليًا بطبقة الاستعلامات، مع بقاء المزود المحلي هو الافتراضي وتهيئة Supabase كسولة.

## السلوك

- غياب `VITE_CONTENT_PROVIDER` أو فراغه: `local`.
- `VITE_CONTENT_PROVIDER=local`: المزوّد المحلي.
- `VITE_CONTENT_PROVIDER=supabase`: مزوّد Supabase.
- أي قيمة أخرى: خطأ صريح عند أول استخدام فعلي.
- مجرد استيراد وحدة المزود لا يقرأ البيئة ولا يهيئ عميل Supabase.

## الحراسة المعمارية

يفحص الاختبار الدائم المسارين:

- `src/features/`
- `src/services/queries/`

ويمنع الاستيراد المباشر من `async-local-content.repository`. ملف المزود المركزي داخل `src/services/data/` هو نقطة الاستيراد الوحيدة المقصودة للمزوّدين الفعليين.

## خارج النطاق

لا Auth، لا `mastery_results`، لا كتابة إلى Supabase، ولا تعديل على واجهات المستخدم.

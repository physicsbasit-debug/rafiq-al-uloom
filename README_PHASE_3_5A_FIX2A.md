# Phase 3-5A Fix 2A — Draft Save vs Submission Readiness Contract

هذه حزمة APPLY معتمدة بعد مراجعة REVIEW سطرًا بسطر.

## الهدف

فصل صلاحية المسودة للحفظ عن جاهزيتها للإرسال للمراجعة:

- `create_lesson_revision` → تحقق بنيوي مع `p_require_complete = false`.
- `save_lesson_revision` → تحقق بنيوي مع `p_require_complete = false`.
- `submit_lesson_revision` → تحقق كامل مع `p_require_complete = true`.
- `review_lesson_revision` عند الاعتماد → تحقق كامل مع `p_require_complete = true`.

المسودة يمكن أن تكون ناقصة، لكنها لا يمكن أن تكون فاسدة. الإرسال والاعتماد يتطلبان حمولة كاملة وصحيحة.

## النطاق

تضيف الحزمة Migration أمامية جديدة واختبار تكاملي جديد ووثيقة العقد فقط. لا تعدل `src/**` ولا Migration التاريخية Phase 3-1.

## خط أساس متوقع

قبل الرفع/التطبيق يجب أن يكون المستودع متزامنًا على الأقل مع نقطة Gate 1 Fix 1:

`5c12b40`

ويجب أن تبقى بصمة Migration التاريخية:

`32aecfebb303ef3e5edcd6b1143e4eb7a136212a01fc5117c00ef2f700fa8985  supabase/migrations/20260807170000_add_teacher_authoring_workflow.sql`

## ترتيب التحقق

1. اسحب `main` وتحقق من الحالة.
2. تحقق من بصمات ملفات APPLY.
3. تحقق من بصمة Migration التاريخية.
4. أعد Supabase من الصفر.
5. شغل اختبارات Fix 2A السبعة فقط.
6. شغل Gate 1 الحالي نفسه، ويجب أن يصبح `3/3 PASS`.
7. شغل اختبارات Phase 3-1 authoring workflow + bypass.
8. إذا نجح الجميع، شغل Full Supabase suite.
9. بعدها فقط شغل Prettier/Lint/Build/npm test/git diff check.

لا تعدل أي اختبار لتسهيل النجاح. إذا ظهر فشل جديد، يسجل Reproduction وتحدد طبقته قبل أي Fix آخر.

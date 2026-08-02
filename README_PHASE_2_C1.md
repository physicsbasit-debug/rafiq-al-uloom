# Phase 2-C1 — Auth Client & Session

هذه الحزمة تنفذ طبقة Auth فقط فوق عميل Supabase الحالي.

## النطاق

- أنواع Auth التطبيقية.
- تحويل آمن للأخطاء.
- استعادة الجلسة والمستخدم الحالي.
- تسجيل الدخول والتسجيل والخروج.
- اشتراك مركزي واحد في تغير حالة Auth.
- تهيئة كسولة، دون إنشاء عميل Supabase ثانٍ.
- اختبارات وحدة بعميل وهمي.

## قرارات مهمة

- `SignUpResult` يدعم: `confirmation_required / authenticated / error`.
- وجود البريد لا يُكشف؛ أخطاء الحساب الموجود تُعاد كـ`confirmation_required`.
- لا تُعرض رسالة Supabase الخام في `PublicAuthError`.
- لا توجد معاملات `AbortSignal` شكلية؛ واجهات Auth الحالية لا تقبلها. إن رفضت عملية بخطأ يحمل `name = AbortError` يُعاد رميه كما هو.
- `AuthState` لا يحتوي Profile أو Role ولا يعني تفويضًا كاملًا.

## خارج النطاق

- Profiles وTrigger وAuthorization RLS.
- واجهة الدخول والتسجيل.
- حراس العمليات.
- mastery_results.

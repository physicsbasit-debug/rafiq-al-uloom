# Phase 2-C3: Login / Logout / Session UI

## النطاق

تضيف هذه الدفعة أول واجهة مستخدم لمسار المصادقة، فوق خدمات C1 وC2-B المكتملة، دون تعديل قاعدة البيانات أو عقود Auth/Authorization السابقة.

## ما تنفذه

- `AuthSessionProvider` مركزي واحد ينسق `AuthState` و`AuthorizationState`.
- استعادة الجلسة دون وميض واجهة الزائر أو تجربة الطالب للحساب المسجل.
- تسجيل الدخول وإنشاء الحساب وتسجيل الخروج.
- شاشة تأكيد البريد.
- واجهات `pending` و`suspended` و`profile_error`.
- رسالة عامة موحدة لأخطاء `invalid_credentials` تساعد المستخدم الجديد دون كشف هل البريد موجود أو غير مؤكد.
- حفظ آلة `Step` التعليمية كما هي، وعدم إضافة أي حالة Auth إليها.
- حفظ موضع الطالب عند فتح المصادقة أو إلغائها أو نجاح دخول حساب نشط.
- دعم RTL، وخصائص `autocomplete`، و`aria-live`، ومنع الإرسال المكرر.

## الملفات

```text
src/features/auth/AuthSessionProvider.tsx
src/features/auth/useAuthSession.ts
src/features/auth/AuthEntryView.tsx
src/features/auth/SignInForm.tsx
src/features/auth/SignUpForm.tsx
src/features/auth/AccountStatusView.tsx
src/features/auth/AccountControls.tsx
src/App.tsx
tests/features/auth/AuthSessionProvider.test.tsx
tests/features/auth/SignInForm.test.tsx
tests/features/auth/SignUpForm.test.tsx
tests/features/auth/AccountStatusView.test.tsx
tests/features/auth/AppAuthFlow.test.tsx
README_PHASE_2_C3.md
APPLY_PHASE_2_C3.txt
```

## قرارات ملزمة

- لا استدعاء مباشر إلى Supabase من مكونات React.
- لا تعديل على `auth.service.ts` أو `authorization.service.ts`.
- لا React Router.
- لا دمج لحالات Auth في `Step`.
- `email_not_confirmed` يبقى مصنفًا أمنيًا ضمن `invalid_credentials` في C1؛ التحسين في رسالة العرض فقط.
- الزائر يحتفظ بتجربة الطالب المحلية.
- الحساب غير النشط لا يرى تجربة الطالب.
- لا اختلاف مرئي بين أدوار `student/teacher/reviewer` في C3.

## الاختبارات الجديدة

تضيف الحزمة 35 اختبارًا في خمسة ملفات، تغطي:

- booting واستعادة الجلسة والاشتراكات المركزية.
- تسجيل الدخول والتسجيل والتأكيد والخروج.
- منع تسريب السبب الداخلي في `invalid_credentials`.
- حالات الحساب المغلقة وإعادة المحاولة.
- منع وميض تجربة الطالب.
- حفظ واستعادة `Step` عند فتح المصادقة والإلغاء والدخول والحالات المعلقة.
- التحقق أن نوع `Step` لم يستوعب حالات Auth.

العدد المتوقع بعد التطبيق، قبل التشغيل الفعلي:

```text
34 test files
376 tests
32 Supabase integration tests
```

هذه أعداد متوقعة وليست نتيجة قبول حتى تُشغّل في Codespaces.

## خارج النطاق

- حراس العمليات حسب الدور.
- لوحة المعلم أو المراجع.
- استعادة أو تغيير كلمة المرور.
- تسجيل الدخول الاجتماعي.
- تعديل الملف الشخصي أو الدور أو الحالة.
- `mastery_results` وحفظ النتائج السحابي.
- React Router.

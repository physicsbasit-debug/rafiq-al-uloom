# Phase 2-C0/C1 Documentation Baseline

هذه الحزمة توثيقية فقط، ولا تحتوي كود Auth أو Migration أو واجهة مستخدم.

## الملفات

- `docs/PHASE_2_C0_AUTH_ARCHITECTURE.md`
- `docs/PHASE_2_C1_AUTH_CLIENT_SESSION.md`
- `docs/PHASES.md`
- `README_PHASE_2_C0_C1_DOCS.md`
- `APPLY_PHASE_2_C0_C1_DOCS.txt`

## الحالة بعد التطبيق

- Phase 2-C0: مكتملة توثيقيًا.
- Phase 2-C1: قادمة وجاهزة للتنفيذ بعد اعتماد الوثيقة.
- لا Profiles أو Trigger أو RLS جديدة.
- لا شاشة تسجيل دخول.
- لا حفظ `mastery_results`.

## نقاط المراجعة الحرجة

- وجود `SignUpResult` بالحالات الثلاث: `confirmation_required`, `authenticated`, `error`.
- منع تعديل `profiles.role` و`profiles.status` من العميل.
- الحظر الكامل للحساب `suspended`.
- ذرّية إنشاء `auth.users` و`public.profiles`.
- فصل AuthState عن AuthorizationState.
- Confirm Email مفعّل ورسالة التسجيل محايدة.

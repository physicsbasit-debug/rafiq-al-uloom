# Phase 2-C4-A: Central Authorization Policy + React Guards

## النطاق

تضيف هذه الدفعة محرك قرار مركزيًا للصلاحيات وحارس React موحدًا، دون تعديل قاعدة البيانات أو فتح أي عمليات كتابة جديدة.

## الملفات

```text
src/services/auth/authorization.operations.ts
src/services/auth/authorization.policy.ts
src/features/auth/RequireCapability.tsx
src/features/auth/useAuthorizationDecision.ts
src/App.tsx
tests/auth/authorization.policy.test.ts
tests/features/auth/RequireCapability.test.tsx
tests/features/auth/AppAuthorizationGuard.test.tsx
tests/architecture/no-inline-authorization-logic.test.ts
README_PHASE_2_C4_A.md
APPLY_PHASE_2_C4_A.txt
```

## ما تنفذه

- اتحاد مغلق للعمليات الخمس المعتمدة في C4-0.
- عقد `AuthorizationDecision` يمنع التناقض بين `allowed` و`reason`.
- محرك `authorizeOperation` نقي يطبق الترتيب الثماني:
  1. `AuthState.loading` → `profile_loading`
  2. `AuthState.error` → `session_error`
  3. `guest` → `guest`
  4. Profile غير جاهزة → `profile_loading`
  5. `profile_error` → `profile_error`
  6. `pending` → `account_pending`
  7. `suspended` → `account_suspended`
  8. `authorized` → مصفوفة الدور والعملية
- فشل مغلق للحالات أو العمليات غير المتوقعة وقت التشغيل.
- `access_student_experience` متاحة لكل الأدوار النشطة.
- مساحة المعلم متاحة للمعلم النشط فقط.
- مساحة المراجع متاحة للمراجع النشط فقط.
- `author_content` و`review_content` تبقيان غير متاحتين حتى Phase 3.
- Hook خفيف يقرأ الحالة الحالية ويستدعي المحرك فقط.
- `RequireCapability` يعرض المحتوى عند السماح وFallback واضحًا عند الرفض.
- استبدال فحص `authorized` القديم داخل `App.tsx` بمحرك القرار المركزي.
- إبقاء مسار Guest المحلي خارج الحارس.
- الحفاظ الحرفي على اتحاد `Step` التعليمي.

## ما لا تنفذه

- لا Migration أو SQL.
- لا تعديل على C1 أو C2 أو خدمات الجلسة والملف الشخصي.
- لا فتح `INSERT` أو `UPDATE` أو `DELETE` للمستخدم.
- لا لوحة معلم أو مراجع.
- لا تأليف أو اعتماد محتوى.
- لا `service_role` داخل `src/`.
- لا اختبارات PostgREST جديدة؛ هذه مؤجلة إلى C4-B.

## الاختبارات الجديدة

تضيف الحزمة 55 اختبارًا في أربعة ملفات:

```text
29  authorization.policy
10  RequireCapability
12  AppAuthorizationGuard
4   architecture guards
```

العدد المتوقع بعد التطبيق، قبل التشغيل الفعلي:

```text
38 test files
431 basic tests
32 Supabase integration tests
```

هذه أعداد متوقعة وليست نتيجة قبول حتى تُشغّل في Codespaces.

## نقاط تحقق حاسمة

- `session_error` مستقل عن `profile_loading` و`profile_error`.
- Guest يرفض دفاعيًا داخل المحرك، لكنه لا يمر عبره في `App.tsx`.
- لا يبقى `const authorized` أو `showStudentExperience` من C3.
- يوجد `RequireCapability` واحد لمسار المستخدم المصادق النشط.
- لا توجد شروط `role === ...` داخل مكونات Auth أو `App.tsx`.
- لا يستدعي الحارس Supabase أو ينشئ اشتراكات جديدة.
- اتحاد `Step` مطابق حرفيًا لنسخة C3.

## معايير القبول

```text
npm run build
npm run lint
npm run test
npx prettier --check .
npm run test:supabase
git status
```

المطلوب:

- نجاح الاختبارات الجديدة والقديمة دون انحدار.
- بقاء اختبارات تكامل Supabase السابقة 32/32.
- عدم تعديل SQL أو ملفات C1-C3 خارج `App.tsx`.
- عدم وجود منطق صلاحيات متناثر في Components.
- `nothing to commit, working tree clean` بعد التثبيت النهائي.

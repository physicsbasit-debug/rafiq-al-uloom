# Phase 2-C2 — Profiles + Roles + Authorization RLS

هذه حزمة توثيق فقط لتثبيت عقد `profiles` والأدوار والحالات وRLS قبل إنشاء أي Migration.

## الملفات

```text
docs/PHASE_2_C2_PROFILES_ROLES_RLS.md
docs/PHASES.md
README_PHASE_2_C2.md
APPLY_PHASE_2_C2.txt
```

## القرارات الأساسية

- الأدوار: `student / teacher / reviewer` فقط.
- الحالات: `pending / active / suspended` فقط.
- المستخدم الجديد: `student + pending`.
- `profiles` هو مصدر الدور والحالة الوحيد.
- `authenticated` يملك `SELECT` على صفه فقط.
- لا `INSERT` أو `UPDATE` أو `DELETE` للمستخدم.
- محاولات التحديث يجب أن تفشل بخطأ صلاحية `42501`.
- `service_role` تملك `SELECT + UPDATE` صراحة، ولا تستخدم في العميل.
- لا صلاحيات على مستوى العمود.
- لا وصول إلى المسودات في C2 لأي دور.
- الزائر يستخدم المزوّد المحلي، ولا يقرأ Supabase عبر `anon`.
- فشل Trigger يجب أن يلغي إنشاء المستخدم وProfile معًا.

## خارج النطاق

- لا SQL تنفيذي في هذه الحزمة.
- لا Migration.
- لا UI.
- لا تعديل Profile من العميل.
- لا لوحة إدارة مستخدمين.
- لا `mastery_results`.
- لا عمليات معلم أو مراجع على المحتوى.

## الخطوة التالية

تُعرض الملفات الفعلية على كلاود للمراجعة. بعد اعتماد الوثيقة فقط تُجهز حزمة تنفيذ مستقلة تحتوي Migration والاختبارات، وتُراجع SQL الفعلية قبل تطبيقها.

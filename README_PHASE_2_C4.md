# Phase 2-C4-0: Operation Authorization Contract

## الغرض

هذه الحزمة توثق عقد العمليات والصلاحيات قبل تنفيذ محرك القرار أو حراس React.

لا تحتوي:

- كود TypeScript إنتاجي جديد.
- Migration.
- تعديل RLS.
- واجهة معلم أو مراجع.
- أي صلاحية كتابة جديدة.

## الملفات

```text
docs/PHASE_2_C4_OPERATION_AUTHORIZATION.md
docs/PHASES.md
README_PHASE_2_C4.md
APPLY_PHASE_2_C4.txt
```

## القرارات الأساسية

- الزائر يستمر في تجربة الطالب المحلية خارج `authorizeOperation` و`RequireCapability`.
- الاستدعاء الدفاعي للمحرك بحالة Guest يعيد:

```text
allowed: false
reason: guest
```

- C4-A تستبدل فحص `authorized` القديم في `App.tsx` ولا تضيف طبقة مكررة فوقه.
- `authorization.policy.ts` هو المصدر المركزي لقرار العمليات.
- `author_content` و`review_content` تبقيان غير متاحتين حتى Phase 3.
- لا Migration جديدة في C4 ما لم يتغير العقد بوثيقة مكتوبة أولًا.
- RLS وGRANT هما خط الدفاع الحقيقي، وحارس React طبقة تجربة مستخدم فقط.

## تقسيم C4

```text
C4-0  توثيق عقد العمليات
C4-A  محرك القرار وحراس React
C4-B  اختبارات تجاوز الواجهة عبر PostgREST
```

## نقطة الأساس

```text
Phase 2-C3 closed
commit 0c2cf40
376 basic tests passed
32 Supabase integration tests passed
```

## الخطوة التالية بعد الاعتماد

بعد مراجعة الوثيقة وتثبيتها في Git، تبدأ حزمة C4-A البرمجية المحدودة فقط.

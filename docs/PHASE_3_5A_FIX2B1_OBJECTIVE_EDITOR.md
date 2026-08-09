# Phase 3-5A Fix 2B-1 — Pure Structural State + Objective Editor

## الحالة

REVIEW CANDIDATE — لا تُرفع إلى المستودع قبل اعتماد المراجعة.

## Baseline

`c7b6405` — Phase 3-5A Fix 2A closed.

## الهدف

هذه الدفعة الأولى من Fix 2B تضيف فقط:

- pure structural helpers للأهداف وروابط الأسئلة الحالية؛
- Objective editor محلي داخل TeacherLessonEditor؛
- Form Buffer منفصل عن LessonRevisionPayload حتى يصبح الهدف صالحًا؛
- مفتاح Objective داخلي ثابت وغير قابل للتحرير؛
- منع حذف Objective مرتبطة بأي Question موجودة؛
- الحفاظ على manual save الحالي، بلا RPC عند إضافة/تعديل/حذف الهدف محليًا.

## توضيح المراجعة المعتمد

ثبات `objective.key` عبر التعديل وSuccessor هو **التزام واجهة تطبيقية**، وليس invariant يفرضه SQL تاريخيًا. SQL يتحقق من الحالة الحالية فقط: المفتاح نص غير فارغ وفريد داخل الحمولة. لذلك هذه الدفعة لا تدعي أن الخادم يفرض الثبات التاريخي.

المفتاح الجديد يُخصّص مرة واحدة من namespace داخلية (`teacher-objective-N`) بمسح المفاتيح الحالية. لا يشتق من نص الهدف ولا من موضعه في المصفوفة، ولا يعاد حسابه عند تعديل النص أو إعادة ترتيب العناصر.

## Invariants

1. `objective.key` لا يظهر كحقل إدخال للمستخدم.
2. تعديل نص الهدف يحافظ على المفتاح نفسه.
3. الهدف الجديد لا يدخل `payload.objectives` قبل اجتياز `validateObjectiveDraft`.
4. حذف هدف مرتبط بسؤال ممنوع. لا Cascade ولا reassignment صامت.
5. `getAvailableObjectiveOptions` مشتقة دائمًا من `payload.objectives` الحالية، تمهيدًا لـ2B-2.
6. `hasDanglingObjectiveReferences` طبقة دفاعية. إذا أصبحت true في حالة committed، فهذا خرق invariant يجب تشخيص سببه، لا تجاهله.
7. لا SQL/RPC/RLS/Auth/Service changes.
8. `useTeacherLessonEditor` لا يتغير؛ `updatePayload` الحالي هو نقطة commit المحلية ويستمر في ضبط `dirty=true`.

## نطاق الملفات الإنتاجية

- `src/features/teacher/workspace/teacher-lesson-structure.ts` جديد.
- `src/features/teacher/workspace/TeacherObjectivesEditor.tsx` جديد.
- `src/features/teacher/workspace/TeacherLessonEditor.tsx` تعديل دمج فقط.

لا تعديل على:

- `useTeacherLessonEditor.ts`
- services/repositories
- Supabase migrations
- authorization
- App composition

## الاختبارات

- pure helpers: validation، stable key allocation، reference detection، dangling reference detection، options، immutable edit/delete، committed objective-state issues.
- Objective editor: Form Buffer، add/edit/delete، linked-delete guard، readonly، in-flight disable.
- TeacherLessonEditor composition: إضافة Objective لا تستدعي الخدمة، ثم تدخل نفس `LessonRevisionPayload` عند ضغط حفظ المسودة.

## خارج النطاق

Question editor وSubmission Readiness UI وReal Supabase UI gate تبقى لـ2B-2 و2B-3 حسب العقد المعتمد.

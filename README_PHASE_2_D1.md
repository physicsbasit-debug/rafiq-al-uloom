# Phase 2-D1 — Database Schema, RPC & RLS

## الحالة

```text
IMPLEMENTATION CANDIDATE
جاهزة للرفع والاختبار الفعلي في Codespaces
لا تُغلق D1 قبل نجاح db reset واختبارات Supabase الحقيقية
```

اعتمد كلاود تصميم D1 بعد مراجعة `quiz-engine.ts` وMigration والاختبارات مباشرة. أضيف قبل النسخة النهائية اختبار تزامن حقيقي لطلبين يحملان `submission_id` نفسه عبر `Promise.all`.

## نقطة الأساس

```text
Baseline commit: 2fbefca
Phase 2-D0: CLOSED
Auth freeze tag: v0.4-auth-security-complete
Verified baseline: 447 basic + 61 Supabase integration = 508 tests
```

## الملفات

```text
supabase/migrations/20260806070000_add_mastery_result_persistence.sql
tests/integration/supabase-mastery-results.integration.ts
docs/PHASE_2_D1_DATABASE_DESIGN.md
README_PHASE_2_D1.md
APPLY_PHASE_2_D1.txt
```

لا تتضمن الحزمة `quiz-engine.ts` لأنها لم تتغير؛ استُخدمت في المراجعة فقط لإثبات منطق `isCorrectAnswer`.

## القرار المركزي

العميل لا يرسل درجة أو هوية أو دورًا.

```text
auth.uid() يحدد المستخدم
public.profiles تحدد الأهلية
public.questions تحدد الأسئلة والإجابات الصحيحة
RPC تحسب النتيجة
```

## منطق الإجابة المؤكد

```text
Number.isInteger(selectedIndex)
selectedIndex >= 0
selectedIndex < choices.length
selectedIndex === correctAnswerIndex
```

لا يوجد منطق نصي أو متعدد أو جزئي مخفي.

## الاختبار الإضافي بعد مراجعة كلاود

أضيف اختبار فعلي يطلق طلبين متزامنين:

```ts
Promise.all([submit(...sameSubmissionId), submit(...sameSubmissionId)]);
```

المطلوب:

```text
طلب واحد saved
طلب واحد already_saved
نفس attemptId
لا استثناء غير معالج
لا محاولة ثانية
```

هذا الاختبار يمارس مسار `unique_violation` الدفاعي داخل RPC، لا مسار Retry التسلسلي فقط.

## معايير القبول الحي

لا تُعد D1 مغلقة إلا بعد:

```text
supabase db reset                          PASS
447 اختبارًا أساسيًا                       PASS
61 اختبار Supabase أساسيًا                 PASS
اختبارات mastery-results الجديدة          PASS
اختبار التزامن الحقيقي                    PASS
Build / Lint / Prettier                    PASS
git diff --check                           PASS
working tree clean                         PASS
```

لم يتوفر Docker/Supabase في بيئة تجهيز الحزمة، لذلك يظل التنفيذ الحي في Codespaces هو دليل القبول النهائي.

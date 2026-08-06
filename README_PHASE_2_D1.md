# Phase 2-D1 — Database Schema, RPC & RLS Review

## الحالة

```text
REVIEW ONLY
لا ترفع إلى GitHub بعد
```

تغلق الحزمة أولًا فجوة `quiz-engine.ts`، ثم تقترح مخطط الحفظ وRPC وRLS واختبارات Supabase الحقيقية.

## نقطة الأساس

```text
Commit: 2fbefca
Phase 2-D0: CLOSED
Baseline: 508 tests
```

## الملفات

```text
src/features/quiz/quiz-engine.ts
supabase/migrations/20260806070000_add_mastery_result_persistence.sql
tests/integration/supabase-mastery-results.integration.ts
docs/PHASE_2_D1_DATABASE_DESIGN.md
README_PHASE_2_D1.md
APPLY_PHASE_2_D1_REVIEW.txt
```

`quiz-engine.ts` نسخة تحقق غير معدلة من المصدر الحقيقي. وجودها داخل حزمة المراجعة لا يعني تعديلها في Git.

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
integer
>= 0
< choices.length
=== correctAnswerIndex
```

لا يوجد منطق نصي أو متعدد أو جزئي مخفي في `quiz-engine.ts`.

## الاختبارات المقترحة

الحزمة تضيف 17 سيناريو تكامل، تشمل الأدوار الثلاثة، RLS، منع DML، Idempotency، تعارض المفتاح، البصمة القديمة، الذرية، وحذف المستخدم.

## ما تم فحصه في بيئة التجهيز

```text
TypeScript parse                          PASS
quiz-engine source match                  PASS
SQL security-contract static checks       PASS
ZIP path/integrity checks                 PASS
UTF-8 / CRLF / trailing whitespace        PASS
```

لم يتوفر Docker/Supabase محلي لتشغيل Migration، ولذلك لا تُعد الحزمة جاهزة للرفع قبل مراجعة كلاود.

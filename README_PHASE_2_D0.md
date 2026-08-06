# Phase 2-D0 — Current-State Audit & Persistence Contract

## النوع

حزمة D0 وثائقية نهائية معتمدة قبل التطبيق.

## نقطة الأساس

```text
main: 990471d
Auth freeze tag: v0.4-auth-security-complete
Verified baseline: 508 tests
```

## الملفات

```text
docs/MASTERY_RESULT_CURRENT_STATE_AUDIT.md
docs/MASTERY_RESULT_PERSISTENCE_CONTRACT.md
README_PHASE_2_D0.md
APPLY_PHASE_2_D0.txt
```

## أهم نتائج التدقيق

- `MasteryTestView` يستخدم كل أسئلة الإتقان المعادة، ولا يختار عينة.
- يجب إكمال جميع الإجابات قبل الإنهاء.
- الإجابة الحالية هي selected choice index.
- التسجيل متساوي الوزن: correct / total × 100.
- `score` الحالي نسبة، لا نقاطًا خامًا.
- التصنيف محلي بحدود 80/60.
- مفاتيح lesson/question من نوع text، والمستخدم uuid.
- Local provider هو الافتراضي، وSeed المحلي draft؛ لذلك الحفظ السحابي الأولي مقصور على Supabase provider والمحتوى approved.

## الحسمان المعتمدان من مراجعة كلاود

### رفض الحفظ مقابل تسوية العرض

العقد يفصل بين:

```text
rejected قبل الحفظ
```

وبين:

```text
saved ثم display_reconciled_to_server
```

ولا يستخدم `content_mismatch` لكليهما.

### التكافؤ الدائم

يصبح اختبار TypeScript/RPC أمرًا مستقلًا، ويُستدعى صراحة داخل:

```text
verify:mastery-results-closure
```

بوصفه بوابة دائمة.

## بوابة D1 المتبقية

اعتمد كلاود D0 بعد مطابقة المصدر مباشرة. قبل كتابة SQL/RPC في D1 يجب تضمين وفحص:

```text
src/features/quiz/quiz-engine.ts
```

والتحقق من `isCorrectAnswer()` و`getQuestionFeedback()` قبل ترجمة منطق صحة الإجابة إلى SQL.

## لا يتضمن

- كود إنتاج.
- Migration.
- RPC.
- RLS.
- تعديل اختبارات.
- تعديل `docs/PHASES.md`.

هذه النسخة معتمدة وجاهزة للرفع إلى `main` بوصفها إغلاق Phase 2-D0.

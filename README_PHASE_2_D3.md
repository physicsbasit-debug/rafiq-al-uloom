# Phase 2-D3 — Mastery Test Integration

## الحالة

حزمة تطبيق نهائية معتمدة بعد مراجعة الكود والـDiff المباشر مقابل baseline.

## Baseline

```text
c098927
```

## الهدف

ربط `MasteryTestView` بخدمة حفظ نتائج الإتقان المكتملة في D2، مع بقاء النتيجة المحلية فورية، وحفظ سحابي غير حاجب، وRetry بنفس `submissionId` والحمولة المجمدة نفسها.

## الملفات

```text
src/features/mastery/MasteryTestView.tsx
src/features/mastery/MasteryResultSaveStatus.tsx
src/features/mastery/mastery-result-save.types.ts
src/features/mastery/useMasteryResultPersistence.ts

tests/features/MasteryTestView.persistence.test.tsx
tests/features/useMasteryResultPersistence.test.tsx

docs/PHASE_2_D3_MASTERY_TEST_INTEGRATION_DESIGN.md
README_PHASE_2_D3.md
APPLY_PHASE_2_D3.txt
```

## لا تحتوي

```text
SQL
Migration
RPC changes
D2 service/repository changes
Auth policy changes
package.json
dependencies
Git tag
```

## العقود المحفوظة

- النتيجة المحلية تظهر قبل اكتمال الشبكة.
- الحالات الخمس هي: `idle` و`saving` و`saved` و`failed` و`not_applicable`.
- الزائر والمزوّد المحلي لا يظهر لهما خطأ حفظ.
- التفويض يمر عبر `authorizeOperation('submit_own_mastery_result')` قبل الخدمة.
- Retry يستخدم نفس `submissionId` و`startedAt` والأسئلة والإجابات المجمدة.
- لا يوجد استدعاء Supabase RPC مباشر داخل React.
- التسوية الرسمية تغيّر الدرجة والتصنيف والتوصية فقط.
- منطق الاختبار المحلي والمراجعة الحالي لم يتغير دلاليًا.

## نتائج المراجعة

- تمت مقارنة `MasteryTestView.tsx` حرفيًا مع النسخة الأصلية قبل D3.
- جميع التغييرات إضافية بحتة حول مسار الحفظ.
- `key={lessonId}` إضافة مقصودة لإعادة إنشاء جلسة الحفظ عند تغيير الدرس.
- ملفات المصدر والاختبارات في هذه الحزمة مطابقة حرفيًا للنسخة التي اعتمدتها المراجعة.

## بوابات القبول

```text
npm run build
npm test                    → 508/508 expected
npm run test:supabase       → 77/77 expected
npm run lint
npx prettier --check .
git diff --check
git status
```

لا يُنشأ وسم في D3. الوسم `v0.5` ينتظر اكتمال D4 وD5.

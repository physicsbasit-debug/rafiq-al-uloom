# Phase 2-D3 Fix 1 — Derived Official Result

## الحالة

حزمة تطبيق نهائية لإصلاح فشل ESLint التالي بعد تطبيق Phase 2-D3:

```text
react-hooks/set-state-in-effect
MasteryTestView.tsx:97
```

## الأساس

```text
baseline commit: c0ae0b8
Phase 2-D3 build: PASS
Phase 2-D3 tests: 508/508 PASS
Supabase integration: 77/77 PASS
Lint: FAIL بسبب setResult داخل useEffect فقط
Prettier: PASS
Git: clean
```

## السبب الجذري

الدرجة الرسمية المعروضة ليست حالة مستقلة تحتاج مزامنة بواسطة `useEffect`. هي قيمة مشتقة من:

```text
النتيجة المحلية الحالية
+
حالة الحفظ الرسمية saved
+
percentage الرسمية
```

النسخة السابقة كانت تستدعي `setResult` تزامنيًا داخل Effect بعد وصول النتيجة الرسمية. هذا يسبب render إضافيًا ويخالف قاعدة React الحالية `react-hooks/set-state-in-effect`.

## العلاج

- حذف `useEffect` الخاص بالتسوية فقط.
- إبقاء `result` بوصفها النتيجة المحلية الفورية الأصلية.
- اشتقاق `displayedResult` أثناء render عبر دالة نقية `withOfficialScore`.
- عند عدم وجود نتيجة رسمية محفوظة، تكون `displayedResult === result`.
- عند اختلاف النسبة الرسمية، يعاد اشتقاق `classification` و`recommendation` للعرض فقط.
- لا تغيير في الإجابات أو `ReviewItem` أو الحفظ أو Retry أو Idempotency.

## نطاق التطبيق

الملف البرمجي المعدل الوحيد:

```text
src/features/mastery/MasteryTestView.tsx
```

ملفا الحزمة الآخران للتوثيق والتطبيق فقط:

```text
README_PHASE_2_D3_FIX1.md
APPLY_PHASE_2_D3_FIX1.txt
```

لا SQL، لا RPC، لا Auth، لا D2 service، لا `package.json`، ولا dependency جديدة.

## معايير القبول

```text
npm run lint              PASS
npm run build             PASS
npm test                  508/508
npm run test:supabase     77/77
npx prettier --check .    PASS
git diff --check          PASS
```

لا يُنشأ وسم جديد بعد هذا الإصلاح. إغلاق Phase 2-D3 يسبق الانتقال إلى Phase 2-D4، بينما وسم `v0.5` ينتظر إكمال D4 وD5.

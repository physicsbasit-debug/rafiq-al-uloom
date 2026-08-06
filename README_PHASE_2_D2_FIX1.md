# Phase 2-D2 Fix 1 — ArrayBuffer-backed digest input

## الحالة

إصلاح صغير ومحصور لإغلاق فشل TypeScript في `SubtleCrypto.digest` داخل طبقة حفظ نتائج الإتقان.

## نقطة الأساس

```text
baseline commit: b068b4e
Phase 2-D0: CLOSED
Phase 2-D1: CLOSED
Phase 2-D2: functional tests passed, build blocked by one TypeScript error
```

## المشكلة

كان الملف:

```text
src/services/mastery-results/mastery-results.fingerprint.ts
```

يمرر قيمة من النوع:

```text
Uint8Array<ArrayBufferLike>
```

مباشرة إلى:

```ts
SubtleCrypto.digest(algorithm, data: BufferSource)
```

وفي إعداد TypeScript الحقيقي للمشروع ظهر الخطأ:

```text
Uint8Array<ArrayBufferLike> is not assignable to BufferSource
```

السبب أن `ArrayBufferLike` قد يمثل `SharedArrayBuffer`، بينما تعريف `BufferSource` المستخدم في المشروع يطلب عرضًا مدعومًا بـ`ArrayBuffer`.

## العلاج

قبل استدعاء `digest` تُنشأ نسخة بايتات فعلية جديدة:

```ts
const digestInput = new Uint8Array(bytes);
const digest = await subtle.digest('SHA-256', digestInput);
```

هذا ليس Cast ولا إسكاتًا للمصرّف. تُنسخ قيم البايتات إلى `ArrayBuffer` جديد مضمون، من دون تغيير مادة التسجيل أو UTF-8 أو SHA-256.

## النطاق

الملف البرمجي الوحيد المعدل:

```text
src/services/mastery-results/mastery-results.fingerprint.ts
```

ملفا التوثيق والتطبيق:

```text
README_PHASE_2_D2_FIX1.md
APPLY_PHASE_2_D2_FIX1.txt
```

## ما لم يتغير

- لا SQL أو Migration.
- لا RPC أو RLS.
- لا React أو `MasteryTestView`.
- لا Auth أو Authorization.
- لا أنواع نتيجة أو أسباب رفض.
- لا dependency أو `package.json`.
- لا تغيير في قيمة بصمة SHA-256 الثابتة.

## فحوص التجهيز

```text
TypeScript 5.8.3 strict type-check             PASS
Runtime SHA-256 fixture                        PASS
Expected fingerprint unchanged                PASS
Exact source diff: one replacement only       PASS
UTF-8 / LF / trailing whitespace              PASS
ZIP scope and integrity                       PASS
```

القيمة الثابتة التي بقيت بلا تغيير:

```text
f9409f2f9b744296082963eb8fd3a08852d7bb8fb59ae769ecd0bb56bca5cccf
```

## معايير الإغلاق في Codespaces

```text
npm run build                  PASS
npm test                       490/490
npm run test:supabase          77/77
npm run lint                   PASS
npx prettier --check .         PASS
git diff --check               PASS
git status                     clean and synced
```

بعد نجاح هذه البوابة تُغلق `Phase 2-D2: Client Persistence Service` رسميًا، من دون إنشاء وسم جديد. الوسم `v0.5` ينتظر اكتمال D3-D5.

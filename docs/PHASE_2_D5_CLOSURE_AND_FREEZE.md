# Phase 2-D5 — Closure & Freeze

## الحالة

حزمة التطبيق المعتمدة لـ`Phase 2-D5-C1`. لا تعلن هذه الحزمة إغلاق Phase 2-D، ولا تنشئ وسمًا؛ الإغلاق والوسم مؤجلان إلى D5-C2 بعد نجاح أمر الإغلاق فعليًا.

الخط الأساس:

```text
1f01c66
Phase 2-D0  CLOSED
Phase 2-D1  CLOSED
Phase 2-D2  CLOSED
Phase 2-D3  CLOSED
Phase 2-D4  CLOSED
```

## 1. قرار التقسيم

تُقسم D5 إلى دفعتين:

```text
2-D5-C1  أدوات الإغلاق + فحص الحدود + التوثيق التشغيلي
2-D5-C2  تحديث الحالة النهائية + إعادة التحقق + إنشاء الوسم
```

السبب: لا يجوز تحديث `PHASES.md` إلى `CLOSED` قبل نجاح أمر الإغلاق فعليًا على الالتزام النهائي.

## 2. مخرجات D5-C1

```text
scripts/check-mastery-results-client-boundaries.mjs
scripts/verify-mastery-results-closure.sh
docs/MASTERY_RESULTS_OPERATIONS.md
docs/PHASE_2_D5_CLOSURE_AND_FREEZE.md
package.json
README_PHASE_2_D5_C1.md
APPLY_PHASE_2_D5_C1.txt
```

لا تغيّر C1:

```text
src/
supabase/migrations/
RPC
RLS
MasteryTestView
خدمات mastery-results
اختبارات D0-D4
docs/PHASES.md
docs/ARCHITECTURE.md
docs/PROJECT_CHARTER.md
```

## 3. أمر الإغلاق الموحد

يضاف:

```text
npm run verify:mastery-results-closure
```

ويرتبط بـ:

```text
bash scripts/verify-mastery-results-closure.sh
```

الأمر لا يبدأ Supabase إذا كانت متوقفة من البداية، ولا ينشئ Tag.

## 4. تسلسل التحقق

```text
Build
→ Lint
→ 508 Basic tests
→ Prettier
→ Auth client boundary scan
→ Mastery-results client boundary scan
→ Supabase status
→ Supabase db reset
→ Supabase readiness / controlled recovery
→ 89 Supabase integration tests
→ Composition 2/2 صراحةً
→ Parity 10/10 صراحةً
→ git diff --check
→ clean working tree
→ HEAD = origin/main
```

Composition وParity جزء من الـ89 اختبارًا، لكنهما يعادان صراحةً لأنهما بوابتان تعاقديتان لا يجوز أن تختفيا داخل أمر عام.

## 5. فحص الحدود

الفاحص الجديد يرفض:

```text
submit_mastery_attempt خارج Repository المعتمدة
.rpc() مباشر داخل React TSX
كتابة مباشرة إلى mastery_attempts
كتابة مباشرة إلى mastery_attempt_answers
غياب استدعاء RPC المعتمد من Repository
```

المالك الوحيد لاسم RPC:

```text
src/services/mastery-results/supabase-mastery-results.repository.ts
```

فحص الأسرار العام يبقى مسؤولية `check-auth-client-boundaries.mjs`، ويستدعيه أمر D5 أيضًا.

## 6. دليل الاختبارات المتوقع

```text
Basic test files:          46
Basic tests:              508
Supabase integration files: 8
Supabase integration tests: 89
Composition gate:           2
Parity gate:               10
Unique tests:             597
```

الـ12 اختبارًا في البوابتين جزء من الـ89 وليست اختبارات فريدة إضافية.

## 7. بوابة D5-C1

بعد اعتماد الحزمة ورفعها إلى GitHub:

```bash
git pull origin main
npx supabase start
npm run verify:mastery-results-closure
```

يجب أن ينجح الأمر على التزام C1 نظيف ومتزامن.

نجاح C1 يثبت أدوات الإغلاق، لكنه لا يغلق Phase 2-D نهائيًا لأن تحديثات C2 لم تُطبّق بعد.

## 8. مخرجات D5-C2 اللاحقة

بعد نجاح C1، تُجهز حزمة C2 صغيرة لتحديث:

```text
docs/PHASES.md
docs/ARCHITECTURE.md
docs/PROJECT_CHARTER.md
docs/PHASE_2_D4_COMPOSITION_AND_PARITY.md
docs/PHASE_2_D5_CLOSURE_AND_FREEZE.md
README_PHASE_2_D5.md
APPLY_PHASE_2_D5.txt
```

وتثبت:

```text
Phase 2-D: CLOSED
D0-D5: CLOSED
508 basic
89 Supabase integration
597 unique tests
```

ثم يُعاد تشغيل:

```bash
npm run verify:mastery-results-closure
```

على التزام C2 النهائي النظيف والمتزامن.

## 9. إنشاء الوسم

بعد نجاح الأمر على التزام C2 النهائي فقط:

```bash
FINAL_COMMIT="$(git rev-parse HEAD)"

git tag -a v0.5-mastery-results-cloud-complete \
  -m "Phase 2-D mastery results cloud persistence complete"

git push origin v0.5-mastery-results-cloud-complete
```

التحقق المحلي:

```bash
git rev-list -n 1 v0.5-mastery-results-cloud-complete
```

يجب أن يساوي `$FINAL_COMMIT`.

التحقق البعيد للوسم المعلّم:

```bash
git ls-remote --tags origin \
  refs/tags/v0.5-mastery-results-cloud-complete \
  refs/tags/v0.5-mastery-results-cloud-complete^{}
```

السطر المنتهي بـ`^{}` يجب أن يشير إلى `$FINAL_COMMIT`.

## 10. قاعدة عدم الأتمتة

أمر الإغلاق لا:

- ينشئ Tag.
- يدفع Tag.
- يعدّل وثائق الحالة.
- يبدأ Supabase المتوقفة من البداية.
- يتجاوز فشل Composition أو Parity.

## 11. التحذيرات المسجلة

غير حاجبين:

```text
Vite chunk > 500 kB
Multiple GoTrueClient instances في Composition/jsdom
```

يمكن معالجة تحذير GoTrue مستقبلًا عبر `storageKey` فريد لكل عميل اختبار معزول، دون اعتباره شرطًا لإغلاق D5.

## 12. معايير قبول C1

- [ ] `package.json` تضيف سكربت إغلاق واحدًا فقط.
- [ ] `bash -n scripts/verify-mastery-results-closure.sh` ناجح.
- [ ] `node --check scripts/check-mastery-results-client-boundaries.mjs` ناجح.
- [ ] الفاحص يرفض RPC خارج Repository.
- [ ] الفاحص يرفض RPC داخل TSX.
- [ ] الفاحص يرفض الكتابة المباشرة إلى جدولي النتائج.
- [ ] أمر الإغلاق يستدعي Composition وParity صراحةً.
- [ ] الأمر لا ينشئ Tag.
- [ ] `docs/PHASES.md` لا تعلن CLOSED داخل C1.
- [ ] نجاح الأمر فعليًا على Codespaces.

## 13. معايير قبول C2 النهائية

- [ ] وثائق الحالة تطابق الواقع.
- [ ] أمر الإغلاق ينجح على التزام C2 النهائي.
- [ ] شجرة Git نظيفة.
- [ ] `HEAD = origin/main`.
- [ ] الوسم المحلي يشير إلى التزام C2.
- [ ] الوسم البعيد المعلّم يشير إلى الالتزام نفسه.
- [ ] لا إعلان إغلاق قبل تحقق جميع الشروط.

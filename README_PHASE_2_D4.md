# Phase 2-D4 — Real Supabase Composition & Scoring Parity

## الحالة

حزمة تطبيق نهائية قابلة للرفع إلى GitHub والتشغيل في Codespaces.

الخط الأساس:

```text
e66983a
```

## ما تضيفه

- اختبارا تركيب حقيقي عبر Auth وAuthorization وReact Hook وخدمات الإنتاج وRPC وPostgreSQL.
- ثمانية اختبارات لكل توزيعات الصحة لثلاثة أسئلة.
- اختبار ترتيب وبصمة بمعرفات عربية وغير ASCII.
- اختبار `already_saved` داخل بوابة التكافؤ.
- Fixture مستقلة لا تلمس Seed المشتركة.
- سكربتان لتشغيل Composition وParity كلٌ على حدة.

## الأعداد المتوقعة

```text
D4 tests:                    12
Basic tests after D4:        508
Supabase tests after D4:      89
Supabase integration files:    8
```

## الملفات

```text
tests/integration/helpers/mastery-results-fixtures.ts
tests/integration/supabase-mastery-composition.integration.tsx
tests/integration/supabase-mastery-scoring-parity.integration.ts
vitest.supabase.config.ts
package.json
docs/PHASE_2_D4_COMPOSITION_AND_PARITY.md
README_PHASE_2_D4.md
APPLY_PHASE_2_D4.txt
```

## حدود النطاق

لا تغييرات على:

```text
src/
supabase/migrations/
RPC
RLS
Auth policy
MasteryTestView
خدمات D2
```

## أوامر القبول بعد الحزمة النهائية

```bash
npm run build
npm test
npm run test:mastery-results-composition
npm run test:mastery-results-parity
npm run test:supabase
npm run lint
npx prettier --check .
git diff --check
```

## النتيجة المطلوبة

```text
Build                    PASS
Basic tests              508/508
Composition tests        2/2
Parity tests             10/10
Supabase tests           89/89
Lint                     PASS
Prettier                 PASS
Git                      clean
```

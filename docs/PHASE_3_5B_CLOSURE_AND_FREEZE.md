# Phase 3-5B — Closure & Freeze

## الحالة

**FREEZE CANDIDATE CONTRACT — يُعد الالتزام `CLOSED & FROZEN` فقط إذا نجح `verify:phase-3-closure` وMobile Visual Acceptance وكان الوسم `v0.6-teacher-dashboard-complete` موجودًا على الالتزام نفسه.**

مرشح التجميد مبني على الالتزام:

```text
bf413caccd4019847fa4bd311176771714d93870
```

هذه الدفعة لا تضيف ميزة جديدة. وظيفتها إغلاق Phase 3 بالأدلة، إزالة ملف CSS ميت ثبت عدم اعتماده، وتثبيت بوابة إغلاق موحدة وعقد قبول بصري للهاتف قبل الوسم النهائي.

## نطاق الدفعة

تغييرات المستودع المقصودة فقط:

```text
DELETE  src/App.css
ADD     scripts/verify-phase-3-closure.sh
ADD     docs/PHASE_3_5B_CLOSURE_AND_FREEZE.md
ADD     docs/PHASE_3_MOBILE_VISUAL_ACCEPTANCE.md
UPDATE  package.json
UPDATE  docs/PHASES.md
UPDATE  docs/ARCHITECTURE.md
```

لا تتغير في هذه الدفعة:

```text
src/App.tsx
Teacher/Reviewer production components
Authoring services/repositories
Auth/Authorization
SQL migrations
RPC
RLS
content schema
Mastery Results contracts
```

## قرار App.css

نجح التدقيق التنفيذي الثلاثي على baseline نفسه:

```text
PASS: no App.css reference outside src/App.css
PASS: no live references to App.css top-level selectors
npm run build -> PASS after temporary deletion
PASS: App.css restored byte-for-byte
FINAL STATUS -> clean
PASS: APP.CSS THREE-PART AUDIT COMPLETE
```

إذن `src/App.css` ملف ميت من بقايا قالب Vite، وحذفه تنظيف آمن لا تغييرًا سلوكيًا.

تحذير Vite الخاص بحجم chunk الأكبر من 500 kB تحذير غير حاجب. لا تُفتح أعمال code splitting داخل Freeze ما لم يتحول التحذير إلى مشكلة أداء مثبتة في مرحلة مستقلة.

## أمر الإغلاق الموحد

بعد تثبيت تغييرات هذه الدفعة في Git ودفعها إلى `origin/main` وتشغيل Supabase المحلية:

```bash
npm run verify:phase-3-closure
```

الأمر ينفذ، بترتيب صريح:

```text
App.css removal invariant
Prettier
Lint
Build
Basic tests
Auth client boundary scan
Mastery-results client boundary scan
Supabase status
Supabase db reset
Supabase readiness / controlled recovery
Full Supabase integration suite
Phase 3 real Teacher/Reviewer composition gate
git diff --check
clean working tree
git fetch origin main --quiet
HEAD = freshly fetched origin/main
```

لا تُثبت هذه الوثيقة عددًا نهائيًا للاختبارات مسبقًا. خرج المستودع المنفذ هو مصدر الحقيقة.

## بوابة التركيب الحقيقي

تُعاد صراحةً بعد المجموعة التكاملية الكاملة:

```text
tests/integration/supabase-teacher-reviewer-workspace-composition.integration.tsx
```

الهدف هو منع نجاح الإغلاق بينما يختفي الدليل الذي يربط Auth/Profile وTeacherWorkspace وReviewerWorkspace وService/Repository وRPC/RLS وPostgreSQL في مسار حقيقي واحد.

## Mobile Visual Acceptance

النجاح الآلي لا يكفي لإعلان Freeze بصري لواجهة بشرية. يجب تنفيذ العقد:

```text
docs/PHASE_3_MOBILE_VISUAL_ACCEPTANCE.md
```

ويجب أن تكون النتيجة النهائية:

```text
OVERALL: PASS
COMMIT: <نفس الالتزام الذي اجتاز verify:phase-3-closure>
```

أي `FAIL` يمنع الوسم ويعاد إصلاحه واختباره قبل التجميد.

## شروط إنشاء الوسم

لا يُنشأ الوسم إلا بعد اجتماع الشروط التالية على الالتزام النهائي نفسه:

```text
npm run verify:phase-3-closure -> PASS
Mobile Visual Acceptance -> PASS
git status --short -> empty
HEAD = freshly fetched origin/main
```

بعدها فقط:

```bash
FINAL_COMMIT="$(git rev-parse HEAD)"

git tag -a v0.6-teacher-dashboard-complete \
  -m "Phase 3 teacher dashboard complete"

git push origin v0.6-teacher-dashboard-complete
```

التحقق المحلي:

```bash
git rev-list -n 1 v0.6-teacher-dashboard-complete
```

يجب أن يساوي `$FINAL_COMMIT`.

التحقق البعيد للوسم المعلّم:

```bash
git ls-remote --tags origin \
  refs/tags/v0.6-teacher-dashboard-complete \
  refs/tags/v0.6-teacher-dashboard-complete^{}
```

السطر المنتهي بـ`^{}` يجب أن يشير إلى `$FINAL_COMMIT`.

## قاعدة عدم الأتمتة

`verify:phase-3-closure` لا:

- ينشئ Tag.
- يدفع Tag.
- يغيّر ملفات المشروع.
- يبدأ Supabase إذا كانت متوقفة من البداية.
- يتجاوز فشل الاختبارات أو بوابات الحدود.
- يدّعي نجاح القبول البصري البشري.

## معنى التجميد

بعد تحقق الشروط والوسم فقط تصبح Phase 3:

```text
CLOSED & FROZEN
v0.6-teacher-dashboard-complete
```

أي تغيير لاحق في Authoring/Reviewer contracts أو RPC/RLS أو صلاحيات التأليف والمراجعة أو Submission Readiness يحتاج قرارًا مكتوبًا واختبارات مرتبطة به. Phase 4 تبني فوق هذا الحد ولا تعيد فتحه ضمنيًا.

Remote Supabase لمشروع رفيق العلوم تبقى خارج شرط هذا التجميد، وفق القرار التشغيلي الحالي الذي يعتمد Supabase المحلية في Codespaces لهذه المرحلة.

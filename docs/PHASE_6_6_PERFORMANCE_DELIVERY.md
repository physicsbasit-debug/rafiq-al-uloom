# رفيق العلوم — Phase 6-6A

## Performance Baseline + Bundle Audit

**الحالة:** IMPLEMENTATION / REVIEW  
**Phase 6 branch baseline:** `0271bb6e7c087fe4411f814a1c140a452c1e79bd`  
**النطاق:** قياس فقط + baseline متتبع + budget guard مؤقت. لا code splitting ولا تغيير UI في 6-6A.

---

## 1. دليل التسلسل الخام قبل فتح 6-6A

المصدر التاريخي المجمد هو:

```text
tag: v0.8-advanced-science-activities-complete
tag dereference → 5f46fca6ee4617720d0770b2139c9a844aaa08b6
commit message → docs: freeze phase 5 advanced science activities
```

ومقتطف `docs/PHASES.md` على baseline Phase 5 يسجل:

```text
5-6D  Arabic Root + RTL Hardening                              ✅ PASS @ f519a6c8c5d78ce7eed9c70785e27aa88626ded9
5-6E  Mobile / RTL Visual Acceptance                           ✅ PASS @ f519a6c8c5d78ce7eed9c70785e27aa88626ded9
5-6F  Full Phase 5 Functional Acceptance                       ✅ PASS @ f519a6c8c5d78ce7eed9c70785e27aa88626ded9
5-Freeze  Final Documentation + Closure + Tag                  ✅ CLOSED
```

والسجل نفسه يذكر أن قبول 5-6E كان بوابة بشرية بصرية على:

```text
360×800
390×844
768×1024
```

وأن `verify:phase-5-closure` والمراجعة المستقلة والدمج إلى `main` كانت PASS قبل الوسم.
حزمة REVIEW الخاصة بـ6-6A لا تعتمد على هذا الوصف وحده؛ apply script يتحقق من dereference
للوسم ومن وجود أسطر الإغلاق نفسها في checkout المحلي قبل تطبيق التغييرات.

---

## 2. الرقم التمهيدي السابق

سجل build في نهاية 6-5 أظهر:

```text
dist/assets/index-Bu8KMlFp.js   724.05 kB │ gzip: 183.94 kB
```

هذا **Pre-6-6 observed value** فقط، وهو دافع لفتح مرحلة الأداء.  
هو **ليس baseline الرسمي** لـ6-6A ولا تستخدم قيمته بوصفها budget في CI.

الـbaseline الرسمي الوحيد هو الملف المتتبع:

```text
config/production-performance-baseline.json
```

وينشأ مرة واحدة من build 6-6A الفعلي بواسطة السكربت نفسه.

---

## 3. آلية القياس الرسمية

بعد:

```bash
npm run build
```

ينفذ مرة واحدة فقط عند تأسيس baseline:

```bash
npm run performance:baseline
```

السكربت `scripts/check-production-performance.mjs`:

1. يقرأ `dist/index.html`.
2. يحدد initial module JS والـmodulepreload المشار إليها فعليًا من HTML.
3. يقيس raw bytes وgzip bytes بطريقة ثابتة داخل Node باستخدام `zlib` level 9.
4. يسجل إجمالي JS وCSS وعدد الملفات وأكبر JS.
5. يكتب baseline JSON متتبعًا يتضمن commit المصدر والسياسة والأرقام الخام.
6. يرفض إعادة كتابة baseline موجود بصمت.

قد تختلف أرقام gzip الخاصة بالسكربت قليلًا عن reporter الخاص بـVite بسبب اختلاف أداة القياس؛
مصدر الحقيقة لـPhase 6-6 هو السكربت والـJSON المتتبع، لا الرقم المطبوع من Vite.

---

## 4. الميزانية المؤقتة لـ6-6A

بعد إنشاء baseline الرسمي تصبح بوابة CI:

```bash
npm run verify:performance
```

قابلة للفشل رقميًا.

العقد المؤقت:

```text
initial JS gzip الحالي <= baseline initial JS gzip × 1.05
```

أي أن الزيادة المسموحة خلال 6-6 لا تتجاوز **5%** من baseline الرسمي.

هذا guard مؤقت لمنع regression صامت أثناء العمل. الميزانية النهائية تُثبت في 6-6C بعد قرار
code splitting وslow-network وMobile/RTL re-acceptance.

تحديث baseline ليس إجراءً تلقائيًا لعلاج فشل CI. السكربت يرفض overwrite افتراضيًا؛ أي تغيير
لاحق يحتاج قرارًا صريحًا ومراجعة للفرق.

---

## 5. عقد قرار 6-6B

عتبة الدخول النظرية للتقسيم:

```text
deferable initial JS gzip >= 10% من baseline الرسمي
```

وعتبة الاحتفاظ بالتنفيذ بعد التجربة:

```text
actual initial JS gzip reduction >= 10% من baseline الرسمي
```

إذا لم يتحقق الشرطان، لا يُحتفظ بتقسيم شكلي لمجرد إسكات تحذير Vite.

الـbaseline JSON يخزن النسب الثلاث:

```text
temporaryInitialJsGzipGrowthPercent = 5
codeSplitCandidateThresholdPercent = 10
codeSplitAcceptanceReductionPercent = 10
```

ويحسب السكربت القيم المقابلة بالبايت حتى يكون قرار المرحلة التالية مبنيًا على رقم لا على وصف.

6-6A لا تعدل `App.tsx` ولا `TeacherWorkspace` ولا `ReviewerWorkspace`. قياس candidate الفعلي
وتجربة الفصل، إن استحقت، لهما دفعة مستقلة بعد اعتماد baseline.

---

## 6. إثبات أن الحارس يستطيع أن يصبح أحمر

`tests/architecture/phase-6-6-performance-delivery.test.ts` لا يكتفي بالبحث النصي.

ينشئ dist اصطناعيًا deterministic، ثم:

1. يولد baseline من build مصطنع.
2. يثبت أن البناء نفسه يمر.
3. يزيد initial JS بما يتجاوز 5%.
4. يشغل السكربت فعليًا ويتطلب exit code غير صفري و`PERFORMANCE_GATE_FAIL`.
5. يثبت أن baseline الموجود لا يعاد كتابته بصمت.
6. يثبت ترتيب CI: Build → Performance Budget → Core Tests.

إذًا PASS هنا له نقيض اختباري حقيقي ومثبت، لا مجرد وجود ملف أو أمر.

---

## 7. ربط CI

`verify-ci-static.sh` يشغل:

```text
Build
→ Production performance budget
→ Core/unit tests
→ Phase 6 architecture tests
→ بقية الحراس
```

وبذلك أي تضخم يتجاوز الميزانية يفشل قبل أن تصل البوابة إلى بقية الاختبارات.

---

## 8. ما لا يدخل 6-6A

لا تغيير في:

- `src/App.tsx`.
- مسارات الطالب أو المعلم أو المراجع.
- Supabase schema / migrations / RLS / Auth.
- Edge Functions أو Gemini.
- Remote production.
- caching headers الفعلية.
- slow-network UI.
- Mobile/RTL البشري الجديد.

هذه البنود تبقى لـ6-6B/6-6C/6-7 حسب العقد المعتمد.

---

## 9. معيار قبول 6-6A

```text
Phase 5 freeze raw evidence          VERIFIED
official baseline JSON               TRACKED
initial JS gzip baseline             MEASURED
temporary +5% guard                  ENFORCED
red-path >5% test                    PASS
silent baseline overwrite            BLOCKED
code-split thresholds 10% / 10%      FROZEN
CI ordering                           VERIFIED
App/features unchanged               VERIFIED
static CI                            PASS
Supabase CI                          PASS
GitHub Actions                       PASS
```

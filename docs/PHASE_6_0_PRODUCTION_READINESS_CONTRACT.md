# رفيق العلوم — Phase 6-0

## Production Readiness Contract + Gap Audit

**الحالة:** PRE-IMPLEMENTATION CONTRACT  
**Baseline frozen:** `v0.8-advanced-science-activities-complete`  
**Baseline commit:** `5f46fca6ee4617720d0770b2139c9a844aaa08b6`  
**Target branch:** `phase-6-production-readiness`

---

## 1. الهدف

Phase 6 لا تضيف ميزة تعليمية جديدة ولا تعيد فتح العقود المجمدة في Phases 2–5.

هدفها تحويل رفيق العلوم من منتج مكتمل وظيفيًا إلى منتج قابل للنشر والتشغيل والصيانة بأمان، مع بوابات واضحة للأمن، البيئة، CI/CD، الرصد، النسخ الاحتياطي، الأداء، والتعافي.

لا يُعد التطبيق Production Ready لمجرد نجاح `npm run build` أو نشر الواجهة. الجاهزية الإنتاجية هنا تعني أن مسار التشغيل الكامل قابل للتكرار، قابل للمراقبة، قابل للاستعادة، ولا يعتمد على أسرار محلية أو خطوات بشرية غامضة.

---

## 2. Baseline المجمد

Phase 6 تبدأ فقط من:

```text
v0.8-advanced-science-activities-complete
→ 5f46fca6ee4617720d0770b2139c9a844aaa08b6
```

هذا baseline مجمد.

### ممنوع في Phase 6

- إعادة تصميم ميزات الطالب أو المعلم أو المراجع بلا حاجة إنتاجية مثبتة.
- تغيير منطق Mastery أو نتائج الإتقان.
- إعادة فتح عقود AI-assisted Authoring.
- إعادة فتح أنواع الأنشطة العلمية الخمسة أو Safety policy إلا لعطل إنتاجي مثبت.
- تعديل migrations تاريخية.
- إدخال أسرار حقيقية في Git.
- ربط Remote Supabase أو مزود استضافة قبل تثبيت عقد البيئة والتشغيل.
- خلط إصلاحات الأداء أو الأمن أو الرصد في commit ضخم واحد.

---

## 3. نتائج Gap Audit الأولية

### 3.1 نقاط قوة موجودة

- بوابات إغلاق قوية للمراحل السابقة.
- Build وLint وUnit/Integration tests مستقرة.
- Supabase local integration قابلة لإعادة الضبط والاختبار.
- RLS وAuth وAuthoring boundaries خضعت لاختبارات سابقة.
- ملفات `.env.development` و`.env.test` الحالية لا تحتوي أسرارًا حقيقية.
- عميل Supabase يرفض القيم الناقصة أو URL غير صالح بدل الاستمرار بصمت.
- Phase 5 أُغلقت على main نظيف ومتزامن مع tag نهائي.

### 3.2 فجوات Production Readiness التي يجب إغلاقها

1. لا توجد بوابة Production موحدة مستقلة حتى الآن.
2. لا يوجد CI workflow ظاهر في المستودع الحالي.
3. لا توجد سياسة Git عامة واضحة تمنع ملفات `.env` الإنتاجية والأسرار المحتملة.
4. بيئة التطوير تعتمد `/supabase` proxy محليًا، بينما الإنتاج يحتاج URL ومفتاحًا عامًا صريحين.
5. Remote Supabase ما زالت مؤجلة عمدًا، لذلك لم يُنفذ production deployment حقيقي بعد.
6. لا توجد طبقة رصد أخطاء runtime/telemetry معتمدة.
7. لا توجد خطة Backup/Restore واختبار استعادة موثق.
8. لا توجد بوابة Production security headers/CSP معتمدة.
9. لا توجد سياسة Dependency/Supply-chain scanning معتمدة.
10. Build الحالي سبق أن أعطى تحذير bundle أكبر من 500 kB؛ لا يُعد blocker الآن لكنه يدخل نطاق الأداء.
11. لا يوجد runbook تشغيل وإيقاف واستعادة وحوادث معتمد.
12. لا توجد Production smoke/UAT gate على بيئة منشورة حقيقية.

---

## 4. المبدأ المعماري الحاكم

```text
Product correctness
        ↓
Production configuration
        ↓
Operational reliability
        ↓
Deployment + recovery
```

نجاح الطبقة الأعلى لا يعوض غياب الطبقة التالية.

---

## 5. تقسيم Phase 6

### 6-0 — Production Readiness Contract + Gap Audit

**المخرجات:** هذا العقد، baseline ثابت، خريطة الفجوات، ترتيب التنفيذ، non-goals، ومعايير الإغلاق.

**القبول:** لا كود إنتاجي، لا Remote Supabase، لا Secret، ومراجعة العقد قبل بدء 6-1.

### 6-1 — Production Environment + Secret Boundary

- تحديد المتغيرات العامة المسموح بها للواجهة.
- فصل `VITE_*` العامة عن الأسرار الخادمية.
- تحديث `.gitignore` لحماية env/secrets دون كسر ملفات المثال الآمنة.
- إضافة `.env.example` أو عقد بديل واضح.
- فاحص production-env deterministic.
- تحديد production Supabase URL/public anon key contract.
- تحديد Edge Function secrets خارج Git.
- تحديد Auth site URL وredirect URLs المطلوبة.
- قرار مزود الاستضافة وتوثيق سبب القرار.

### 6-2 — CI + Supply Chain Gate

- GitHub Actions على Pull Request وmain.
- Prettier، Lint، Build، Unit، Architecture/boundary tests.
- secret scan وdependency audit بسياسة واضحة.
- migration immutability guard.
- artifact/build verification.
- منع CI من الحاجة إلى أسرار production للاختبارات غير الحية.

### 6-3 — Runtime Resilience + Observability

- Global Error Boundary.
- رسائل عربية آمنة.
- عدم كشف stack traces أو secrets.
- structured operational logging للخادم/Edge.
- correlation/request id حيث يلزم.
- سياسة telemetry/minimum-data.
- health/readiness checks.
- عدم تسجيل access tokens أو كلمات المرور أو payload حساس.

### 6-4 — Production Security Hardening

- Security headers/CSP.
- frame/embed policy.
- referrer policy.
- permissions policy حسب الحاجة.
- مراجعة Auth production settings.
- rate limits وabuse controls.
- CORS/allowed origins للـEdge Functions.
- مراجعة public/service-role boundaries.
- فحص build النهائي للأسرار.

### 6-5 — Backup + Restore + Migration Recovery

- تحديد نطاق النسخ الاحتياطي.
- retention.
- طريقة backup وrestore.
- restore drill على بيئة غير production.
- RPO/RTO عمليان.
- forward-only migrations.
- rollback عبر migration تصحيحية.
- runbook بعد migration فاشلة.

### 6-6 — Performance + Delivery Readiness

- قياس bundle baseline.
- تحليل chunk > 500 kB.
- code splitting فقط إذا ثبتت فائدته.
- slow-network loading/error states.
- caching policy للأصول الثابتة.
- منع caching الخاطئ للبيانات الحساسة.
- Mobile/RTL re-acceptance بعد أي تغيير UI إنتاجي.

### 6-7 — Real Production Deployment + Smoke/UAT + Runbook

بعد إغلاق 6-1 إلى 6-6 فقط:

- ربط Remote Supabase.
- تطبيق migrations forward-only.
- إعداد Auth URLs.
- نشر Edge Functions المطلوبة.
- ضبط secrets.
- نشر الواجهة.
- Production smoke tests للمسارات الأساسية.
- runbook تشغيل وحوادث.
- لا تستخدم بيانات طلاب حقيقية في اختبار القبول الأولي.

### 6-Freeze — Production Readiness Closure

- `npm run verify:phase-6-closure`.
- CI أخضر.
- Production smoke/UAT PASS.
- Backup/Restore drill PASS.
- Security checklist PASS.
- Observability checklist PASS.
- Performance baseline مقبول.
- runbook مكتمل.
- مراجعة مستقلة.
- main نظيف ومتزامن.
- tag مقترح:

```text
v0.9-production-readiness-complete
```

Phase 6 لا تنشئ `v1.0`.

---

## 6. العلاقة مع v1.0

```text
v0.9-production-readiness-complete
        ↓
Final v1.0 Acceptance
        ↓
v1.0.0
```

مرحلة v1.0: قبول وظيفي وتشغيلي نهائي، release notes، والتحقق من production deployment، بلا ميزات جديدة أو refactor كبير.

---

## 7. سياسة الأسرار

### يسمح في Browser

- Supabase project URL.
- Supabase anon/publishable key.

### يمنع في Browser/Git

- service role key.
- database password.
- Gemini API key.
- SMTP credentials.
- OAuth client secrets.
- private signing keys.
- personal tokens.
- مفاتيح backup/storage الخاصة.

أي متغير يبدأ بـ`VITE_` يجب اعتباره قابلًا للظهور للمستخدم النهائي داخل bundle.

---

## 8. سياسة Remote Supabase

Remote Supabase كانت مؤجلة عمدًا حتى Phase 6:

1. لا تُربط قبل إغلاق 6-1.
2. لا تُطبق migrations قبل فحص قائمتها وترتيبها.
3. لا يُستخدم `db reset` على production.
4. لا تُزرع بيانات اختبارية غير مصرح بها.
5. لا تُنسخ service-role keys إلى `.env` متتبع.
6. Edge secrets تضبط عبر secret management.
7. أول deployment يجب أن يكون قابلاً للتراجع تشغيليًا.

---

## 9. سياسة CI

CI يجب أن تكون deterministic قدر الإمكان، non-live افتراضيًا، ولا تعتمد على Gemini الحي أو Remote Supabase production لكل PR.

نفصل بين:

- fast static/unit gate
- local Supabase integration gate
- optional/manual live-provider gate
- production smoke gate بعد النشر

---

## 10. سياسة الرصد والخصوصية

لا يجوز أن تسجل أدوات الرصد كلمات المرور أو tokens أو مفاتيح API أو service-role أو بيانات طالب كاملة بلا حاجة تشغيلية.

الأولوية:

1. error type
2. operation
3. sanitized context
4. request/correlation id
5. minimal technical metadata

---

## 11. معايير التوقف

نتوقف إذا ظهر:

- Secret حقيقي في Git history أو bundle.
- Remote migration drift غير مفهوم.
- RLS مختلفة عن baseline المتوقع.
- production build يعتمد على dev proxy.
- CORS/Auth redirect مفتوحان بلا حدود واضحة.
- backup غير قابل للاستعادة.
- smoke test يفشل في مسار محمي أساسي.
- observability تكشف معلومات حساسة.
- deployment غير قابل لإعادة الإنتاج من الوثائق.

---

## 12. ترتيب التنفيذ

```text
6-0 Contract
→ 6-1 Environment / Secrets
→ 6-2 CI / Supply Chain
→ 6-3 Resilience / Observability
→ 6-4 Security Hardening
→ 6-5 Backup / Restore
→ 6-6 Performance
→ 6-7 Real Deployment / UAT
→ 6-Freeze
→ v1.0 Acceptance
```

---

## 13. بوابة قبول 6-0

يُغلق 6-0 فقط عندما:

- يكون الفرع مبنيًا من `v0.8-advanced-science-activities-complete`.
- يكون هذا الملف هو التغيير الوحيد في commit العقد.
- `git diff --check` ناجح.
- Prettier ناجح.
- لا production code change.
- لا migration change.
- لا Supabase remote mutation.
- لا secret.
- تتم مراجعة العقد واعتماده قبل 6-1.

---

## 14. القرار

Phase 6 تبدأ رسميًا كمرحلة تشغيل وإنتاج، لا كمرحلة ميزات.

**NEXT بعد إغلاق 6-0:**  
`6-1 — Production Environment + Secret Boundary`

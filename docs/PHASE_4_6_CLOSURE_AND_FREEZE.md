# رفيق العلوم — Phase 4-6

## Closure, Security Reconciliation & Freeze

**الحالة:** FINAL FREEZE CANDIDATE
**Pre-closure implementation baseline:** `625be6c7eedc8bc58e6d5cfa61e73300c6cb7ccb`
**الوسم النهائي المطلوب:** `v0.7-ai-assisted-authoring-complete`

هذه الدفعة لا تضيف ميزة جديدة. وظيفتها إغلاق Phase 4 بالأدلة وإعادة التحقق من المسار الحي الكامل قبل التجميد.

## نطاق 4-6C

```text
ADD     scripts/verify-phase-4-closure.sh
ADD     docs/PHASE_4_6_CLOSURE_AND_FREEZE.md
UPDATE  package.json
UPDATE  docs/PHASES.md
```

### Security reconciliation Fix1

```text
UPDATE  src/App.tsx
UPDATE  src/services/auth/auth.service.ts
UPDATE  tests/auth/auth.service.test.ts
UPDATE  tests/architecture/browser-ai-gateway-boundary.test.ts
```

بدأت 4-6C بوصفها دفعة closure tooling فقط. أثناء تشغيل بوابة الإغلاق كُشفت مخالفة Auth boundary في App.tsx، فعولجت في Fix1 بنقل قراءة access token إلى auth.service.ts وتحديث الحارس والاختبارات المرتبطة فقط. لم تتغير SQL أو migrations أو Edge Functions أو Auth state أو Authorization أو Authoring أو Reviewer أو LessonRevisionPayload.

### Closure runtime reconciliation Fix2

أثبت تشغيل بوابة الإغلاق أن مجموعة Supabase غير الحية كانت تستدعي اختبار AI Gateway قبل تشغيل Edge runtime، فكانت جميع حالات HTTP تعود 503 رغم سلامة المنطق. أثبت اختبار إعادة الإنتاج أن تشغيل ai-authoring-gateway أولًا يعيد حماية JWT برمز 401 ثم تنجح اختبارات Gateway الثمانية كاملة.

يعالج Fix2 ترتيب بوابة الإغلاق فقط: يشغّل Edge runtime غير الحي قبل المجموعة التكاملية الكاملة، ينظفه بعدها، ثم يشغّل لاحقًا Edge جديدًا مستقلًا مع GEMINI_API_KEY لاختبارات Gemini الحية. لا يتغير production code أو SQL أو migrations أو Edge Function أو عقود التطبيق.

## المراحل المغلقة قبل التجميد

```text
4-0   Contract & Architecture
4-1   Provider-neutral domain + deterministic provider
4-2   Field-level Teacher AI UX
4-3   Secure Edge Gateway + quota + live Gemini
4-4   Deterministic Pedagogical Guardrails
4-5   Provenance Persistence Decision
4-6B  Real AI Acceptance Composition
```

## المسار الحي المثبت

```text
Gemini
→ GatewayAiAuthoringProvider
→ Suggestion Buffer
→ explicit Teacher acceptance
→ Form Buffer
→ AuthoringService
→ Supabase Revision
→ Submit
→ Reviewer
→ Approve
→ canonical publication
```

لا يملك AI مسارًا مباشرًا للحفظ أو الإرسال أو الاعتماد أو النشر.

## Provenance

القرار النهائي في v0.7:

```text
NO DURABLE AI PROVENANCE PERSISTENCE IN v0.7
```

تبقى AiSuggestionMeta مؤقتة، ولا تدخل LessonRevisionPayload أو content_review_events أو durable persistence جديد.

## بوابة الإغلاق

```bash
npm run verify:phase-4-closure
```

تتحقق البوابة من formatting وlint وbuild والاختبارات الأساسية وحدود Auth وMastery وحدود AI وSupabase reset وAuth smoke الحقيقي والتعافي المضبوط وتشغيل Edge غير الحي قبل المجموعة التكاملية الكاملة وتنظيفه بعدها وTeacher/Reviewer composition ثم تشغيل Edge حي جديد لاختبارات Gemini وأخيرًا سلامة Git.

## Live Gemini

يتطلب الإغلاق النهائي وجود `GEMINI_API_KEY` في بيئة التنفيذ دون طباعة قيمته أو حفظه في المستودع. يستخدم السكربت ملفًا مؤقتًا بصلاحية 600 ويحذفه بعد الاختبار.

## شروط التجميد

```text
npm run verify:phase-4-closure → PASS
git status --short → empty
HEAD = origin/main
annotated tag → same final commit
```

بعد تحقق هذه الشروط فقط يصبح:

```text
Phase 4: CLOSED & FROZEN
v0.7-ai-assisted-authoring-complete
```

بوابة الإغلاق لا تنشئ الوسم ولا تدفعه تلقائيًا.

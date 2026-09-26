# رفيق العلوم — Phase 6-6B

## Measured Code-Splitting Decision

**الحالة:** IMPLEMENTATION / REVIEW
**قاعدة القياس:** `config/production-performance-baseline.json`
**Baseline الرسمي:** `metrics.initialJs.gzipBytes = 182127`
**عتبة القبول:** `18213 bytes` على الأقل (10%)

---

## 1. مصدر الرقم

الرقم `182127` ليس رقم Vite التمهيدي.

مصدر الحقيقة الوحيد هو الملف المتتبع من 6-6A:

```text
config/production-performance-baseline.json
```

وقيمته المعتمدة:

```text
phase = 6-6A
metrics.initialJs.gzipBytes = 182127
policy.codeSplitAcceptanceReductionPercent = 10
```

أما `183.94 kB` فهو `Pre-6-6 observed value` من reporter الخاص بـVite ولا يدخل في قرار 6-6B.

---

## 2. قرار التنفيذ المعتمد

المسار الطلابي يبقى هو initial path.

يؤجل التطبيق:

```text
TeacherWorkspaceSurface
ReviewerWorkspace
```

باستخدام dynamic import.

`TeacherWorkspaceSurface` يملك داخله حصريًا:

```text
GatewayAiAuthoringProvider
getCurrentAccessToken
TeacherWorkspace
```

وبذلك لا تبقى شجرة AI الخاصة بالمعلم في `App.tsx`.

فُحص مسار المراجع قبل التنفيذ ولم توجد في `App.tsx` تبعية ثقيلة موازية لمسار AI الخاص بالمعلم،
لذلك يكفي تأجيل `ReviewerWorkspace` نفسها.

---

## 3. Loading + Failure

`Suspense` مسؤولة فقط عن الانتظار:

```text
جارٍ تحميل مساحة المعلم...
جارٍ تحميل مساحة المراجع...
```

أما رفض dynamic import، مثل فشل الشبكة أو غياب chunk، فيلتقطه Error Boundary محلي لمساحة العمل.

السلوك:

```text
تعذر تحميل مساحة العمل
تحقق من الاتصال ثم حاول مرة أخرى.
إعادة المحاولة
```

إعادة المحاولة تنشئ `React.lazy` جديدة وتعيد استدعاء loader دون إسقاط التطبيق كاملًا.

يبقى `RuntimeErrorBoundary` العام شبكة أمان أخيرة، وليس المسار المتوقع لفشل chunk محلي.

---

## 4. قرار GO / NO-GO

القرار يصدر من السكربت الرسمي نفسه:

```bash
npm run build
npm run verify:code-split
```

حيث:

```text
baseline = 182127 bytes gzip
required reduction = 18213 bytes
```

### GO

```text
measured initial JS gzip reduction >= 18213
CODE_SPLIT_DECISION=GO
CODE_SPLIT_ACCEPTANCE=PASS
```

### NO-GO

```text
measured initial JS gzip reduction < 18213
CODE_SPLIT_DECISION=NO_GO
```

**NO-GO = تراجع كامل** عن جميع تغييرات الإنتاج الخاصة بـ6-6B، بما فيها:

- `TeacherWorkspaceSurface`
- dynamic imports
- `React.lazy`
- `Suspense`
- Error Boundary المحلية الخاصة بالـchunk
- أي ربط CI خاص بقبول التقسيم

ولا يُحتفظ بتحسين معماري جانبي بحجة أنه أنظف.

يُحتفظ فقط بدليل القياس/القرار إن لزم توثيق سبب NO-GO.

---

## 5. ما لا يتغير

6-6B لا تعدل:

- Supabase schema
- migrations
- RLS
- Auth policy
- Edge Functions
- Gemini contract
- Teacher / Reviewer business logic
- Student educational behavior

التغيير في composition/loading boundary فقط.

---

## 6. ما يبقى لـ6-6C

6-6C تتولى:

- slow-network acceptance الشامل
- caching policy
- Mobile/RTL re-acceptance
- تثبيت الميزانية النهائية للأداء

معالجة **فشل chunk نفسه** ليست مؤجلة؛ هي جزء من 6-6B من أول يوم.

---

## 7. معايير قبول 6-6B عند GO

```text
official baseline source            VERIFIED
measured reduction >= 18213 bytes   REQUIRED
teacher AI tree deferred            VERIFIED
reviewer workspace deferred         VERIFIED
student initial path preserved      VERIFIED
Arabic Suspense fallback            PASS
dynamic import rejection boundary   PASS
local retry                         PASS
workspace/auth tests                PASS
static CI                           PASS
Supabase CI                         PASS
GitHub Actions                      PASS
```

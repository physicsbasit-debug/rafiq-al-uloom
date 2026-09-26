# رفيق العلوم — Phase 6-6C

## Final Performance + Slow-Network + Caching + Mobile/RTL Acceptance

**الحالة:** IMPLEMENTATION / REVIEW
**مرجع 6-6B المقبول:** `04ea14edaf8e1717b65de107e04a468b6a0d7adc`
**النطاق:** تثبيت ميزانية الأداء النهائية، عقد caching، وقبول slow-network وMobile/RTL. لا تغيير في المنطق التعليمي أو Supabase أو Auth أو Edge.

---

## 1. الميزانية النهائية

يبقى baseline التاريخي لـ6-6A محفوظًا ولا يعاد كتابته.

القياس المقبول بعد 6-6B:

```text
initial JS gzip = 154587 bytes
total JS gzip   = 184833 bytes
JS chunks       = 4
```

تعتمد 6-6C هامش نمو نهائي 5% فقط:

```text
maximum initial JS gzip = 162317 bytes
maximum total JS gzip   = 194075 bytes
```

التحقق النهائي:

```bash
npm run verify:performance-final
```

يفحص initial JS وtotal JS معًا حتى لا يتحول تقليل initial bundle إلى تضخم صامت في lazy chunks.

---

## 2. عقد caching

6-6C تثبت السياسة فقط. تنفيذ رؤوس الاستضافة الفعلية يبقى ضمن 6-7 لأن مزود الاستضافة النهائي جزء من النشر الإنتاجي.

```text
index.html
Cache-Control: public, max-age=0, must-revalidate

/assets/* ذات الأسماء المبنية على content hash
Cache-Control: public, max-age=31536000, immutable

Auth / Supabase writes / Edge Functions / user-specific dynamic responses
Cache-Control: no-store
```

لا يجوز للـstatic host أن يفرض cache طويلًا على الاستجابات الديناميكية الحساسة.

---

## 3. slow-network acceptance

القبول المطلوب لمساحتي المعلم والمراجع:

1. يبقى المسار الطلابي هو المسار الأولي ولا ينتظر chunks الخاصة بمساحات العمل.
2. عند تأخر dynamic import يظهر fallback عربي RTL واضح: `جارٍ تحميل مساحة ...`.
3. عند وصول chunk تنتقل الواجهة إلى مساحة العمل دون إسقاط التطبيق أو فقدان جلسة المستخدم.
4. عند فشل chunk يظهر الخطأ المحلي `تعذر تحميل مساحة العمل` مع زر `إعادة المحاولة`.
5. بعد عودة الاتصال وإعادة المحاولة تُحمّل المساحة محليًا دون تحويل الخطأ إلى RuntimeErrorBoundary عام.

الاختبار الآلي يثبت pending loader ورفض chunk وإعادة المحاولة. القبول البصري البشري أدناه يبقى شرط الإغلاق النهائي لـ6-6C.

---

## 4. Mobile / RTL re-acceptance

يُعاد القبول البصري على نفس مصفوفة Phase 5:

```text
360×800
390×844
768×1024
```

وفي كل مقاس يُفحص:

- الصفحة عربية وRTL.
- لا يوجد horizontal overflow غير مقصود.
- شاشة الطالب الأولية سليمة.
- زر مساحة المعلم/المراجع لا يكسر layout.
- fallback الخاصة بالتحميل البطيء واضحة ولا تغطي عناصر التنقل.
- رسالة فشل chunk وزر إعادة المحاولة صالحان للقراءة والضغط.
- بعد اكتمال التحميل تبقى مساحة العمل قابلة للاستخدام والعودة إلى التعلم سليمة.

**حالة القبول البصري:** PENDING HUMAN ACCEPTANCE

---

## 5. ما لا يدخل 6-6C

لا تعديل على:

- المناهج أو الأنشطة أو منطق الطالب.
- Teacher/Reviewer business rules.
- Supabase schema / migrations / RLS.
- Auth policy.
- Edge Functions / Gemini.
- Remote production deployment.
- رؤوس caching الحقيقية على مزود الاستضافة.

هذه الأخيرة تُنفذ وتُفحص حيًا في 6-7.

---

## 6. معيار الإغلاق

```text
final initial JS budget             PASS
final total JS budget               PASS
cache policy contract               PASS
slow-network automated behavior     PASS
chunk failure + retry               PASS
Mobile / RTL 360×800                HUMAN PASS
Mobile / RTL 390×844                HUMAN PASS
Mobile / RTL 768×1024               HUMAN PASS
static CI                           PASS
Supabase CI                         PASS
GitHub Actions                      PASS
```

لا تُعلن 6-6C `CLOSED` قبل اكتمال بوابة Mobile/RTL البشرية على المرشح نفسه.

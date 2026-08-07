# Phase 3-2 — Authoring/Review Client Layer + Authorization Activation

هذه حزمة **رفع معتمدة مراجعيًا** لـPhase 3-2، مبنية فوق الإغلاق المحلي لـPhase 3-1.

حالة المرحلة عند إنشاء هذه الحزمة:

```text
REVIEW APPROVED ✅
EXECUTION / VERIFICATION PENDING ⏳
```

لا تُعد Phase 3-2 مغلقة رسميًا إلا بعد تطبيق الحزمة في Codespaces واجتياز بوابات التشغيل والاختبارات كاملة.

## النطاق

- TypeScript types لعقد Authoring Plane.
- `AuthoringRepository` و`ReviewRepository` منفصلان.
- تنفيذ Supabase مركزي واحد يملك RPCs الأربع.
- `AuthoringService` و`ReviewService`.
- تفعيل `author_content` للمعلم النشط فقط.
- تفعيل `review_content` للمراجع النشط فقط.
- unit tests للمستودعات والخدمات والسياسة.
- architecture test لمنع RPC المباشر من React.
- integration test حقيقي على Supabase المحلية لمسار client layer.
- تحديث التوثيق المعماري والخارطة.

## خارج النطاق

- لا UI.
- لا hooks للوحة المعلم/المراجع.
- لا Migration جديدة.
- لا تعديل على Migration 3-1.
- لا AI.
- لا Service Role في Frontend.
- لا Remote Supabase deployment.
- لا وسم `v0.6`.

## قرار التشغيل الحالي

التطوير يستمر محليًا داخل Codespaces. مشروع Supabase البعيد لـ`rafiq-al-uloom` مؤجل عمدًا، لذلك لا تستخدم هذه المرحلة `supabase link` أو `db push`.

## أهم حد معماري

```text
React feature
→ service
→ repository interface
→ supabase-authoring.repositories.ts
→ RLS/RPC
```

أسماء RPCs الأربع يجب ألا تظهر في أي ملف إنتاجي آخر:

```text
create_lesson_revision
save_lesson_revision
submit_lesson_revision
review_lesson_revision
```

## نتيجة المراجعة المعمارية

اعتمدت المراجعة البنود التالية:

1. لا يقبل العميل `author_id` أو `reviewer_id`.
2. لا توجد direct table writes في طبقة العميل.
3. runtime mappers صارمة وتفشل مغلقًا عند response غير معروف.
4. `AbortSignal` محفوظ، ولا يُحوّل `AbortError` إلى `unavailable`.
5. `author_content` محصور في active teacher فقط.
6. `review_content` محصور في active reviewer فقط.
7. بقية مصفوفة Auth/Authorization لم تُفتح أو يُعاد تصميمها.
8. تنفيذ Supabase لا يتسرب إلى `features`.
9. Remote Supabase ما زالت خارج نطاق 3-2.

الخطوة الحالية هي تطبيق الحزمة في Codespaces وتشغيل بوابات الإغلاق التنفيذي فقط.

# رفيق العلوم — خطة المراحل

## الحالة المعتمدة

أُغلقت طبقة بيانات المحتوى عند الوسم:

```text
v0.3-data-layer-complete
```

وأُغلقت منظومة المصادقة والتفويض عند الوسم:

```text
v0.4-auth-security-complete
→ 27c1d7432066e196d66ec3a731594df0a506326e
```

أُغلقت Phase 2-D وجُمّدت رسميًا عند الوسم:

```text
v0.5-mastery-results-cloud-complete
→ c99ecf69a5225a03108798476dc69e75987d7595
```

نجح أمر الإغلاق الموحد `npm run verify:mastery-results-closure` على الالتزام نفسه، وأثبت:

```text
508 basic tests
89 Supabase integration tests
597 unique tests
Composition 2/2
Parity 10/10
```

بدأت Phase 3: Teacher Dashboard رسميًا. أُغلقت Phase 3-0 بعد اعتماد العقد وتشغيل بوابات القبول على الالتزام `37a4024`:

```text
Build PASS
Lint PASS
Prettier PASS
508/508 basic
89/89 Supabase integration
Git clean
HEAD = origin/main
```

أُغلقت Phase 3-1: Authoring Schema + RLS + Trusted Transitions بعد تطبيق الـMigration واختبارات PostgreSQL الحقيقية محليًا. اكتملت المراجعة المعمارية لـPhase 3-2: Repositories + Services + Authorization Activation واعتمدت، وبقي الإغلاق التنفيذي بعد تطبيق الحزمة وتشغيل بوابات build/lint/prettier والاختبارات المحلية. Remote Supabase لرفيق العلوم ما زالت مؤجلة عمدًا.

## خارطة الطريق المحدّثة

| المرحلة  | الهدف                                     | المخرجات                                                                | معيار القبول                                             | الحالة                                                                 |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| 0-A      | قرارات تأسيسية                            | وثيقة معتمدة                                                            | اعتماد كتابي                                             | مكتملة                                                                 |
| 0-B      | Project Skeleton                          | مشروع + مجلدات + أنواع + Theme + Docs                                   | build/lint/prettier ناجحة                                | مكتملة                                                                 |
| 1        | Local Prototype                           | تجربة طالب كاملة بمحتوى TypeScript محلي                                 | تصفح كامل من الصف إلى النتيجة                            | مكتملة                                                                 |
| 2-A      | Async Data Contract                       | ContentRepository غير متزامن + hooks مشتركة + ترحيل واجهات الطالب       | الاختبارات المحلية مستقلة عن الشبكة                      | مكتملة                                                                 |
| 2-B      | Supabase Content Data Layer               | Schema + RLS + Seed + Repository + Provider Selection                   | تكافؤ كامل بين local وSupabase                           | مكتملة                                                                 |
| 2-Freeze | Data Layer Freeze                         | توثيق المعمارية والخارطة + الوسم `v0.3-data-layer-complete`             | الوسم يشير إلى commit التجميد المعتمد                    | مكتملة                                                                 |
| 2-C0     | Auth & Authorization Architecture         | قرارات Supabase Auth + Profiles + Roles + Account Status + حدود RLS     | اعتماد الوثيقة المعمارية دون كود                         | مكتملة                                                                 |
| 2-C1     | Auth Client & Session Contract            | Auth types + service + session + sign-in/sign-up/sign-out + unit tests  | عقد Auth واختباراته ناجحة بلا Profiles أو UI             | مكتملة                                                                 |
| 2-C2     | Profiles + Roles + Authorization RLS      | Profiles + Trigger + AuthorizationState + RLS + اختبارات SQL وتكامل     | لا تصعيد ذاتي للصلاحيات ولا مستخدم يتيم                  | مكتملة                                                                 |
| 2-C3     | Login / Logout / Session UI               | واجهات Auth ورسائل الجلسة والتأكيد                                      | تجربة RTL واضحة بلا وميض واجهة محمية                     | مكتملة                                                                 |
| 2-C4     | Protected Operations + Access Guards      | عقد عمليات + محرك قرار + حراس React + اختبارات تجاوز الواجهة            | لا عملية محمية تعتمد على إخفاء الواجهة فقط               | مكتملة                                                                 |
| 2-C5     | Auth Integration Tests & Security Closure | دورة حياة Auth + تركيب حقيقي + فحص أسرار + توثيق تشغيل وتجميد           | الوسم `v0.4-auth-security-complete` على الالتزام المتحقق | مكتملة                                                                 |
| 2-D      | Cloud Persistence                         | حفظ نتائج الإتقان المرتبطة بالمستخدم عبر RPC وRLS مع retry وidempotency | مسار سحابي حقيقي + تكافؤ حسابي + أمر إغلاق موحد          | مكتملة / CLOSED                                                        |
| 3        | Teacher Dashboard                         | تأليف بشري + مراجعة + اعتماد + نشر محكوم                                | teacher يؤلف وreviewer يراجع/يعتمد عبر حماية خلفية       | قيد التنفيذ؛ 3-0 و3-1 CLOSED، و3-2 REVIEW APPROVED / execution pending |
| 4        | AI-assisted Authoring                     | توليد محتوى بمراجعة بشرية                                               | لا يصل أي محتوى مولّد إلى `approved` تلقائيًا            | مخططة                                                                  |
| 5        | Advanced Science Activities               | توسيع الألعاب والتجارب والمحاكاة والأنشطة العلمية                       | كل نشاط مرتبط بهدف تعلم وقابل للاختبار                   | مخططة                                                                  |
| 6        | Production Readiness                      | أمن، أداء، مراقبة أخطاء، نسخ احتياطي، نشر وتوثيق تشغيل                  | قائمة جاهزية إنتاج ناجحة                                 | مخططة                                                                  |
| 1.0      | الإطلاق الرسمي                            | نسخة مستقرة قابلة للاستخدام والتوسع                                     | قبول وظيفي وتشغيلي كامل                                  | الهدف النهائي                                                          |

## تقسيم Phase 2-C5

```text
2-C5-0  عقد الإغلاق الأمني وتدقيق الفجوات             ✅
2-C5-A  تكامل دورة حياة Auth                       ✅
2-C5-B  تركيب Supabase الحقيقي                     ✅
2-C5-C1 أدوات التحقق والتوثيق التشغيلي              ✅
2-C5-C2 تحديث الإغلاق النهائي وإنشاء الوسم           ✅
```

Phase 2-C: CLOSED ✅
Tag: `v0.4-auth-security-complete` → `27c1d7432066e196d66ec3a731594df0a506326e`

تحافظ C5 على قرار C2-B بعدم إعادة قراءة Profile تلقائيًا عند `token_refreshed` أو `user_updated`. تظل RLS الحماية الفورية، وتتم مزامنة الواجهة عبر `refreshAuthorization()` الصريح أو مسار Retry محدد ومختبر.

## تقسيم Phase 2-D

```text
2-D0     Current-State Audit & Persistence Contract       ✅ CLOSED
2-D1     Database + RPC + RLS                             ✅ CLOSED
2-D2     Client Persistence Service                       ✅ CLOSED
2-D3     Mastery Test Integration                         ✅ CLOSED
2-D4     Real Composition & Scoring Parity                ✅ CLOSED
2-D5-C1  Closure Tooling & Operations                     ✅ CLOSED
2-D5-C2  Final Documentation & Freeze                     ✅ CLOSED
```

الدليل النهائي لـPhase 2-D:

```text
commit c99ecf69a5225a03108798476dc69e75987d7595
tag v0.5-mastery-results-cloud-complete
npm run verify:mastery-results-closure → PASS
508/508 basic
89/89 Supabase integration
2/2 Composition
10/10 Parity
597 unique tests
Git clean
HEAD = origin/main
remote annotated tag ^{} = final commit
```

## قاعدة الإغلاق والتجميد لـPhase 2-D

Phase 2-D `CLOSED & FROZEN` عند `v0.5-mastery-results-cloud-complete`، والوسم يشير إلى الالتزام النهائي المتحقق محليًا وبعيدًا عبر annotated tag dereference `^{}`.

لا تُفتح عقود Phase 2-D داخل Phase 3 بلا قرار مكتوب واختبارات مستقلة مرتبطة بالتغيير.

## تقسيم Phase 3 المقترح

```text
3-0  Teacher Dashboard Contract & Architecture                 ✅ CLOSED @ 37a4024
3-1  Authoring Schema + RLS + Trusted Transitions              ✅ CLOSED @ 37e2858
3-2  Repositories + Services + Authorization Activation        🔄 REVIEW APPROVED / execution pending
3-3  Teacher Workspace UI                                      ⏳
3-4  Reviewer Workspace UI                                     ⏳
3-5  Real Composition + Closure & Freeze                       ⏳
```

دليل إغلاق 3-0: `508/508` basic + `89/89` Supabase + Git clean على `37a4024`.

دليل إغلاق 3-1 على `37e2858`:

```text
Migration applied successfully on local PostgreSQL
Phase 3-1 targeted tests: 22/22
  workflow: 7/7
  bypass: 15/15
Build PASS
Lint PASS
Prettier PASS
508/508 basic
111/111 Supabase integration across 10 files
Git clean
HEAD = origin/main
```

Fix 1 الخاص بالتقاط UUID من `psql` اقتصر على اختبار workflow، ثم أُغلق تنسيق الاختبارين على `37e2858`. لم يتغير عقد الـMigration أو RPC/RLS أثناء هذين الإصلاحين.

تم حسم نسب Git قبل اعتماد 3-2: `37e2858` هو إغلاق 3-1 الوظيفي الحقيقي، و`028c8ed` حالة توثيقية لاحقة في نفس السلسلة تمس `docs/PHASES.md` فقط، بلا أي تغيير في SQL/RPC أو منطق الاختبارات.

قرار التشغيل الحالي: Remote Supabase لمشروع `rafiq-al-uloom` مؤجلة عمدًا. تُجرى مراحل Phase 3 الحالية على Supabase المحلية داخل Codespaces، ولا يدخل `supabase link` أو `db push` ضمن بوابات الإغلاق المحلية حتى اعتماد خطة نشر بعيدة لاحقًا.

Phase 3-2 لا تضيف Migration أو UI؛ نطاقها طبقة Repository/Service في TypeScript وتفعيل `author_content` و`review_content` بعد أن أثبتت 3-1 الحماية الخلفية واختبارات التجاوز.

قاعدة Phase 3: لا تُمنح teacher أو reviewer كتابة مباشرة على جداول المحتوى المنشور. التأليف والمراجعة يمران عبر Authoring Plane منفصل، ولا يصل المحتوى إلى المسار الطلابي إلا بعد اعتماد reviewer ونشر خادمي ذري.

## القرارات الملزمة لـPhase 2-C و2-D

- Supabase Auth هو مزوّد الهوية الرسمي.
- `authenticated` مصادقة فقط، وليس دورًا تطبيقيًا.
- `public.profiles` هو مصدر الأدوار وحالة الحساب.
- لا تُخزّن صلاحيات التفويض في Metadata قابلة لتعديل المستخدم.
- المستخدم لا يستطيع تعديل `role` أو `status` أو ترقية نفسه.
- الحساب `suspended` محظور بالكامل.
- لا يُستخدم Anonymous Sign-In؛ وضع الزائر يبقى محليًا.
- التسجيل وإنشاء Profile عملية ذرية.
- RLS وGRANT هما حاجز الحماية النهائي للعمليات السحابية المحمية.
- حفظ نتيجة الإتقان يمر عبر خدمة وRepository معتمدتين ثم `submit_mastery_attempt`؛ لا RPC مباشر من React.
- `submissionId` هو مفتاح idempotency لمسار الحفظ؛ إعادة الإرسال المسموحة تعيد النتيجة الرسمية نفسها دون تكرار السجل.
- الحساب المحلي والخادمي يخضعان لبوابة Parity دائمة؛ فروق IEEE-754 الدقيقة فقط تُسوّى بعتبة `1e-9` بعد تطابق أعداد الأسئلة والإجابات الصحيحة تطابقًا تامًا.

## قاعدة التغيير

أي تعديل لاحق على ترتيب المراحل أو عقود Auth أو معنى حفظ نتيجة الإتقان أو RPC أو RLS أو idempotency أو scoring parity يحتاج قرارًا مكتوبًا واختبارات مرتبطة به في الالتزام نفسه.

## قاعدة الحالة

لا تُعلَن أي دفعة مكتملة قبل وجود الملفات الفعلية والاختبارات والالتزام في Git. الوسم النهائي لا يُنشأ قبل نجاح أمر الإغلاق على الالتزام الذي سيحمله الوسم نفسه.

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

اكتملت Phase 2-D وظيفيًا ومعماريًا عبر D0 إلى D5-C1. نجح أمر الإغلاق الموحد
`npm run verify:mastery-results-closure` كاملًا عند الالتزام `f042ca9`، وأثبت:

```text
508 basic tests
89 Supabase integration tests
597 unique tests
Composition 2/2
Parity 10/10
```

Phase 2-D5-C2 هي دفعة التجميد التوثيقي النهائية. بعد تثبيت هذه الوثائق على Git
يُعاد تشغيل أمر الإغلاق على التزام C2 نفسه، ثم يُنشأ الوسم اليدوي
`v0.5-mastery-results-cloud-complete` على الالتزام المتحقق نفسه.

## خارطة الطريق المحدّثة

| المرحلة  | الهدف                                     | المخرجات                                                                | معيار القبول                                             | الحالة          |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- | --------------- |
| 0-A      | قرارات تأسيسية                            | وثيقة معتمدة                                                            | اعتماد كتابي                                             | مكتملة          |
| 0-B      | Project Skeleton                          | مشروع + مجلدات + أنواع + Theme + Docs                                   | build/lint/prettier ناجحة                                | مكتملة          |
| 1        | Local Prototype                           | تجربة طالب كاملة بمحتوى TypeScript محلي                                 | تصفح كامل من الصف إلى النتيجة                            | مكتملة          |
| 2-A      | Async Data Contract                       | ContentRepository غير متزامن + hooks مشتركة + ترحيل واجهات الطالب       | الاختبارات المحلية مستقلة عن الشبكة                      | مكتملة          |
| 2-B      | Supabase Content Data Layer               | Schema + RLS + Seed + Repository + Provider Selection                   | تكافؤ كامل بين local وSupabase                           | مكتملة          |
| 2-Freeze | Data Layer Freeze                         | توثيق المعمارية والخارطة + الوسم `v0.3-data-layer-complete`             | الوسم يشير إلى commit التجميد المعتمد                    | مكتملة          |
| 2-C0     | Auth & Authorization Architecture         | قرارات Supabase Auth + Profiles + Roles + Account Status + حدود RLS     | اعتماد الوثيقة المعمارية دون كود                         | مكتملة          |
| 2-C1     | Auth Client & Session Contract            | Auth types + service + session + sign-in/sign-up/sign-out + unit tests  | عقد Auth واختباراته ناجحة بلا Profiles أو UI             | مكتملة          |
| 2-C2     | Profiles + Roles + Authorization RLS      | Profiles + Trigger + AuthorizationState + RLS + اختبارات SQL وتكامل     | لا تصعيد ذاتي للصلاحيات ولا مستخدم يتيم                  | مكتملة          |
| 2-C3     | Login / Logout / Session UI               | واجهات Auth ورسائل الجلسة والتأكيد                                      | تجربة RTL واضحة بلا وميض واجهة محمية                     | مكتملة          |
| 2-C4     | Protected Operations + Access Guards      | عقد عمليات + محرك قرار + حراس React + اختبارات تجاوز الواجهة            | لا عملية محمية تعتمد على إخفاء الواجهة فقط               | مكتملة          |
| 2-C5     | Auth Integration Tests & Security Closure | دورة حياة Auth + تركيب حقيقي + فحص أسرار + توثيق تشغيل وتجميد           | الوسم `v0.4-auth-security-complete` على الالتزام المتحقق | مكتملة          |
| 2-D      | Cloud Persistence                         | حفظ نتائج الإتقان المرتبطة بالمستخدم عبر RPC وRLS مع retry وidempotency | مسار سحابي حقيقي + تكافؤ حسابي + أمر إغلاق موحد          | مكتملة / CLOSED |
| 3        | Teacher Dashboard                         | إضافة ومراجعة واعتماد المحتوى                                           | المعلم أو المراجع يعتمد درسًا كاملًا وفق الصلاحيات       | مخططة           |
| 4        | AI-assisted Authoring                     | توليد محتوى بمراجعة بشرية                                               | لا يصل أي محتوى مولّد إلى `approved` تلقائيًا            | مخططة           |
| 5        | Advanced Science Activities               | توسيع الألعاب والتجارب والمحاكاة والأنشطة العلمية                       | كل نشاط مرتبط بهدف تعلم وقابل للاختبار                   | مخططة           |
| 6        | Production Readiness                      | أمن، أداء، مراقبة أخطاء، نسخ احتياطي، نشر وتوثيق تشغيل                  | قائمة جاهزية إنتاج ناجحة                                 | مخططة           |
| 1.0      | الإطلاق الرسمي                            | نسخة مستقرة قابلة للاستخدام والتوسع                                     | قبول وظيفي وتشغيلي كامل                                  | الهدف النهائي   |

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
2-D5-C2  Final Documentation & Freeze                     🔄 final freeze candidate
```

الدليل التشغيلي لـD5-C1:

```text
commit f042ca9
npm run verify:mastery-results-closure → PASS
508/508 basic
89/89 Supabase integration
2/2 Composition
10/10 Parity
597 unique tests
Git clean
HEAD = origin/main
```

## قاعدة الإغلاق والتجميد لـPhase 2-D

أصبحت Phase 2-D `CLOSED` من ناحية التنفيذ والعقود والاختبارات بعد نجاح D5-C1.
تجميد نقطة `v0.5` لا يصبح نهائيًا إلا عند تحقق الشروط التالية على التزام D5-C2:

```text
npm run verify:mastery-results-closure passes on the final D5-C2 commit
working tree is clean
HEAD equals origin/main
tag v0.5-mastery-results-cloud-complete points to that exact commit locally
remote annotated tag dereference ^{} points to that exact commit on origin
```

لا ينشئ أمر الإغلاق الوسم ولا يدفعه تلقائيًا.

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

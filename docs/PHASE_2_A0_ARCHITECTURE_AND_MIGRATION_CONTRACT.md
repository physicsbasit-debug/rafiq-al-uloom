# PHASE_2_A0_ARCHITECTURE_AND_MIGRATION_CONTRACT

## Phase 2-A0: Architecture & Migration Contract

**Project:** رفيق العلوم  
**Status:** Architecture Contract — Pending Final Review  
**Implementation:** Not Started

---

## 1. Scope

تهدف Phase 2 إلى نقل التطبيق من مصدر بيانات محلي حتمي إلى بنية وصول غير متزامنة قابلة للتبديل، دون تغيير السلوك التربوي أو منطق الأعمال أو الهوية البصرية.

### المسموح

- تعريف عقد `ContentRepository` غير المتزامن.
- إنشاء `LocalContentRepository` غير متزامن.
- إنشاء طبقة `Content Query Hooks`.
- إضافة حالات `data / isLoading / error / reload`.
- إضافة آليات الإلغاء ومنع الطلبات القديمة.
- إضافة اختبارات التكافؤ والسباقات الزمنية.
- إضافة `SupabaseContentRepository` لاحقًا خلف العقد نفسه.
- إضافة طبقة Auth في المرحلة المخصصة لها.

### الممنوع

- تغيير Quiz Engine.
- تغيير Matching Game Engine.
- تغيير Mastery Engine.
- تغيير قواعد التصنيف أو الدرجات.
- تغيير Seed Content.
- تعديل الهوية البصرية ضمن دفعات Phase 2.
- استيراد Supabase مباشرة داخل `src/features`.
- دمج أكثر من طبقة معمارية كبيرة في دفعة واحدة.
- إدخال قرار Domain غير محسوم دون ADR مستقل.

---

## 2. Primary Architectural Rule

# Zero Unapproved Changes

لا يُقاس نجاح Phase 2 بعدد الأسطر التي لم تتغير، لأن التحول من عقد متزامن إلى عقد غير متزامن يفرض تغييرات بنيوية مشروعة.

المعيار المعتمد هو:

> **0 unapproved changes**

كل سطر متغير يجب أن يُصنَّف ضمن واحدة من الفئات المصرح بها:

1. Data Contract Change
2. Async Migration Change
3. Query Hook Change
4. Loading State Change
5. Error State Change
6. Empty State Change
7. Cancellation / Race Safety Change
8. Provider Adapter Change
9. Migration / Schema Change
10. Test Change
11. Auth / Permission Change داخل المرحلة المخصصة له
12. Documentation / ADR Change

أي تغيير خارج هذه الفئات يُرفض حتى لو نجح البناء والاختبارات.

### ADR Rule

أي قرار Domain لم يُحسم صراحة في هذه الوثيقة لا يجوز إدخاله داخل أي دفعة تنفيذية مباشرة.

يجب أن يسبقه ADR مستقل ومعتمد قبل التنفيذ.

ينطبق ذلك على سبيل المثال على:

- حالات المحتوى.
- قواعد الإتقان.
- صلاحيات المستخدمين.
- ملكية المحتوى.
- سياسات النشر.
- قواعد الألعاب.
- قواعد التصنيف.
- أي تغيير في المعاني التربوية أو السلوكية.

---

## 3. Layered Architecture

```text
Feature UI
    ↓
Content Query Hooks
    ↓
Async ContentRepository Contract
    ↓
LocalContentRepository | SupabaseContentRepository
```

### المبدأ

- `features` تعرف حالة البيانات فقط.
- Query Hooks تعرف دورة التحميل.
- Repository Contract يعرّف شكل الوصول.
- Providers تعرف مصدر البيانات.
- Supabase لا يظهر داخل `features`.

### ممنوع

```text
Feature
  ↓
Supabase Client مباشرة
```

ولا يُسمح لأي ملف داخل `src/features` باستيراد:

- Supabase client
- SQL
- PostgREST
- fetch خاص بالمزوّد
- تفاصيل RLS
- تفاصيل Schema

---

## 4. Async ContentRepository Contract

كل عمليات القراءة تصبح غير متزامنة وتقبل `AbortSignal` اختياريًا.

```ts
export interface RepositoryRequestOptions {
  signal?: AbortSignal;
}

export interface ContentRepository {
  getGrades(options?: RepositoryRequestOptions): Promise<Grade[]>;

  getSemestersByGrade(
    gradeId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Semester[]>;

  getSubjectsBySemester(
    semesterId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Subject[]>;

  getUnitsBySubjectAndSemester(
    subjectId: string,
    semesterId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Unit[]>;

  getUnitsBySubject(
    subjectId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Unit[]>;

  getLessonsByUnit(
    unitId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Lesson[]>;

  getLessonById(
    lessonId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Lesson | undefined>;

  getObjectivesByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Objective[]>;

  getExperimentsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Experiment[]>;

  getReviewQuestionsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Question[]>;

  getMasteryQuestionsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Question[]>;

  getObjectivesByIds(
    objectiveIds: string[],
    options?: RepositoryRequestOptions,
  ): Promise<Objective[]>;

  getGamesByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions,
  ): Promise<Game[]>;
}
```

### الدوال الثلاث عشرة الحالية

1. `getGrades`
2. `getSemestersByGrade`
3. `getSubjectsBySemester`
4. `getUnitsBySubjectAndSemester`
5. `getUnitsBySubject`
6. `getLessonsByUnit`
7. `getLessonById`
8. `getObjectivesByLesson`
9. `getExperimentsByLesson`
10. `getReviewQuestionsByLesson`
11. `getMasteryQuestionsByLesson`
12. `getObjectivesByIds`
13. `getGamesByLesson`

لا يجوز إسقاط أي دالة أثناء Phase 2-A1 دون ADR أو قرار صريح.

---

## 5. Provider Contract

كل Provider يجب أن:

- يطبق `ContentRepository`.
- يفحص `AbortSignal` قبل بدء العمل.
- يفحصه بعد كل نقطة `await`.
- يفحصه قبل إرجاع النتيجة إذا ظل Provider مالكًا لتدفق التنفيذ.
- يعيد نفس أنواع البيانات التي يعيدها المزود المحلي الحالي.
- لا يستورد React.
- لا يعرف Query Hooks.
- لا يعرف مكونات UI.

النمط العام:

```ts
async function getLessonById(
  lessonId: string,
  options?: RepositoryRequestOptions,
): Promise<Lesson | undefined> {
  const { signal } = options ?? {};

  signal?.throwIfAborted();

  const lesson = await loadLesson(lessonId, signal);

  signal?.throwIfAborted();

  return lesson;
}
```

---

## 6. Query Hook Contract

كل Query Hook يعيد العقد الموحد نفسه:

```ts
export interface QueryState<T> {
  data: T;
  isLoading: boolean;
  error: ContentQueryError | null;
  reload: () => void;
}
```

### Hooks متوقعة

- `useGrades`
- `useSemestersByGrade`
- `useSubjectsBySemester`
- `useUnitsBySubjectAndSemester`
- `useUnitsBySubject`
- `useLessonsByUnit`
- `useLesson`
- `useLessonObjectives`
- `useLessonExperiments`
- `useReviewQuestions`
- `useMasteryQuestions`
- `useObjectivesByIds`
- `useGamesByLesson`

### الممنوع

- إرجاع شكل مختلف لكل Hook.
- كشف Supabase error objects مباشرة.
- استيراد Supabase داخل Hook.
- كتابة `useEffect/useState` مكرر داخل كل Feature بدل الطبقة الموحدة.
- استدعاء Repository مباشرة داخل JSX.

---

## 7. Async Migration Rule

المثال الحالي:

```tsx
<LessonObjectives objectives={getObjectivesByLesson(lesson.id)} />
```

لا يبقى صالحًا بعد جعل العقد غير متزامنًا.

الاستهلاك الجديد يمر عبر Hook قبل العرض:

```tsx
const objectivesQuery = useLessonObjectives(lesson.id);
```

ثم تستخدم الواجهة:

```text
data
isLoading
error
reload
```

الواجهة تعرف أن البيانات غير متزامنة، لكنها لا تعرف مصدرها.

---

## 8. Stale Request, Cancellation, and Unmount Safety Contract

كل Query غير متزامن يجب أن يحمي الحالة من:

- stale success
- stale failure
- stale empty result
- stale loading state
- updates after unmount
- rapid identifier changes

يجب استخدام حارسين معًا:

### 8.1 AbortController

- يُلغى الطلب السابق عند تغير المعرف.
- يُلغى الطلب الحالي عند unmount.
- Providers تتلقى `AbortSignal`.
- test doubles المؤجلة تتفاعل مع حدث `abort`.

### 8.2 Monotonic Request Version Guard

- كل طلب جديد يحصل على رقم متزايد.
- آخر طلب بدأ هو الوحيد المسموح له بتحديث `data / error / isLoading / empty state`.
- الحارس يطبق على النجاح والفشل والحالة الفارغة.
- أي طلب قديم لا يملك حق تحديث الحالة حتى لو تجاهل الإلغاء.

---

## 9. `raceWithAbort` Reference Implementation

هذا هو النص المرجعي المعتمد:

```ts
export function raceWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;

  signal.throwIfAborted();

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(signal.reason);
    };

    signal.addEventListener('abort', handleAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);

        // لا نستدعي throwIfAborted هنا.
        // إذا وقع الإلغاء سابقًا، فقد استقر الوعد الخارجي بالرفض بالفعل،
        // وأي resolve لاحق لن يغيّر حالته.
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}
```

### Abort Race Implementation Note

يمنع استدعاء `AbortSignal.throwIfAborted()` داخل fulfillment callback بعد أن يكون مستمع الإلغاء قد رفض الوعد الخارجي.

السبب:

1. يحدث الإلغاء.
2. يستقر الوعد الخارجي بالرفض.
3. يكتمل الوعد الأصلي لاحقًا.
4. يدخل fulfillment callback.
5. `throwIfAborted()` يرمي خطأً داخل callback.
6. الوعد الضمني الناتج من `.then()` قد يصبح رفضًا غير معالج.

أما `resolve(value)` بعد استقرار الوعد الخارجي فلا يغير حالته لأن Promise تستقر مرة واحدة فقط.

---

## 10. Required Deterministic Race Tests

كل الاختبارات تستخدم Deferred Promises يدوية، لا مؤقتات حقيقية.

### 10.1 Older success after newer success

- يبدأ A ويتأخر.
- يبدأ B وينجح.
- يصل A لاحقًا.
- تبقى بيانات B.

### 10.2 Older failure after newer success

- يبدأ A ويتأخر ثم يفشل.
- ينجح B.
- خطأ A لا يستبدل بيانات B.

### 10.3 Older success after newer failure

- يبدأ A ويتأخر.
- يفشل B.
- نجاح A لا يستبدل خطأ B.

### 10.4 Rapid A → B → C with mixed outcomes

يجب اختبار خليط من النجاح والفشل في A وB.

```text
A succeeds late
B fails late
C succeeds first
Final state = C data, no error
```

```text
A fails late
B succeeds late
C succeeds first
Final state = C data, no error
```

```text
A succeeds late
B succeeds late
C fails first
Final state = C error, no stale data
```

### 10.5 Unmount safety

- يبدأ الطلب.
- يحدث unmount.
- يحل أو يرفض Deferred Promise بعد unmount.
- لا يتغير Query State.
- لا يظهر unhandled rejection.
- لا يظهر `console.error` أو `console.warn` غير متوقع.

لا يعتمد الاختبار على رسالة تحذير React بعينها.

### 10.6 Abort during deferred work

- يبدأ Provider.
- يحدث abort قبل حل Deferred Promise.
- يُلتقط رفض الوعد الخارجي.
- ينجح أو يفشل الوعد الأصلي لاحقًا.
- لا يظهر `unhandledRejection`.
- لا تُنشر النتيجة.

### 10.7 Listener cleanup

كل اختبار يضيف مستمعًا أو Spy يجب أن ينظفه بعد التنفيذ.

مرجع Vitest:

```ts
let unhandledRejectionHandler: (reason: unknown) => void;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  unhandledRejectionHandler = (reason: unknown) => {
    throw reason;
  };

  process.on('unhandledRejection', unhandledRejectionHandler);

  consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      throw new Error(`Unexpected console.error: ${String(args[0])}`);
    });

  consoleWarnSpy = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args: unknown[]) => {
      throw new Error(`Unexpected console.warn: ${String(args[0])}`);
    });
});

afterEach(() => {
  process.removeListener(
    'unhandledRejection',
    unhandledRejectionHandler,
  );

  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});
```

يُسمح بتعديل الشكل التقني بما يلائم Vitest الفعلي، لكن لا يجوز حذف التنظيف أو مراقبة التحذيرات والرفض غير المعالج.

---

## 11. Deferred Promise Test Utility

```ts
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];

  const promise = new Promise<T>((internalResolve, internalReject) => {
    resolve = internalResolve;
    reject = internalReject;
  });

  return { promise, resolve, reject };
}
```

لا تستخدم `setTimeout` لاختبارات السباق الأساسية.

---

## 12. Content Lifecycle and Ownership

الحالة الفعلية الحالية في الكود هي:

```ts
type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'approved';
```

لا تُغيَّر هذه الحالات داخل Phase 2-A0 أو Phase 2-A1.

أي اقتراح لتغييرها إلى حالات مثل `reviewed / published / archived` يتطلب ADR مستقلًا ومعتمدًا قبل التنفيذ.

### الملكية

تفاصيل ملكية المحتوى لم تُحسم نهائيًا في هذه الوثيقة.

أي قرار حول من ينشئ المحتوى أو يراجعه أو يعتمده أو ينشره أو يؤرشفه يحتاج ADR مستقل قبل أول Migration يتضمن أعمدة ملكية أو سياسات نشر.

---

## 13. Authentication and Permissions

تصميم Auth مؤجل عمدًا إلى:

```text
Phase 2-C: Authentication
```

Phase 2-A0 تحدد فقط حدود طبقة البيانات والاستعلام.

قبل Phase 2-C يجب إصدار وثيقة أو ADR يحسم:

- أنواع المستخدمين.
- الطالب.
- المعلم.
- المراجع.
- المدير.
- الجلسة المجهولة إن وُجدت.
- الصلاحيات.
- ملكية النتائج.
- الوصول إلى المحتوى غير المعتمد.

لا يجوز افتراض هذه الأدوار داخل Schema أو RLS قبل اعتمادها.

---

## 14. Initial Supabase Domain Areas

المجالات الأولية المتوقعة:

- users
- grades
- semesters
- subjects
- units
- lessons
- objectives
- questions
- matching_games
- experiments
- mastery_results

هذه قائمة Domains أولية وليست Schema نهائيًا.

تفاصيل الأعمدة والمفاتيح والقيود والعلاقات والفهارس وmigrations مؤجلة عمدًا إلى:

```text
Phase 2-B: Supabase Schema Design and Provider
```

ولا يجوز إنشاء Migration فعلي قبل اعتماد مخطط Schema منفصل.

---

## 15. Row Level Security

كل وصول إلى Supabase يجب أن يمر عبر RLS.

لكن سياسات RLS نفسها لا تُكتب قبل حسم:

- Auth roles.
- Content ownership.
- Content lifecycle.
- Public/private visibility.
- Mastery result ownership.

لذلك تفاصيل RLS مؤجلة إلى Phase 2-B وPhase 2-C حسب نوع السياسة.

`features` لا تعرف تفاصيل RLS.

---

## 16. Migration Roadmap

### Phase 2-A0

Architecture & Migration Contract

- وثائق فقط.
- لا كود إنتاجي.
- لا Schema فعلي.
- لا Supabase client.

### Phase 2-A1

Async Local Repository Foundation

- تعريف `ContentRepository`.
- تحويل الدوال الثلاث عشرة إلى async.
- دعم `AbortSignal`.
- تطبيق Local Provider.
- اختبارات تكافؤ.
- اختبارات `raceWithAbort` المناسبة لطبقة A1 فقط.
- حالات 10.4 و10.5 و`request-version guard` مؤجلة صراحة إلى Phase 2-A2؛
  لأنها تتطلب Query Hooks فعلية ودورة حياة React غير موجودة في A1.
- لا تعديل Features.
- لا Supabase.

### Phase 2-A2

Content Query Hooks Foundation

- العقد الموحد.
- loading/error/empty/reload.
- cancellation.
- request-version guard.
- اختبارات السباقات الستة.
- local async provider فقط.

### Phase 2-A3

Feature Migration

1. Navigation
2. Lesson
3. Review
4. Matching
5. Mastery

كل دفعة تستخدم Local Async Provider أولًا.

### Phase 2-B

Supabase Schema Design and Provider

- Schema مستقل معتمد.
- migrations.
- Supabase provider.
- اختبارات تكافؤ Local/Supabase.
- RLS المرتبط بالقراءة العامة حيث يمكن حسمه.

### Phase 2-C

Authentication and Permissions

- Auth.
- roles.
- sessions.
- protected access.
- permission-aware RLS.

### Phase 2-D

Cloud Persistence

- mastery result persistence.
- user-linked progress.
- recovery and retry.
- audit and operational policies إذا اعتمدت.

---

## 17. Rollback Contract

كل دفعة يجب أن:

- تكون قابلة للتراجع منفردة.
- لا تجمع أكثر من طبقة معمارية كبيرة.
- تحافظ على المزود المحلي كمسار رجوع حتى اعتماد Supabase.
- توثق الملفات المتأثرة.
- تملك بوابة قبول مستقلة.
- لا تحذف التطبيق المحلي قبل إثبات التكافؤ.

---

## 18. Acceptance Gates

قبل إغلاق أي دفعة:

- Build ناجح.
- Lint ناجح.
- Tests ناجحة.
- Prettier ناجح.
- Git status نظيف.
- `0 unapproved changes`.
- جميع اختبارات السباق المطلوبة ناجحة عند انطباقها.
- لا Supabase import داخل `features`.
- لا تغيير بصري غير مصرح به.
- لا تغيير Domain بلا ADR.
- rollback path موثق.

---

## 19. Deferred Decisions Register

1. **Auth Architecture**
   - مؤجل إلى Phase 2-C.

2. **Supabase Detailed Schema**
   - مؤجل إلى Phase 2-B.

3. **Content Lifecycle Changes**
   - الحالات الحالية تبقى `draft / pending_review / approved`.
   - أي تغيير يحتاج ADR.

4. **Content Ownership**
   - يحتاج ADR قبل أي أعمدة ملكية أو سياسات نشر.

5. **Domain Decisions**
   - أي قرار Domain غير محسوم يحتاج ADR مستقل قبل التنفيذ.

6. **RLS Details**
   - مؤجلة حتى حسم Auth وOwnership وLifecycle.

7. **Supabase Provider Activation**
   - لا يُفعّل قبل نجاح Local Async Provider وQuery Hooks وترحيل Features.

---

## 20. Phase 2 Golden Rules

> Features لا تعرف مصدر البيانات.

> Repository Contract لا يعرف الواجهة.

> Provider لا يعرف React.

> Query Hooks لا تكشف تفاصيل المزوّد.

> تغيير المصدر لا يغيّر السلوك التربوي.

> أي قرار Domain غير محسوم يحتاج ADR قبل التنفيذ.

> آخر طلب بدأ هو الوحيد المسموح له بتحديث الحالة.

> لا يبدأ Supabase قبل إثبات async local path واختبارات السباق.

---

## 21. Document Finalization Gate

لا تعتبر هذه الوثيقة نهائية حتى:

- يراجع كود `raceWithAbort` حرفيًا.
- يراجع كود listener cleanup حرفيًا.
- تُراجع الدوال الثلاث عشرة بندًا بندًا.
- تُراجع فقرات التأجيل: Auth وSchema وContent Lifecycle وOwnership وRLS.
- تُعتمد قاعدة ADR العامة.
- تُحفظ الوثيقة داخل المستودع.

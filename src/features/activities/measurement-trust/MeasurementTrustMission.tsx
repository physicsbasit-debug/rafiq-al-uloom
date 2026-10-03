import { useMemo, useState } from 'react';

import { ScientificText } from '@design-system/components/ScientificText';
import { StudentIcon } from '@features/student/navigation/StudentIcon';

type ActivityKey = 'inquiry' | 'simulation' | 'data';

type CompletionState = Record<ActivityKey, boolean>;

const ACTIVITY_VISUAL_BASE = '/lesson-visuals/activities/g9-importance-measurement';

const DATA_ROWS = [
  { id: 'a', label: 'الجسم أ', original: '25 cm', meters: 0.25 },
  { id: 'b', label: 'الجسم ب', original: '0.40 m', meters: 0.4 },
  { id: 'c', label: 'الجسم ج', original: '320 mm', meters: 0.32 },
  { id: 'd', label: 'الجسم د', original: '0.8 m', meters: 0.8 },
] as const;

const CORRECT_SORT_ORDER = ['a', 'c', 'b', 'd'] as const;

const INQUIRY_EVIDENCE = [
  {
    id: 'resolution',
    label: 'وضوح القراءة بالنسبة لتدرّج الأداة',
    useful: true,
  },
  {
    id: 'repeatability',
    label: 'هل يمكن تكرار الطريقة والحصول على نتيجة متقاربة؟',
    useful: true,
  },
  {
    id: 'color',
    label: 'لون الورق المستخدم في القياس',
    useful: false,
  },
] as const;

function isNearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.001;
}

function parseNumber(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function ActivityBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="rafiq-science-back" onClick={onClick}>
      <StudentIcon name="chevron-right" width="20" height="20" />
      العودة إلى الأنشطة العلمية
    </button>
  );
}

function InquiryActivity({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);

  const usefulEvidenceSelected = INQUIRY_EVIDENCE.filter((item) => item.useful).every((item) =>
    selectedEvidence.includes(item.id)
  );
  const irrelevantSelected = selectedEvidence.some(
    (id) => INQUIRY_EVIDENCE.find((item) => item.id === id)?.useful === false
  );

  function toggleEvidence(id: string) {
    if (checked) return;
    setSelectedEvidence((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function checkEvidence() {
    setChecked(true);
  }

  function resetEvidence() {
    setSelectedEvidence([]);
    setChecked(false);
  }

  function formConclusion() {
    setCompleted(true);
    onComplete();
  }

  return (
    <section className="rafiq-science-activity-view">
      <ActivityBackButton onClick={onBack} />

      <header className="rafiq-science-activity-header is-inquiry">
        <span className="rafiq-science-activity-header-icon" aria-hidden="true">
          <StudentIcon name="inquiry" width="34" height="34" />
        </span>
        <div>
          <p>الاستقصاء العلمي</p>
          <h2>أي طريقة تجعل القياس أكثر موثوقية؟</h2>
          <span>لاحظ الموقف، حدّد الدليل المفيد، ثم ابنِ استنتاجك.</span>
        </div>
      </header>

      <ol className="rafiq-inquiry-steps" aria-label="خطوات الاستقصاء">
        <li className="is-active">لاحظ</li>
        <li>اختر ما ستفحصه</li>
        <li>قارن الأدلة</li>
        <li>استنتج</li>
      </ol>

      <article className="rafiq-science-task-card">
        <div className="rafiq-science-task-copy">
          <p>الموقف</p>
          <h3>قياس جسم رقيق جدًا</h3>
          <span>
            يحاول طالبان تحديد سمك ورقة رقيقة باستخدام مسطرة مدرسية. أحدهما يقيس ورقة واحدة،
            والآخر يقيس رزمة من الأوراق ثم يقسم القياس على عددها.
          </span>
        </div>

        <img
          src={`${ACTIVITY_VISUAL_BASE}/inquiry-paper-measurement.svg`}
          alt="رزمة أوراق ومسطرة وأدوات قياس دون إظهار الطريقة الصحيحة"
        />

        <div className="rafiq-inquiry-question">
          <strong>ما الأدلة التي يجب فحصها قبل الحكم على الطريقة الأفضل؟</strong>
          <span>اختر الأدلة المرتبطة بجودة القياس. يمكنك اختيار أكثر من دليل.</span>
        </div>

        <div className="rafiq-inquiry-evidence-grid">
          {INQUIRY_EVIDENCE.map((item) => {
            const selected = selectedEvidence.includes(item.id);
            const stateClass = checked
              ? item.useful && selected
                ? ' is-correct'
                : !item.useful && selected
                  ? ' is-wrong'
                  : ''
              : selected
                ? ' is-selected'
                : '';

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                className={`rafiq-inquiry-evidence${stateClass}`}
                onClick={() => toggleEvidence(item.id)}
              >
                <span aria-hidden="true">{selected ? '✓' : '○'}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {!checked ? (
          <button
            type="button"
            className="rafiq-science-primary"
            disabled={selectedEvidence.length === 0}
            onClick={checkEvidence}
          >
            قارن الأدلة
          </button>
        ) : null}

        {checked && (!usefulEvidenceSelected || irrelevantSelected) ? (
          <div className="rafiq-science-feedback is-review" role="status">
            <strong>راجع نوع الدليل</strong>
            <span>
              الدليل العلمي هنا يجب أن يساعدك في الحكم على جودة القياس وإمكانية تكراره، لا على
              صفات لا تغيّر القياس مثل لون الورق.
            </span>
            <button type="button" onClick={resetEvidence}>
              أعد اختيار الأدلة
            </button>
          </div>
        ) : null}

        {checked && usefulEvidenceSelected && !irrelevantSelected && !completed ? (
          <div className="rafiq-inquiry-comparison" role="status">
            <div>
              <strong>قياس ورقة واحدة</strong>
              <span>سمك الورقة قريب جدًا من أصغر تدريجات المسطرة، فتكون القراءة أصعب.</span>
            </div>
            <div>
              <strong>قياس رزمة ثم القسمة</strong>
              <span>السمك الكلي يصبح أوضح على التدريج، ثم يُحسب سمك الورقة الواحدة.</span>
            </div>
            <button type="button" className="rafiq-science-primary" onClick={formConclusion}>
              كوّن الاستنتاج العلمي
            </button>
          </div>
        ) : null}

        {completed ? (
          <div className="rafiq-science-feedback is-success" role="status">
            <strong>استنتاجك العلمي</strong>
            <span>
              الطريقة الأكثر موثوقية هي التي تجعل القراءة أوضح ويمكن تكرارها ومقارنتها. عندما
              يكون الجسم رقيقًا جدًا قد يساعد القياس غير المباشر في تقليل أثر محدودية تدريج
              الأداة.
            </span>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function SimulationActivity({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [timingErrorNs, setTimingErrorNs] = useState(0);
  const [hasExplored, setHasExplored] = useState(false);
  const [savedObservation, setSavedObservation] = useState(false);

  const positionErrorM = timingErrorNs * 0.299792458;
  const markerOffset = Math.min(96, timingErrorNs * 0.9);

  function updateTimingError(value: number) {
    setTimingErrorNs(value);
    if (value > 0) setHasExplored(true);
  }

  function saveObservation() {
    setSavedObservation(true);
    onComplete();
  }

  return (
    <section className="rafiq-science-activity-view">
      <ActivityBackButton onClick={onBack} />

      <header className="rafiq-science-activity-header is-simulation">
        <span className="rafiq-science-activity-header-icon" aria-hidden="true">
          <StudentIcon name="simulation" width="34" height="34" />
        </span>
        <div>
          <p>المحاكاة</p>
          <h2>كيف يؤثر خطأ الزمن في تحديد الموقع؟</h2>
          <span>غيّر مقدار الخطأ ولاحظ أثره مباشرة على الموقع المحسوب.</span>
        </div>
      </header>

      <article className="rafiq-science-task-card">
        <div className="rafiq-gps-simulation-scene">
          <img
            src={`${ACTIVITY_VISUAL_BASE}/gps-timing-simulation.svg`}
            alt="مشهد تعليمي لقمر صناعي وخريطة موقع دون قيم أو إجابات مكتوبة"
          />
          <span className="rafiq-gps-marker is-true" aria-label="الموقع الحقيقي" />
          <span
            className="rafiq-gps-marker is-calculated"
            aria-label="الموقع المحسوب"
            style={{ transform: `translateX(${-markerOffset}px)` }}
          />
        </div>

        <div className="rafiq-gps-control-panel">
          <div>
            <span>خطأ قياس الزمن</span>
            <strong>
              <ScientificText text={`${timingErrorNs} ns`} />
            </strong>
          </div>
          <label>
            <span className="sr-only">غيّر خطأ قياس الزمن</span>
            <input
              aria-label="خطأ قياس الزمن بالنانوثانية"
              type="range"
              min="0"
              max="100"
              step="10"
              value={timingErrorNs}
              onChange={(event) => updateTimingError(Number(event.target.value))}
            />
          </label>
          <div>
            <span>الانزياح التقريبي في الموقع</span>
            <strong>
              <ScientificText text={`${positionErrorM.toFixed(1)} m`} />
            </strong>
          </div>
        </div>

        <p className="rafiq-science-note">
          تقريب تعليمي باستخدام سرعة الضوء: كل <ScientificText text="1 ns" /> من خطأ زمن وصول
          الإشارة يقابل نحو <ScientificText text="0.30 m" /> من خطأ المسافة.
        </p>

        {hasExplored && !savedObservation ? (
          <button type="button" className="rafiq-science-primary" onClick={saveObservation}>
            سجّل ملاحظتي
          </button>
        ) : null}

        {savedObservation ? (
          <div className="rafiq-science-feedback is-success" role="status">
            <strong>ملاحظة صحيحة من المحاكاة</strong>
            <span>كلما زاد خطأ قياس الزمن، زاد انزياح الموقع المحسوب عن الموقع الحقيقي.</span>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function DataActivity({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [conversions, setConversions] = useState<Record<string, string>>({});
  const [conversionChecked, setConversionChecked] = useState(false);
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [sortChecked, setSortChecked] = useState(false);
  const [closestId, setClosestId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const conversionsCorrect = useMemo(
    () =>
      DATA_ROWS.every((row) => isNearlyEqual(parseNumber(conversions[row.id] ?? ''), row.meters)),
    [conversions]
  );

  const sortCorrect = useMemo(
    () =>
      sortOrder.length === CORRECT_SORT_ORDER.length &&
      sortOrder.every((id, index) => id === CORRECT_SORT_ORDER[index]),
    [sortOrder]
  );

  function checkConversions() {
    setConversionChecked(true);
  }

  function resetConversions() {
    setConversionChecked(false);
  }

  function chooseSort(id: string) {
    if (!conversionsCorrect || sortChecked || sortOrder.includes(id)) return;
    setSortOrder((current) => [...current, id]);
  }

  function resetSort() {
    setSortOrder([]);
    setSortChecked(false);
  }

  function chooseClosest(id: string) {
    if (!sortCorrect || completed) return;
    setClosestId(id);
    if (id === 'c') {
      setCompleted(true);
      onComplete();
    }
  }

  return (
    <section className="rafiq-science-activity-view">
      <ActivityBackButton onClick={onBack} />

      <header className="rafiq-science-activity-header is-data">
        <span className="rafiq-science-activity-header-icon" aria-hidden="true">
          <StudentIcon name="data" width="34" height="34" />
        </span>
        <div>
          <p>نشاط البيانات</p>
          <h2>وحّد القياسات ثم استخرج النتيجة</h2>
          <span>اقرأ الجدول، حوّل الوحدات، رتّب القيم، ثم اتخذ قرارًا من البيانات.</span>
        </div>
      </header>

      <article className="rafiq-science-task-card">
        <img
          src={`${ACTIVITY_VISUAL_BASE}/measurement-data-notebook.svg`}
          alt="دفتر قياسات وأدوات تسجيل بيانات دون حلول أو قيم نهائية"
        />

        <div className="rafiq-data-table-wrap">
          <table className="rafiq-data-table">
            <thead>
              <tr>
                <th>الجسم</th>
                <th>القياس الأصلي</th>
                <th>بالأمتار</th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROWS.map((row) => {
                const entered = parseNumber(conversions[row.id] ?? '');
                const rowCorrect = conversionChecked && isNearlyEqual(entered, row.meters);
                const rowWrong = conversionChecked && !Number.isNaN(entered) && !rowCorrect;

                return (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td>
                      <ScientificText text={row.original} />
                    </td>
                    <td>
                      <label className="rafiq-data-input-wrap">
                        <span className="sr-only">حوّل {row.label} إلى المتر</span>
                        <input
                          aria-label={`قيمة ${row.label} بالمتر`}
                          inputMode="decimal"
                          value={conversions[row.id] ?? ''}
                          className={rowCorrect ? 'is-correct' : rowWrong ? 'is-wrong' : ''}
                          disabled={conversionChecked && conversionsCorrect}
                          onChange={(event) =>
                            setConversions((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                        />
                        <ScientificText text="m" />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!conversionChecked || !conversionsCorrect ? (
          <button
            type="button"
            className="rafiq-science-primary"
            disabled={DATA_ROWS.some((row) => !(conversions[row.id] ?? '').trim())}
            onClick={checkConversions}
          >
            تحقق من التحويلات
          </button>
        ) : null}

        {conversionChecked && !conversionsCorrect ? (
          <div className="rafiq-science-feedback is-review" role="status">
            <strong>بعض التحويلات تحتاج مراجعة</strong>
            <span>وحّد كل قيمة إلى المتر أولًا، ثم أعد التحقق.</span>
            <button type="button" onClick={resetConversions}>
              عدّل القيم
            </button>
          </div>
        ) : null}

        {conversionChecked && conversionsCorrect ? (
          <div className="rafiq-data-sort-stage">
            <strong>الخطوة 2: رتّب الأجسام من الأقصر إلى الأطول</strong>
            <span>اضغط على الأجسام بالترتيب الصحيح.</span>
            <div className="rafiq-data-sort-buttons">
              {DATA_ROWS.map((row) => {
                const selectedIndex = sortOrder.indexOf(row.id);
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={sortChecked || selectedIndex !== -1}
                    className={selectedIndex !== -1 ? 'is-selected' : ''}
                    onClick={() => chooseSort(row.id)}
                  >
                    {selectedIndex !== -1 ? <bdi dir="ltr">{selectedIndex + 1}</bdi> : null}
                    {row.label}
                  </button>
                );
              })}
            </div>
            {sortOrder.length === DATA_ROWS.length && !sortChecked ? (
              <button type="button" className="rafiq-science-primary" onClick={() => setSortChecked(true)}>
                تحقق من الترتيب
              </button>
            ) : null}
          </div>
        ) : null}

        {sortChecked && !sortCorrect ? (
          <div className="rafiq-science-feedback is-review" role="status">
            <strong>الترتيب غير صحيح بعد</strong>
            <span>استخدم القيم التي وحّدتها إلى المتر بدل مقارنة الأرقام بوحداتها الأصلية.</span>
            <button type="button" onClick={resetSort}>
              أعد الترتيب
            </button>
          </div>
        ) : null}

        {sortChecked && sortCorrect && !completed ? (
          <div className="rafiq-data-decision-stage">
            <strong>
              الخطوة 3: أي جسم طوله أقرب إلى <ScientificText text="0.30 m" />؟
            </strong>
            <div>
              {DATA_ROWS.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={closestId === row.id ? (row.id === 'c' ? 'is-correct' : 'is-wrong') : ''}
                  onClick={() => chooseClosest(row.id)}
                >
                  {row.label}
                </button>
              ))}
            </div>
            {closestId && closestId !== 'c' ? (
              <span role="status">قارن الفروق بين القيم بعد توحيدها إلى المتر.</span>
            ) : null}
          </div>
        ) : null}

        {completed ? (
          <div className="rafiq-science-feedback is-success" role="status">
            <strong>استخدمت البيانات بصورة صحيحة</strong>
            <span>
              حولت الوحدات إلى أساس مشترك، ورتبت القيم، ثم استخرجت أن{' '}
              <ScientificText text="0.32 m" /> هي الأقرب إلى <ScientificText text="0.30 m" />.
            </span>
          </div>
        ) : null}
      </article>
    </section>
  );
}

export function MeasurementTrustMission() {
  const [activeActivity, setActiveActivity] = useState<ActivityKey | null>(null);
  const [completed, setCompleted] = useState<CompletionState>({
    inquiry: false,
    simulation: false,
    data: false,
  });

  function markComplete(activity: ActivityKey) {
    setCompleted((current) => ({ ...current, [activity]: true }));
  }

  if (activeActivity === 'inquiry') {
    return (
      <InquiryActivity
        onComplete={() => markComplete('inquiry')}
        onBack={() => setActiveActivity(null)}
      />
    );
  }

  if (activeActivity === 'simulation') {
    return (
      <SimulationActivity
        onComplete={() => markComplete('simulation')}
        onBack={() => setActiveActivity(null)}
      />
    );
  }

  if (activeActivity === 'data') {
    return (
      <DataActivity onComplete={() => markComplete('data')} onBack={() => setActiveActivity(null)} />
    );
  }

  const availableCompleted = Object.values(completed).filter(Boolean).length;

  return (
    <section className="rafiq-science-hub">
      <header className="rafiq-learning-hub-hero rafiq-science-hub-hero">
        <span className="rafiq-learning-hub-hero-icon" aria-hidden="true">
          <StudentIcon name="activities" width="34" height="34" />
        </span>
        <div>
          <p>طبّق المفهوم بنفسك</p>
          <h2>الأنشطة العلمية</h2>
          <span>اختر نشاطًا يناسب طبيعة هذا الدرس. لا نعرض نشاطًا لا يدعمه المحتوى.</span>
        </div>
      </header>

      <div className="rafiq-science-hub-summary" aria-label="تقدم الأنشطة العلمية">
        <strong>
          <bdi dir="ltr">{availableCompleted}/3</bdi>
        </strong>
        <span>أنشطة متاحة أُنجزت</span>
      </div>

      <div className="rafiq-science-card-grid">
        <article className="rafiq-science-card is-inquiry">
          <div className="rafiq-science-card-visual">
            <img
              src={`${ACTIVITY_VISUAL_BASE}/inquiry-paper-measurement.svg`}
              alt="أوراق ومسطرة في موقف يحتاج إلى فحص طريقة القياس"
            />
          </div>
          <div className="rafiq-science-card-head">
            <span aria-hidden="true">
              <StudentIcon name="inquiry" width="27" height="27" />
            </span>
            <div>
              <h3>الاستقصاء العلمي</h3>
              <p>افحص الأدلة وابنِ استنتاجك.</p>
            </div>
          </div>
          <div className="rafiq-science-availability is-available">
            <span aria-hidden="true">✓</span>
            {completed.inquiry ? 'مكتمل' : 'متوفر'}
          </div>
          <button type="button" onClick={() => setActiveActivity('inquiry')}>
            {completed.inquiry ? 'أعد الاستقصاء' : 'ابدأ الاستقصاء'}
            <StudentIcon name="chevron-left" width="20" height="20" />
          </button>
        </article>

        <article className="rafiq-science-card is-simulation">
          <div className="rafiq-science-card-visual">
            <img
              src={`${ACTIVITY_VISUAL_BASE}/gps-timing-simulation.svg`}
              alt="قمر صناعي ومشهد خريطة يمهد لمحاكاة أثر خطأ الزمن"
            />
          </div>
          <div className="rafiq-science-card-head">
            <span aria-hidden="true">
              <StudentIcon name="simulation" width="27" height="27" />
            </span>
            <div>
              <h3>المحاكاة</h3>
              <p>غيّر المتغير ولاحظ أثره مباشرة.</p>
            </div>
          </div>
          <div className="rafiq-science-availability is-available">
            <span aria-hidden="true">✓</span>
            {completed.simulation ? 'مكتمل' : 'متوفر'}
          </div>
          <button type="button" onClick={() => setActiveActivity('simulation')}>
            {completed.simulation ? 'أعد المحاكاة' : 'ابدأ المحاكاة'}
            <StudentIcon name="chevron-left" width="20" height="20" />
          </button>
        </article>

        <article className="rafiq-science-card is-data">
          <div className="rafiq-science-card-visual">
            <img
              src={`${ACTIVITY_VISUAL_BASE}/measurement-data-notebook.svg`}
              alt="دفتر قياسات وأدوات تسجيل تمهد لتحليل بيانات القياس"
            />
          </div>
          <div className="rafiq-science-card-head">
            <span aria-hidden="true">
              <StudentIcon name="data" width="27" height="27" />
            </span>
            <div>
              <h3>نشاط البيانات</h3>
              <p>اقرأ البيانات وحلّلها واستخرج النتيجة.</p>
            </div>
          </div>
          <div className="rafiq-science-availability is-available">
            <span aria-hidden="true">✓</span>
            {completed.data ? 'مكتمل' : 'متوفر'}
          </div>
          <button type="button" onClick={() => setActiveActivity('data')}>
            {completed.data ? 'أعد نشاط البيانات' : 'ابدأ نشاط البيانات'}
            <StudentIcon name="chevron-left" width="20" height="20" />
          </button>
        </article>

        <article className="rafiq-science-card is-unavailable" aria-disabled="true">
          <div className="rafiq-science-card-visual">
            <img
              src={`${ACTIVITY_VISUAL_BASE}/guided-experiment-unavailable.svg`}
              alt="أدوات تجربة مخبرية باهتة للدلالة على أن التجربة غير متوفرة في هذا الدرس"
            />
          </div>
          <div className="rafiq-science-card-head">
            <span aria-hidden="true">
              <StudentIcon name="experiment" width="27" height="27" />
            </span>
            <div>
              <h3>التجربة الموجهة</h3>
              <p>نفّذ خطوات تجربة أو قياس وسجّل النتائج.</p>
            </div>
          </div>
          <div className="rafiq-science-availability is-unavailable">
            <span aria-hidden="true">−</span>
            غير متوفر في هذا الدرس
          </div>
          <p className="rafiq-science-unavailable-note">
            هذا الدرس لا يتضمن تجربة عملية مستقلة. ستظهر التجربة في الدروس التي تتطلب قياسًا
            عمليًا مناسبًا.
          </p>
        </article>
      </div>
    </section>
  );
}

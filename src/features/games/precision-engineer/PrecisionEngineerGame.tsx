import { useMemo, useState } from 'react';
import { ScientificText } from '@design-system/components/ScientificText';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import './PrecisionEngineerGame.css';

type StepKey = 'tool' | 'method' | 'reading' | 'unit';
type MissionId = 'watch-pin' | 'package-box' | 'glass-bead' | 'quality-log';

interface Choice {
  readonly id: string;
  readonly label: string;
}

interface ProtocolStep {
  readonly key: StepKey;
  readonly label: string;
  readonly prompt: string;
  readonly choices: readonly Choice[];
  readonly correctId: string;
  readonly correction: string;
}

interface Mission {
  readonly id: MissionId;
  readonly title: string;
  readonly context: string;
  readonly brief: string;
  readonly steps: readonly ProtocolStep[];
  readonly success: string;
}

interface PrecisionEngineerGameProps {
  readonly onBack: () => void;
}

const MISSIONS: readonly Mission[] = [
  {
    id: 'watch-pin',
    title: 'ورشة الساعات',
    context: 'دبوس محور معدني دقيق',
    brief: 'صمّم بروتوكولًا لقياس قطر دبوس صغير جدًا دون سحقه أو الاعتماد على أداة خشنة التدريج.',
    steps: [
      {
        key: 'tool',
        label: 'الأداة',
        prompt: 'ما الأداة الأنسب؟',
        choices: [
          { id: 'ruler', label: 'مسطرة مدرجة' },
          { id: 'micrometer', label: 'ميكرومتر' },
          { id: 'cylinder', label: 'مخبار مدرج' },
        ],
        correctId: 'micrometer',
        correction: 'قطر الدبوس صغير جدًا؛ الميكرومتر أنسب من المسطرة لقياس هذا البعد.',
      },
      {
        key: 'method',
        label: 'الطريقة',
        prompt: 'كيف تغلق الأداة على الدبوس؟',
        choices: [
          { id: 'force', label: 'أشد المغزل بقوة حتى لا يتحرك الدبوس' },
          { id: 'ratchet', label: 'أستخدم السقاطة برفق حتى يثبت التلامس' },
          { id: 'estimate', label: 'أكتفي بالنظر وأقدّر القطر' },
        ],
        correctId: 'ratchet',
        correction: 'السقاطة تساعد على تلامس ثابت دون ضغط زائد قد يغيّر القياس.',
      },
      {
        key: 'reading',
        label: 'القراءة',
        prompt: 'كيف تبني القراءة؟',
        choices: [
          { id: 'main-only', label: 'أقرأ التدريج الرئيسي فقط' },
          { id: 'fraction-only', label: 'أقرأ التدريج الكسري فقط' },
          { id: 'compose', label: 'أجمع قراءة التدريج الرئيسي والكسري' },
        ],
        correctId: 'compose',
        correction: 'قراءة الميكرومتر الكاملة تُبنى من التدريج الرئيسي مع التدريج الكسري.',
      },
      {
        key: 'unit',
        label: 'الوحدة',
        prompt: 'ما الوحدة الأنسب للتسجيل؟',
        choices: [
          { id: 'mm', label: 'mm' },
          { id: 'cm3', label: 'cm³' },
          { id: 'ml', label: 'mL' },
        ],
        correctId: 'mm',
        correction: 'نقيس قطرًا صغيرًا، لذلك نستخدم وحدة طول مثل mm.',
      },
    ],
    success: 'بنيت بروتوكولًا يحمي العينة ويستفيد من دقة الميكرومتر بدل التعامل معه كمسطرة صغيرة.',
  },
  {
    id: 'package-box',
    title: 'مصنع العبوات',
    context: 'علبة تغليف صناعية',
    brief:
      'قسم الجودة يريد الحجم الخارجي لعلبة قبل اعتماد قالب الشحن. ابنِ إجراءً من القياس إلى الوحدة.',
    steps: [
      {
        key: 'tool',
        label: 'الأداة',
        prompt: 'كيف تقيس أبعاد العلبة؟',
        choices: [
          { id: 'ruler', label: 'مسطرة لقياس الطول والعرض والارتفاع' },
          { id: 'micrometer', label: 'ميكرومتر لقياس الأبعاد الثلاثة كلها' },
          { id: 'cylinder', label: 'مخبار مدرج' },
        ],
        correctId: 'ruler',
        correction: 'الأبعاد عدة سنتيمترات ويمكن قياسها مباشرة بالمسطرة.',
      },
      {
        key: 'method',
        label: 'الطريقة',
        prompt: 'أي إجراء يعطي الأبعاد اللازمة؟',
        choices: [
          { id: 'one-edge', label: 'أقيس ضلعًا واحدًا وأكرره ثلاث مرات' },
          { id: 'three-axes', label: 'أقيس ثلاثة أبعاد متعامدة: طولًا وعرضًا وارتفاعًا' },
          { id: 'perimeter', label: 'أقيس محيط قاعدة العلبة فقط' },
        ],
        correctId: 'three-axes',
        correction: 'حجم متوازي المستطيلات يحتاج ثلاثة أبعاد متعامدة.',
      },
      {
        key: 'reading',
        label: 'الحساب',
        prompt: 'أبعاد العلبة 12 cm و8 cm و5 cm. ما الحساب الصحيح؟',
        choices: [
          { id: 'sum', label: '12 + 8 + 5 = 25' },
          { id: 'product', label: '12 × 8 × 5 = 480' },
          { id: 'area', label: '12 × 8 = 96' },
        ],
        correctId: 'product',
        correction: 'حجم الجسم المنتظم يساوي حاصل ضرب الطول والعرض والارتفاع.',
      },
      {
        key: 'unit',
        label: 'الوحدة',
        prompt: 'كيف تسجل الناتج؟',
        choices: [
          { id: 'cm', label: '480 cm' },
          { id: 'cm2', label: '480 cm²' },
          { id: 'cm3', label: '480 cm³' },
        ],
        correctId: 'cm3',
        correction: 'الحجم يقاس بوحدة مكعبة، لذلك الناتج 480 cm³.',
      },
    ],
    success: 'حوّلت ثلاثة قياسات طول مستقلة إلى حجم واحد بوحدة مكعبة صحيحة.',
  },
  {
    id: 'glass-bead',
    title: 'مختبر العينات',
    context: 'خرزة زجاجية غير منتظمة',
    brief:
      'لا توجد أبعاد هندسية بسيطة للخرزة. ابنِ بروتوكولًا يستخدم تغير مستوى الماء بدل اختراع طول وعرض وارتفاع وهميين.',
    steps: [
      {
        key: 'tool',
        label: 'الأداة',
        prompt: 'ما الأداة المناسبة؟',
        choices: [
          { id: 'ruler', label: 'مسطرة فقط' },
          { id: 'cylinder', label: 'مخبار مدرج' },
          { id: 'micrometer', label: 'ميكرومتر فقط' },
        ],
        correctId: 'cylinder',
        correction: 'الإزاحة في المخبار مناسبة لجسم صلب غير منتظم يمكن غمره في الماء.',
      },
      {
        key: 'method',
        label: 'الطريقة',
        prompt: 'ما الإجراء الصحيح؟',
        choices: [
          { id: 'difference', label: 'أقرأ الماء قبل الغمر وبعده ثم أحسب الفرق' },
          { id: 'final-only', label: 'أستخدم القراءة النهائية وحدها كحجم للخرزة' },
          { id: 'half', label: 'أغمر نصف الخرزة وأضاعف القراءة' },
        ],
        correctId: 'difference',
        correction: 'حجم الجسم يساوي الزيادة في قراءة الماء بعد الغمر الكامل.',
      },
      {
        key: 'reading',
        label: 'الحساب',
        prompt: 'ارتفع الماء من 31 mL إلى 43 mL. ما حجم الماء المزاح؟',
        choices: [
          { id: '12', label: '43 mL − 31 mL = 12 mL' },
          { id: '74', label: '43 mL + 31 mL = 74 mL' },
          { id: '43', label: '43 mL' },
        ],
        correctId: '12',
        correction: 'الفرق بين القراءتين هو حجم الماء المزاح: 12 mL.',
      },
      {
        key: 'unit',
        label: 'الوحدة',
        prompt: 'كيف تسجل حجم الخرزة بوحدة حجم هندسية؟',
        choices: [
          { id: '12cm3', label: '12 cm³' },
          { id: '12cm', label: '12 cm' },
          { id: '12cm2', label: '12 cm²' },
        ],
        correctId: '12cm3',
        correction: 'بما أن 1 mL = 1 cm³ فإن حجم الخرزة 12 cm³.',
      },
    ],
    success:
      'استخدمت فرق القراءتين وحولت حجم الماء المزاح إلى حجم الجسم دون تغيير المعنى الفيزيائي.',
  },
  {
    id: 'quality-log',
    title: 'فحص الجودة',
    context: 'سجل قياس حلقة تثبيت خزفية',
    brief:
      'السجلان الموجودان في خط الإنتاج يحتويان عناصر صحيحة وأخرى معيبة. ابنِ النسخة التي تستحق الاعتماد.',
    steps: [
      {
        key: 'tool',
        label: 'الأداة',
        prompt: 'السماكة صغيرة جدًا. أي اختيار تعتمد؟',
        choices: [
          { id: 'ruler', label: 'سجل أ: مسطرة' },
          { id: 'micrometer', label: 'سجل ب: ميكرومتر' },
          { id: 'cylinder', label: 'سجل ج: مخبار مدرج' },
        ],
        correctId: 'micrometer',
        correction: 'لسماكة صغيرة جدًا يكون الميكرومتر أنسب من المسطرة أو المخبار.',
      },
      {
        key: 'method',
        label: 'الطريقة',
        prompt: 'أي وصف تشغيل تعتمد؟',
        choices: [
          { id: 'force', label: 'أغلق المغزل بقوة حتى تتوقف الحركة' },
          { id: 'ratchet', label: 'أثبت التلامس بالسقاطة برفق ثم أقرأ التدريجين' },
          { id: 'visual', label: 'أقدّر السماكة بالنظر بعد وضعها قرب الأداة' },
        ],
        correctId: 'ratchet',
        correction: 'التلامس المنضبط وقراءة التدريجين جزء من بروتوكول القياس الموثوق.',
      },
      {
        key: 'reading',
        label: 'القراءة',
        prompt: 'أي سجل للقراءة مكتمل؟',
        choices: [
          { id: 'number-only', label: '1.84 فقط' },
          { id: 'full', label: '1.84 mm' },
          { id: 'unit-only', label: 'mm فقط' },
        ],
        correctId: 'full',
        correction: 'السجل القابل للاعتماد يحتاج قيمة عددية ووحدة معًا.',
      },
      {
        key: 'unit',
        label: 'التحقق',
        prompt: 'ما الحكم الصحيح على سجل القياس؟',
        choices: [
          { id: 'digits', label: 'أعتمده لأن فيه رقمين عشريين فقط' },
          { id: 'protocol', label: 'أعتمده لأن الأداة والطريقة والقراءة والوحدة متسقة' },
          { id: 'digital', label: 'أعتمده فقط إذا كانت الأداة رقمية' },
        ],
        correctId: 'protocol',
        correction:
          'موثوقية السجل تأتي من اتساق الأداة والطريقة والقراءة والوحدة، لا من شكل العرض وحده.',
      },
    ],
    success: 'أعدت بناء سجل قياس قابل للاعتماد بدل اختيار رقم يبدو مقنعًا فقط.',
  },
] as const;

function MissionVisual({ id }: { id: MissionId }) {
  if (id === 'watch-pin') {
    return (
      <svg
        viewBox="0 0 720 300"
        role="img"
        aria-label="ورشة ساعات يظهر فيها دبوس محور معدني دقيق بجوار ميكرومتر"
      >
        <rect width="720" height="300" rx="28" fill="#eef6f4" />
        <rect
          x="55"
          y="48"
          width="235"
          height="188"
          rx="24"
          fill="#fff"
          stroke="#bfd8d2"
          strokeWidth="3"
        />
        <circle cx="172" cy="142" r="72" fill="#f9f4e4" stroke="#c8a74d" strokeWidth="5" />
        {Array.from({ length: 12 }, (_, index) => {
          const angle = (index * Math.PI * 2) / 12;
          const x = 172 + Math.cos(angle) * 55;
          const y = 142 + Math.sin(angle) * 55;
          return (
            <line key={index} x1={172} y1={142} x2={x} y2={y} stroke="#ccb976" strokeWidth="2" />
          );
        })}
        <circle cx="172" cy="142" r="12" fill="#455f63" />
        <rect x="330" y="132" width="235" height="20" rx="10" fill="#758d91" />
        <rect
          x="405"
          y="112"
          width="112"
          height="60"
          rx="18"
          fill="#d6e0e1"
          stroke="#657a7d"
          strokeWidth="4"
        />
        <circle cx="592" cy="142" r="34" fill="#c79a55" stroke="#7c5a2a" strokeWidth="4" />
        <line
          x1="565"
          y1="142"
          x2="625"
          y2="142"
          stroke="#4d5f62"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === 'package-box') {
    return (
      <svg
        viewBox="0 0 720 300"
        role="img"
        aria-label="علبة تغليف صناعية أبعادها 12 cm طولًا و8 cm عرضًا و5 cm ارتفاعًا"
      >
        <rect width="720" height="300" rx="28" fill="#fff7df" />
        <polygon
          points="230,92 445,92 535,142 320,142"
          fill="#f1d69b"
          stroke="#8d6f32"
          strokeWidth="4"
        />
        <polygon
          points="320,142 535,142 535,240 320,240"
          fill="#d8ad66"
          stroke="#8d6f32"
          strokeWidth="4"
        />
        <polygon
          points="230,92 320,142 320,240 230,190"
          fill="#e8c580"
          stroke="#8d6f32"
          strokeWidth="4"
        />
        <line x1="320" y1="260" x2="535" y2="260" stroke="#2e7568" strokeWidth="4" />
        <line x1="554" y1="142" x2="554" y2="240" stroke="#2e7568" strokeWidth="4" />
        <line x1="452" y1="72" x2="542" y2="122" stroke="#2e7568" strokeWidth="4" />
        <text x="385" y="286" fontSize="20" textAnchor="middle" fill="#315b56" direction="ltr">
          12 cm
        </text>
        <text x="583" y="194" fontSize="20" fill="#315b56" direction="ltr">
          5 cm
        </text>
        <text
          x="502"
          y="67"
          fontSize="20"
          textAnchor="middle"
          fill="#315b56"
          direction="ltr"
          transform="rotate(29 502 67)"
        >
          8 cm
        </text>
      </svg>
    );
  }

  if (id === 'glass-bead') {
    return (
      <svg
        viewBox="0 0 720 300"
        role="img"
        aria-label="خرزة زجاجية بجوار مخبار مدرج في مختبر عينات"
      >
        <rect width="720" height="300" rx="28" fill="#eef8fb" />
        <rect
          x="410"
          y="38"
          width="115"
          height="220"
          rx="22"
          fill="#fbfeff"
          stroke="#67818a"
          strokeWidth="4"
        />
        <path d="M424 134 Q467 146 511 134 L511 243 L424 243 Z" fill="#88cee0" opacity="0.82" />
        {Array.from({ length: 11 }, (_, index) => (
          <line
            key={index}
            x1="525"
            y1={58 + index * 17}
            x2={index % 5 === 0 ? 566 : 550}
            y2={58 + index * 17}
            stroke="#536d72"
            strokeWidth={index % 5 === 0 ? 2.5 : 1.2}
          />
        ))}
        <circle
          cx="230"
          cy="160"
          r="55"
          fill="#84c4d1"
          opacity="0.72"
          stroke="#3d7f8a"
          strokeWidth="5"
        />
        <circle cx="213" cy="142" r="13" fill="#fff" opacity="0.75" />
        <path
          d="M292 160 C340 160 354 160 397 160"
          fill="none"
          stroke="#c99b34"
          strokeWidth="4"
          strokeDasharray="8 7"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 720 300"
      role="img"
      aria-label="لوحة فحص جودة تعرض سجلين لقياس حلقة تثبيت خزفية"
    >
      <rect width="720" height="300" rx="28" fill="#f5f8f3" />
      {[0, 1].map((column) => (
        <g key={column} transform={`translate(${80 + column * 320} 46)`}>
          <rect
            width="250"
            height="205"
            rx="20"
            fill="#fff"
            stroke={column === 0 ? '#d8c7a1' : '#9fc9bd'}
            strokeWidth="4"
          />
          <text x="125" y="34" textAnchor="middle" fontSize="18" fontWeight="800" fill="#315b56">
            السجل {column === 0 ? 'أ' : 'ب'}
          </text>
          {[0, 1, 2, 3].map((row) => (
            <rect
              key={row}
              x="28"
              y={55 + row * 34}
              width={194 - row * 13}
              height="16"
              rx="8"
              fill={column === 0 ? '#eadfc8' : '#d7ebe5'}
            />
          ))}
          <circle
            cx="207"
            cy="174"
            r="20"
            fill={column === 0 ? '#b98470' : '#5f9b8d'}
            opacity="0.85"
          />
        </g>
      ))}
    </svg>
  );
}

export function PrecisionEngineerGame({ onBack }: PrecisionEngineerGameProps) {
  const [missionIndex, setMissionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<StepKey, string>>>({});
  const [tested, setTested] = useState(false);
  const [completed, setCompleted] = useState<Set<MissionId>>(() => new Set());

  const mission = MISSIONS[missionIndex];
  const score = useMemo(
    () => mission.steps.filter((step) => answers[step.key] === step.correctId).length,
    [answers, mission]
  );
  const completeSelection = mission.steps.every((step) => Boolean(answers[step.key]));
  const trusted = tested && score === mission.steps.length;
  const confidence = score === 4 ? 'موثوق' : score >= 2 ? 'يحتاج ضبط' : 'غير موثوق';

  if (completed.size === MISSIONS.length) {
    return (
      <section className="rafiq-precision-game">
        <div className="rafiq-precision-complete" role="status">
          <p>اكتمل التصميم والاختبار</p>
          <h2>مهندس الدقة</h2>
          <strong>بنيت أربعة بروتوكولات قياس وصححتها حتى أصبحت قابلة للاعتماد.</strong>
          <span>
            نجاحك هنا جاء من اتساق الأداة والطريقة والقراءة والوحدة، لا من تخمين جواب منفرد.
          </span>
        </div>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBack} />
      </section>
    );
  }

  function choose(step: StepKey, id: string) {
    setAnswers((current) => ({ ...current, [step]: id }));
    setTested(false);
  }

  function nextMission() {
    setCompleted((current) => new Set([...current, mission.id]));
    setAnswers({});
    setTested(false);
    if (missionIndex < MISSIONS.length - 1) setMissionIndex((current) => current + 1);
  }

  return (
    <section className="rafiq-precision-game">
      <header className="rafiq-precision-hero">
        <div>
          <p>اللعبة التعليمية • قياس الطول والحجم</p>
          <h2>مهندس الدقة</h2>
          <span>ابنِ البروتوكول، اختبره، شاهد موضع الخلل، ثم عدّله حتى يصبح موثوقًا.</span>
        </div>
        <strong>
          <ScientificText text={`${missionIndex + 1}/4`} />
        </strong>
      </header>

      <div className="rafiq-precision-progress" aria-label={`المهمة ${missionIndex + 1} من 4`}>
        <span style={{ width: `${((missionIndex + 1) / MISSIONS.length) * 100}%` }} />
      </div>

      <article className="rafiq-precision-mission">
        <div className="rafiq-precision-copy">
          <p>{mission.context}</p>
          <h3>{mission.title}</h3>
          <span>{mission.brief}</span>
        </div>
        <div className="rafiq-precision-visual">
          <MissionVisual id={mission.id} />
        </div>
      </article>

      <div className="rafiq-precision-builder" aria-label="بناء بروتوكول القياس">
        {mission.steps.map((step, index) => {
          const selected = answers[step.key];
          const correct = selected === step.correctId;
          return (
            <section
              key={step.key}
              className={`rafiq-precision-step${tested ? (correct ? ' is-correct' : ' is-wrong') : ''}`}
            >
              <div className="rafiq-precision-step-heading">
                <span>{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.prompt}</p>
                </div>
              </div>
              <div className="rafiq-precision-options">
                {step.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={selected === choice.id ? 'is-selected' : ''}
                    aria-pressed={selected === choice.id}
                    onClick={() => choose(step.key, choice.id)}
                  >
                    <ScientificText text={choice.label} />
                  </button>
                ))}
              </div>
              {tested && !correct ? (
                <p className="rafiq-precision-correction">
                  <ScientificText text={step.correction} />
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <button
        type="button"
        className="rafiq-precision-test"
        disabled={!completeSelection}
        onClick={() => setTested(true)}
      >
        اختبر البروتوكول
      </button>

      {tested ? (
        <div
          className={`rafiq-precision-confidence ${trusted ? 'is-trusted' : 'is-review'}`}
          role="status"
        >
          <div>
            <span>مؤشر الثقة</span>
            <strong>{confidence}</strong>
          </div>
          <div className="rafiq-precision-confidence-bar" aria-hidden="true">
            <span style={{ width: `${score * 25}%` }} />
          </div>
          <p>
            {trusted
              ? mission.success
              : 'البروتوكول يحتوي عناصر سليمة، لكن جزءًا واحدًا غير منضبط يكفي لإضعاف القياس. عدّل البنود المعلّمة ثم اختبر من جديد.'}
          </p>
          {trusted ? (
            <button type="button" onClick={nextMission}>
              {missionIndex === MISSIONS.length - 1 ? 'اعتماد المهمة الأخيرة' : 'المهمة التالية'}
            </button>
          ) : null}
        </div>
      ) : null}

      <StudentBackAction label="العودة إلى الدرس" onClick={onBack} />
    </section>
  );
}

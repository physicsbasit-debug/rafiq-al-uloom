import { ScientificText } from '@design-system/components/ScientificText';
import type { Objective } from '@shared-types/content.types';
import { LessonActionGrid } from './LessonActionGrid';

interface Grade9ImportanceMeasurementLessonProps {
  readonly objectives: Objective[];
  readonly onBackToLessons: () => void;
  readonly onOpenReviewQuestions: () => void;
  readonly onOpenActivities: () => void;
  readonly onOpenMatchingGame: () => void;
  readonly onOpenVirtualLabs: () => void;
  readonly onOpenMasteryTest: () => void;
}

const CUES = [
  'لماذا يجب أن يعني المتر الشيء نفسه في كل مكان؟',
  'كيف يغيّر خطأ زمني صغير موقعًا تحسبه أجهزة الملاحة؟',
  'ما الفرق بين الرقم وحده والقياس الكامل؟',
] as const;

export function Grade9ImportanceMeasurementLesson({
  objectives,
  onBackToLessons,
  onOpenReviewQuestions,
  onOpenActivities,
  onOpenMatchingGame,
  onOpenVirtualLabs,
  onOpenMasteryTest,
}: Grade9ImportanceMeasurementLessonProps) {
  return (
    <article className="rafiq-study-sheet">
      <header className="rafiq-study-sheet-hero">
        <p>الفيزياء • الصف التاسع • الوحدة الأولى</p>
        <h2>1-1 أهمية القياس</h2>
        <span>لماذا نحتاج إلى وحدات مشتركة؟ ولماذا قد يصبح جزء صغير جدًا من الثانية مهمًا؟</span>
      </header>

      <section className="rafiq-study-objectives" aria-labelledby="g9-objectives-title">
        <div>
          <p>ما الذي سنعمل عليه؟</p>
          <h3 id="g9-objectives-title">الأهداف التعليمية</h3>
          <span>تُستكمل هذه الأهداف خلال موضوعي أهمية القياس وقياس الطول والحجم.</span>
        </div>
        <ol>
          {objectives.map((objective) => (
            <li key={objective.id}>{objective.text}</li>
          ))}
        </ol>
      </section>

      <div className="rafiq-study-grid">
        <aside className="rafiq-study-cues" aria-label="أسئلة تقود التفكير">
          <header>
            <p>فكّر أثناء القراءة</p>
            <h3>أسئلة تقود تفكيرك</h3>
          </header>
          <ol>
            {CUES.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ol>
        </aside>

        <main className="rafiq-study-notes">
          <section className="rafiq-study-note-card">
            <div className="rafiq-study-note-copy">
              <span className="rafiq-study-number">1</span>
              <div>
                <h3>لماذا نحتاج إلى قياس موحّد؟</h3>
                <p>
                  لكي نستطيع مقارنة القياسات وفهمها في أي مكان، يجب أن تكون وحدات القياس معرّفة
                  وموحّدة. فالمتر الذي تستخدمه في المدرسة يجب أن يمثل الطول نفسه عندما يُستخدم في
                  مكان آخر.
                </p>
              </div>
            </div>
            <figure className="rafiq-study-infographic">
              <img
                src="/lesson-visuals/g9-importance-universal-units.svg"
                alt="إنفوجرافيك تعليمي يوضح وحدات قياس موحدة حول العالم"
                width="1200"
                height="675"
                loading="eager"
              />
              <figcaption>
                <strong>لغة مشتركة للقياس</strong>
                <span>القيمة تصبح قابلة للمقارنة عندما ترتبط بوحدة معروفة ومتفق عليها.</span>
              </figcaption>
            </figure>
            <div className="rafiq-study-conversions" aria-label="علاقات وحدات مهمة">
              <div>
                <ScientificText text="1000 m = 1 km" />
              </div>
              <div>
                <ScientificText text="0.001 m = 1 mm" />
              </div>
              <div>
                <ScientificText text="100 cm = 1 m" />
              </div>
              <div>
                <ScientificText text="1000 L = 1 m³" />
              </div>
            </div>
          </section>

          <section className="rafiq-study-note-card is-accent">
            <div className="rafiq-study-note-copy">
              <span className="rafiq-study-number">2</span>
              <div>
                <h3>عندما تصبح أجزاء الثانية مهمة</h3>
                <p>
                  تحدد أنظمة الملاحة موقعك من زمن وصول إشارات الراديو القادمة من الأقمار الصناعية.
                  لذلك تحتاج إلى قياس الزمن بدقة شديدة؛ فالخطأ الصغير في الزمن يمكن أن يؤدي إلى خطأ
                  في الموقع المحسوب.
                </p>
              </div>
            </div>
            <figure className="rafiq-study-infographic">
              <img
                src="/lesson-visuals/g9-importance-gps.svg"
                alt="إنفوجرافيك تعليمي لقمر صناعي يرسل إشارات إلى هاتف لتحديد الموقع"
                width="1200"
                height="675"
                loading="lazy"
              />
              <figcaption>
                <strong>الزمن يتحول إلى موقع</strong>
                <span>يقاس زمن وصول الإشارة، ومنه يحسب الجهاز المسافة ثم يحدد الموقع.</span>
              </figcaption>
            </figure>
            <div className="rafiq-study-facts">
              <div>
                <strong>
                  <ScientificText text="24 000 km" />
                </strong>
                <span>ارتفاع الأقمار المذكور في المثال</span>
              </div>
              <div>
                <strong>
                  <ScientificText text="3 ns" />
                </strong>
                <span>خطأ زمني صغير قد يقابل خطأً يقارب مترًا واحدًا في الموقع</span>
              </div>
            </div>
          </section>

          <section className="rafiq-study-note-card">
            <div className="rafiq-study-note-copy">
              <span className="rafiq-study-number">3</span>
              <div>
                <h3>القياس في حياتنا</h3>
                <p>
                  نستخدم القياس في الطب والرياضة والهندسة والملاحة وفي مواقف يومية كثيرة. المهم ليس
                  وجود رقم فقط، بل قيمة مع وحدة يمكن فهمها ومقارنتها.
                </p>
              </div>
            </div>
            <figure className="rafiq-study-infographic is-contained">
              <img
                src="/lesson-visuals/g9-importance-daily-life-infographic-v2.png"
                alt="إنفوجرافيك تعليمي يربط بين قياس الأبعاد الصغيرة بالمليمتر، وقياس المسافة والزمن بالمتر والثانية، وقياس الحجم بالمليلتر"
                width="1550"
                height="1014"
                loading="lazy"
              />
              <figcaption>
                <strong>القياس يصنع قرارًا أوضح</strong>
                <span>
                  كمية الدواء، المسافة والزمن، والأبعاد الصغيرة كلها تحتاج قياسًا مناسبًا.
                </span>
              </figcaption>
            </figure>
          </section>

          <section className="rafiq-study-check">
            <header>
              <p>توقف 30 ثانية</p>
              <h3>هل أصبحت الفكرة واضحة؟</h3>
            </header>
            <div>
              <article>
                <strong>فكّر</strong>
                <span>لماذا لا تكفي عبارة «المسافة طويلة» وحدها في تقرير علمي؟</span>
              </article>
              <article>
                <strong>طبّق</strong>
                <span>
                  حوّل <ScientificText text="3000 m" /> إلى كيلومترات.
                </span>
              </article>
              <article>
                <strong>استنتج</strong>
                <span>لماذا تساعد الوحدات المشتركة فريقًا علميًا يعمل في بلدين مختلفين؟</span>
              </article>
            </div>
          </section>
        </main>
      </div>

      <section className="rafiq-study-summary">
        <p>الخلاصة</p>
        <h3>قياس جيد = قيمة واضحة + وحدة متفق عليها + دقة مناسبة</h3>
        <span>
          عندما تتوحّد الوحدات نستطيع مقارنة النتائج، وعندما تتحسن الدقة تصبح القرارات المبنية على
          القياس أكثر موثوقية.
        </span>
      </section>

      <LessonActionGrid
        onOpenReviewQuestions={onOpenReviewQuestions}
        onOpenActivities={onOpenActivities}
        onOpenMatchingGame={onOpenMatchingGame}
        onOpenVirtualLabs={onOpenVirtualLabs}
        onOpenMasteryTest={onOpenMasteryTest}
        onBackToLessons={onBackToLessons}
      />
    </article>
  );
}

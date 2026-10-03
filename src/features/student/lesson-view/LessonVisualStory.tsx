interface VisualStoryBlock {
  readonly title: string;
  readonly body: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly caption: string;
}

interface LessonVisualStoryConfig {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly blocks: readonly VisualStoryBlock[];
}

const LESSON_VISUAL_STORIES: Readonly<Record<string, LessonVisualStoryConfig>> = {
  'g9-phy-s1-u1-l1': {
    eyebrow: 'الفكرة قبل التفاصيل',
    title: 'لماذا نحتاج إلى القياس؟',
    intro:
      'القياس يجعل وصف الكميات واضحًا وقابلًا للمقارنة. وعندما نتفق على الوحدات ونحسن الدقة تصبح النتائج مفهومة أينما أُجري القياس.',
    blocks: [
      {
        title: 'لغة قياس مشتركة',
        body: 'توحيد وحدات القياس يسمح بمقارنة النتائج ومشاركة البيانات وفهمها بين الناس في أماكن مختلفة.',
        imageSrc: '/lesson-visuals/g9-importance-universal-units.svg',
        imageAlt: 'كرة أرضية تحيط بها أدوات قياس متطابقة تمثل توحيد وحدات القياس',
        caption: 'وحدة موحّدة تجعل القياس قابلًا للمقارنة أينما أُجري.',
      },
      {
        title: 'الدقة قد تغيّر موقعك',
        body: 'تعتمد الملاحة بالأقمار الصناعية على قياس زمن وصول الإشارات بدقة شديدة. لذلك قد يؤدي خطأ زمني بالغ الصغر إلى خطأ في الموقع المحسوب.',
        imageSrc: '/lesson-visuals/g9-importance-gps.svg',
        imageAlt: 'هاتف للملاحة وقمر صناعي وإشارات مرتبطة بقياس زمني دقيق',
        caption: 'فرق زمني صغير جدًا قد يؤدي إلى فرق ملموس في الموقع المحسوب.',
      },
      {
        title: 'القياس جزء من حياتنا',
        body: 'تظهر القياسات في الطب والرياضة والهندسة والملاحة، كما نستخدمها في المنزل والطهي وأعمال كثيرة أخرى.',
        imageSrc: '/lesson-visuals/g9-importance-daily-life.png',
        imageAlt: 'أمثلة شبه واقعية من الحياة اليومية توضح استخدام القياس',
        caption: 'نقيس لكي نصف الكمية بوضوح، لا لكي نعتمد على الانطباع وحده.',
      },
    ],
  },
  'g10-phy-s1-u1-l1': {
    eyebrow: 'راقب القوى بدل أن تكتفي بالتعريف',
    title: 'الكهرباء الساكنة: تجاذب أم تنافر؟',
    intro:
      'الفكرة الأساسية بسيطة بصريًا: هناك شحنات موجبة وسالبة، وسلوكها يعتمد على نوع الشحنتين المتقابلتين.',
    blocks: [
      {
        title: 'نوعان من الشحنة',
        body: 'نرمز للشحنة الموجبة بعلامة (+) وللشحنة السالبة بعلامة (−).',
        imageSrc: '/lesson-visuals/g10-static-types.svg',
        imageAlt: 'رسم تعليمي لكرة موجبة الشحنة وأخرى سالبة الشحنة',
        caption: 'موجبة وسالبة: الاسمان يميزان نوعي الشحنة.',
      },
      {
        title: 'المتشابه يتنافر والمختلف يتجاذب',
        body: 'شحنتان من النوع نفسه تدفع كل منهما الأخرى بعيدًا، بينما الشحنتان المختلفتان تتحركان باتجاه بعضهما.',
        imageSrc: '/lesson-visuals/g10-static-forces.svg',
        imageAlt: 'رسم تعليمي يوضح تنافر الشحنات المتشابهة وتجاذب الشحنات المختلفة',
        caption: 'راقب اتجاه الأسهم قبل قراءة العبارة.',
      },
      {
        title: 'كيف يظهر الأثر في حياتنا؟',
        body: 'يمكن للاحتكاك أن يجعل تأثير الكهرباء الساكنة ملحوظًا، مثل بالون مدلوك يجذب أجسامًا خفيفة.',
        imageSrc: '/lesson-visuals/g10-static-life.svg',
        imageAlt: 'رسم تعليمي لبالون مدلوك يجذب قصاصات ورق وشعرًا',
        caption: 'التجاذب أو التنافر دليل يمكن ملاحظته، لا مجرد تعريف يُحفظ.',
      },
    ],
  },
};

interface LessonVisualStoryProps {
  readonly lessonId: string;
}

export function LessonVisualStory({ lessonId }: LessonVisualStoryProps) {
  const story = LESSON_VISUAL_STORIES[lessonId];

  if (!story) {
    return null;
  }

  return (
    <section className="rafiq-lesson-visual-story" aria-label={story.title}>
      <header className="rafiq-lesson-visual-story-header">
        <p>{story.eyebrow}</p>
        <h3>{story.title}</h3>
        <span>{story.intro}</span>
      </header>

      <div className="rafiq-lesson-visual-story-grid">
        {story.blocks.map((block) => (
          <figure key={block.title} className="rafiq-lesson-visual-card">
            <div className="rafiq-lesson-visual-frame">
              <img
                src={block.imageSrc}
                alt={block.imageAlt}
                width="1200"
                height="675"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>
              <strong>{block.title}</strong>
              <span>{block.body}</span>
              <small>{block.caption}</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

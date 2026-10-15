import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { GRADE9_L13_MASTERY_VARIANTS } from '@content/learning-design/grade9-lesson-1-3-mastery-design';

const goldenIndex = readFileSync('docs/lesson-1-3/07_UNIFIED_GOLDEN_INDEX.md', 'utf8');

describe('L13 mastery canonical governance keys', () => {
  it('يحافظ على مفاتيح Step-0 الأصلية حرفيًا للمتغيرات الأساسية MQ1–MQ5', () => {
    expect(GRADE9_L13_MASTERY_VARIANTS.mq1[0]).toMatchObject({
      questionKey: 'mastery-analog-timer-water-fill-procedure',
      contextKey: 'mastery-water-fill-to-mark',
      visualKey: 'g9-l13-mastery-water-fill-analog-v2',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq2[0]).toMatchObject({
      questionKey: 'mastery-digital-display-accuracy-claim',
      contextKey: 'mastery-toy-car-short-ramp',
      visualKey: 'g9-l13-mastery-toy-car-digital-timer-v1',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq3[0]).toMatchObject({
      questionKey: 'mastery-ball-drop-five-trial-mean',
      contextKey: 'mastery-ball-drop-five-trial-investigation',
      visualKey: 'g9-l13-mastery-ball-drop-notebook-v2',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq4[0]).toMatchObject({
      questionKey: 'mastery-horizontal-spring-cart-period',
      contextKey: 'mastery-horizontal-spring-cart-period',
      visualKey: 'g9-l13-mastery-horizontal-spring-cart-v1',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq5[0]).toMatchObject({
      questionKey: 'mastery-flexible-platform-complete-cycle',
      contextKey: 'mastery-flexible-platform-vertical-cycle',
      visualKey: 'g9-l13-mastery-flex-platform-cycle-v1',
    });
  });

  it('يثبت فقط مفاتيح المتغيرات الجديدة التي حسمتها Amendments صراحة', () => {
    expect(GRADE9_L13_MASTERY_VARIANTS.mq1[1]).toMatchObject({
      variantKey: 'sand-funnel-target-mark',
      contextKey: 'mastery-sand-funnel-fill-to-mark',
      visualKey: 'g9-l13-mastery-sand-funnel-analog-v1',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq2[1]).toMatchObject({
      variantKey: 'ramp-two-marks-2_43',
      contextKey: 'mastery-toy-car-two-mark-ramp',
      visualKey: 'g9-l13-mastery-toy-car-two-mark-digital-v1',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq4[1]).toMatchObject({
      variantKey: 'spring-cart-10-cycles-7_30',
      contextKey: 'mastery-horizontal-spring-cart-ten-cycles',
    });

    expect(GRADE9_L13_MASTERY_VARIANTS.mq5[1]).toMatchObject({
      variantKey: 'spring-seat-reference-down',
      contextKey: 'mastery-spring-seat-vertical-cycle',
      visualKey: 'g9-l13-mastery-spring-seat-cycle-v1',
    });
  });

  it('يبقي Golden Index متزامنًا مع المفاتيح الحاكمة ولا يحتفظ بالمفاتيح المنجرفة', () => {
    const requiredKeys = [
      'g9-l13-mastery-water-fill-analog-v2',
      'mastery-sand-funnel-fill-to-mark',
      'g9-l13-mastery-sand-funnel-analog-v1',

      'g9-l13-mastery-toy-car-digital-timer-v1',
      'mastery-toy-car-two-mark-ramp',
      'g9-l13-mastery-toy-car-two-mark-digital-v1',

      'mastery-ball-drop-five-trial-investigation',
      'g9-l13-mastery-ball-drop-notebook-v2',

      'mastery-horizontal-spring-cart-period',
      'g9-l13-mastery-horizontal-spring-cart-v1',
      'spring-cart-10-cycles-7_30',
      'mastery-horizontal-spring-cart-ten-cycles',

      'mastery-flexible-platform-vertical-cycle',
      'g9-l13-mastery-flex-platform-cycle-v1',
      'mastery-spring-seat-vertical-cycle',
      'g9-l13-mastery-spring-seat-cycle-v1',
    ];

    for (const key of requiredKeys) {
      expect(goldenIndex).toContain(`\`${key}\``);
    }

    const supersededKeys = [
      'g9-l13-mastery-water-fill-analog-v2a',
      'mastery-sand-funnel-fill-to-target-mark',
      'g9-l13-mastery-sand-funnel-analog-v2b',

      'g9-l13-mastery-toy-car-digital-v1a',
      'mastery-toy-car-marked-ramp',
      'g9-l13-mastery-toy-car-digital-v1b',

      'mastery-ball-drop-five-trial-1-8m',
      'g9-l13-mastery-ball-drop-notebook-v2a',

      'mastery-horizontal-spring-cart-period-8',
      'g9-l13-mastery-horizontal-spring-cart-v1a',
      'spring-cart-10-in-7_30',
      'mastery-horizontal-spring-cart-period-10',

      'mastery-flex-platform-vertical-cycle-up',
      'g9-l13-mastery-flex-platform-cycle-v1a',
      'mastery-spring-seat-vertical-cycle-down',
      'g9-l13-mastery-spring-seat-cycle-v1b',
    ];

    for (const key of supersededKeys) {
      expect(goldenIndex).not.toContain(`\`${key}\``);
    }
  });
});

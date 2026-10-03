import type { GoldenLearningMoment } from './learning-experience-guard';
import type { LearningExperienceReservation } from './learning-experience-reservation-guard';

const OBJECTIVE_TOOL = 'g9-s1-u1-l2-o1';
const OBJECTIVE_MICROMETER = 'g9-s1-u1-l2-o4';

export type Grade9Lesson12GoldenLearningMoment = GoldenLearningMoment & {
  readonly contextKey: string;
};

/**
 * Explanation reservations are explicit even though the original Golden guard starts at review.
 * They prevent later paths from recycling the same scene with cosmetic number changes.
 */
export const grade9Lesson12ExplanationReservations: readonly LearningExperienceReservation[] = [
  {
    id: 'g9-s1-u1-l2-explain-ruler',
    path: 'explanation',
    questionKey: 'explain-ruler-alignment-zero-and-straightness',
    visualKey: 'g9-l12-explain-ruler-three-states-v1',
    cognitiveFunction: 'demonstrate-ruler-alignment-zero-and-end-reading',
    contextKey: 'free-wire-ruler-alignment-three-state-demonstration',
    skill: 'استخدام المسطرة بطريقة صحيحة',
  },
  {
    id: 'g9-s1-u1-l2-explain-indirect',
    path: 'explanation',
    questionKey: 'explain-500-sheet-indirect-measurement',
    visualKey: 'g9-l12-explain-paper-stack-500-v1',
    cognitiveFunction: 'demonstrate-group-measurement-then-divide',
    contextKey: 'five-hundred-paper-stack-indirect-thickness',
    skill: 'استخدام القياس غير المباشر لبعد صغير',
  },
  {
    id: 'g9-s1-u1-l2-explain-micrometer',
    path: 'explanation',
    questionKey: 'explain-micrometer-2-5-plus-0-17',
    visualKey: 'g9-l12-explain-micrometer-2-5-0-17-v1',
    cognitiveFunction: 'demonstrate-main-plus-fractional-micrometer-reading',
    contextKey: 'micrometer-worked-example-2-5-plus-0-17',
    skill: 'قراءة الميكرومتر من تدريجين',
  },
  {
    id: 'g9-s1-u1-l2-explain-prism',
    path: 'explanation',
    questionKey: 'explain-regular-volume-4-by-3-by-2',
    visualKey: 'g9-l12-explain-rectangular-prism-4-3-2-v1',
    cognitiveFunction: 'demonstrate-regular-solid-volume-from-three-dimensions',
    contextKey: 'rectangular-prism-four-three-two-volume-example',
    skill: 'حساب حجم جسم منتظم',
  },
  {
    id: 'g9-s1-u1-l2-explain-meniscus',
    path: 'explanation',
    questionKey: 'explain-water-meniscus-eye-level',
    visualKey: 'g9-l12-explain-meniscus-three-eye-positions-v1',
    cognitiveFunction: 'demonstrate-eye-level-water-meniscus-reading',
    contextKey: 'water-meniscus-three-discrete-eye-positions',
    skill: 'قراءة مستوى الماء من موضع نظر صحيح',
  },
  {
    id: 'g9-s1-u1-l2-explain-displacement',
    path: 'explanation',
    questionKey: 'explain-displacement-42-to-57',
    visualKey: 'g9-l12-explain-displacement-42-57-v1',
    cognitiveFunction: 'demonstrate-displacement-difference-for-irregular-volume',
    contextKey: 'irregular-object-displacement-forty-two-to-fifty-seven',
    skill: 'إيجاد حجم جسم غير منتظم بالإزاحة',
  },
  {
    id: 'g9-s1-u1-l2-explain-cylinder-choice',
    path: 'explanation',
    questionKey: 'explain-choose-cylinder-10-100-1000',
    visualKey: 'g9-l12-explain-cylinder-choice-10-100-1000-v1',
    cognitiveFunction: 'demonstrate-range-and-division-choice',
    contextKey: 'three-cylinder-capacity-comparison-ten-hundred-thousand',
    skill: 'اختيار مدى وتدرج مناسبين',
  },
  {
    id: 'g9-s1-u1-l2-explain-integrated-tool-choice',
    path: 'explanation',
    questionKey: 'explain-thin-metal-sheet-tool-choice',
    visualKey: 'g9-l12-explain-thin-sheet-tool-choice-v1',
    cognitiveFunction: 'demonstrate-integrated-tool-choice-for-thin-dimension',
    contextKey: 'thin-metal-sheet-ruler-micrometer-cylinder-choice',
    skill: 'اختيار أداة مناسبة لبعد صغير جدًا',
  },
  {
    id: 'g9-s1-u1-l2-explain-measurement-compass',
    path: 'explanation',
    questionKey: 'explain-measurement-decision-compass',
    visualKey: 'g9-l12-explain-measurement-compass-v1',
    cognitiveFunction: 'organize-measurement-methods-by-quantity-shape-and-scale',
    contextKey: 'measurement-compass-decision-map',
    skill: 'اختيار طريقة القياس وفق طبيعة الكمية والجسم',
  },
] as const;

/**
 * Golden experience registry for review + scientific activities.
 *
 * questionKey, visualKey, cognitiveFunction, and contextKey must remain distinct across paths.
 * skill may repeat intentionally for spaced practice and transfer.
 */
export const grade9Lesson12GoldenExperience: readonly Grade9Lesson12GoldenLearningMoment[] = [
  {
    id: 'g9-s1-u1-l2-rq1',
    path: 'review',
    questionKey: 'choose-micrometer-for-thin-copper-wire-diameter',
    visualKey: 'g9-l12-review-wire-tools-copper-v1',
    cognitiveFunction: 'retrieve-tool-for-very-small-dimension',
    contextKey: 'thin-copper-wire-diameter-tool-choice',
    objectiveKey: OBJECTIVE_MICROMETER,
    skill: 'اختيار أداة مناسبة لقياس بعد صغير جدًا',
  },
  {
    id: 'g9-s1-u1-l2-rq2',
    path: 'review',
    questionKey: 'derive-single-sheet-thickness-from-100-sheet-stack',
    visualKey: 'g9-l12-review-paper-stack-100-v1',
    cognitiveFunction: 'derive-one-item-measurement-from-group-measurement',
    contextKey: 'hundred-paper-stack-single-sheet-thickness',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'استخدام القياس غير المباشر لبعد صغير',
  },
  {
    id: 'g9-s1-u1-l2-rq3',
    path: 'review',
    questionKey: 'read-micrometer-main-3-and-fraction-28',
    visualKey: 'g9-l12-review-micrometer-3-00-0-28-v1',
    cognitiveFunction: 'compose-main-and-fractional-micrometer-scales',
    contextKey: 'micrometer-reading-three-point-zero-zero-plus-zero-point-two-eight',
    objectiveKey: OBJECTIVE_MICROMETER,
    skill: 'قراءة الميكرومتر من تدريجين',
  },
  {
    id: 'g9-s1-u1-l2-rq4',
    path: 'review',
    questionKey: 'diagnose-1000ml-cylinder-for-6ml-with-10ml-divisions',
    visualKey: 'g9-l12-review-cylinder-1000ml-6ml-v1',
    cognitiveFunction: 'diagnose-scale-resolution-mismatch-for-small-volume',
    contextKey: 'one-liter-cylinder-six-milliliter-resolution-diagnosis',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'اختيار مدى وتدرج يناسبان حجم السائل',
  },
  {
    id: 'g9-s1-u1-l2-rq5',
    path: 'review',
    questionKey: 'measure-fixed-curved-path-with-string-and-ruler',
    visualKey: 'g9-l12-review-fixed-curved-path-v1',
    cognitiveFunction: 'select-indirect-method-for-nonstraightenable-path',
    contextKey: 'fixed-curved-path-string-transfer-to-ruler',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'اختيار طريقة قياس لمسار منحني غير قابل للتقويم',
  },

  // Inquiry, round A: prediction -> evidence -> causal attribution.
  {
    id: 'g9-s1-u1-l2-activity-inquiry-evidence',
    path: 'activity',
    questionKey: 'compare-three-student-measurement-methods-from-evidence',
    visualKey: 'g9-l12-activity-inquiry-three-stations-v1',
    cognitiveFunction: 'attribute-measurement-differences-to-procedure-variables',
    contextKey: 'three-students-measure-straight-plastic-strip-with-different-procedures',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'الحكم على جودة استخدام المسطرة من الأدلة',
  },
  // Inquiry, round B: design a multi-segment procedure for a long straight object.
  {
    id: 'g9-s1-u1-l2-activity-inquiry-design',
    path: 'activity',
    questionKey: 'design-multi-segment-ruler-procedure-for-long-rod',
    visualKey: 'g9-l12-activity-inquiry-long-rod-plan-v1',
    cognitiveFunction: 'sequence-measurement-procedure-for-object-longer-than-ruler',
    contextKey: 'straight-wooden-rod-longer-than-ruler-multi-segment-plan',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'تصميم إجراء قياس مباشر متعدد المقاطع',
  },
  // Simulation: one cylinder, continuous eye-height variable, changing liquid level.
  {
    id: 'g9-s1-u1-l2-activity-simulation-parallax',
    path: 'activity',
    questionKey: 'explore-continuous-eye-height-effect-on-apparent-water-reading',
    visualKey: 'g9-l12-activity-parallax-single-cylinder-v1',
    cognitiveFunction: 'manipulate-eye-height-and-observe-parallax-continuously',
    contextKey: 'single-graduated-cylinder-continuous-eye-parallax-with-changing-water-level',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'قراءة مستوى الماء من موضع نظر صحيح',
  },
  // Data: consistency vs accuracy without a known reference value.
  {
    id: 'g9-s1-u1-l2-activity-data-consistency',
    path: 'activity',
    questionKey: 'identify-most-consistent-micrometer-group-without-claiming-accuracy',
    visualKey: 'g9-l12-activity-consistency-dotplot-v1',
    cognitiveFunction: 'infer-consistency-from-spread-and-limit-accuracy-claim',
    contextKey: 'three-lab-groups-measure-nylon-washer-without-reference-value',
    objectiveKey: OBJECTIVE_MICROMETER,
    skill: 'تحليل اتساق مجموعة من القياسات',
  },
  // Guided experiment station A.
  {
    id: 'g9-s1-u1-l2-activity-experiment-direct',
    path: 'activity',
    questionKey: 'record-real-direct-length-with-tool-unit-and-justification',
    visualKey: 'g9-l12-activity-guided-straight-specimen-v1',
    cognitiveFunction: 'execute-and-document-direct-ruler-measurement',
    contextKey: 'teacher-provided-straight-specimen-ruler-digital-notebook',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'تنفيذ قياس طول مباشر وتوثيقه',
  },
  // Guided experiment station B.
  {
    id: 'g9-s1-u1-l2-activity-experiment-micrometer',
    path: 'activity',
    questionKey: 'record-real-thin-metal-disc-micrometer-measurement',
    visualKey: 'g9-l12-activity-guided-metal-disc-v1',
    cognitiveFunction: 'execute-and-document-micrometer-measurement',
    contextKey: 'thin-metal-disc-micrometer-ratchet-digital-notebook',
    objectiveKey: OBJECTIVE_MICROMETER,
    skill: 'استخدام الميكرومتر وتسجيل القراءة',
  },
  // Guided experiment station C.
  {
    id: 'g9-s1-u1-l2-activity-experiment-indirect',
    path: 'activity',
    questionKey: 'derive-one-plastic-card-thickness-from-25-card-stack',
    visualKey: 'g9-l12-activity-guided-card-stack-25-v1',
    cognitiveFunction: 'execute-group-measurement-and-validate-derived-single-value',
    contextKey: 'twenty-five-identical-plastic-cards-indirect-thickness-notebook',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'استخدام القياس غير المباشر لبعد صغير',
  },
  // Guided experiment station D.
  {
    id: 'g9-s1-u1-l2-activity-experiment-displacement',
    path: 'activity',
    questionKey: 'derive-polished-stone-volume-from-own-displacement-readings',
    visualKey: 'g9-l12-activity-guided-polished-stone-v1',
    cognitiveFunction: 'execute-displacement-and-validate-volume-from-own-readings',
    contextKey: 'polished-stone-graduated-cylinder-displacement-digital-notebook',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'إيجاد حجم جسم غير منتظم بالإزاحة',
  },
  {
    id: 'g9-s1-u1-l2-activity-simulation-variable-volume',
    path: 'activity',
    questionKey: 'predict-and-test-volume-change-when-dimensions-vary',
    visualKey: 'g9-l12-activity-transparent-unit-cube-volume-v1',
    cognitiveFunction: 'manipulate-dimensions-and-infer-multiplicative-volume-change',
    contextKey: 'transparent-variable-rectangular-volume-unit-cubes-and-target-build',
    objectiveKey: OBJECTIVE_TOOL,
    skill: 'استكشاف العلاقة بين الأبعاد وحجم جسم منتظم',
  },
] as const;

/** Reserved game contexts for the dedicated lesson 1-2 game "مهندس الدقة". */
export const grade9Lesson12GameReservations: readonly LearningExperienceReservation[] = [
  {
    id: 'g9-s1-u1-l2-game-watch-pin',
    path: 'game',
    questionKey: 'build-measurement-protocol-for-watch-pivot-pin',
    visualKey: 'g9-l12-game-watch-workshop-pin-v1',
    cognitiveFunction: 'construct-and-debug-micrometer-protocol-for-tiny-diameter',
    contextKey: 'watch-workshop-metal-pivot-pin-protocol',
    skill: 'اختيار الميكرومتر وطريقة استخدامه لبعد صغير جدًا',
  },
  {
    id: 'g9-s1-u1-l2-game-package-box',
    path: 'game',
    questionKey: 'build-packaging-box-volume-protocol',
    visualKey: 'g9-l12-game-industrial-packaging-box-v1',
    cognitiveFunction: 'construct-volume-protocol-from-three-perpendicular-dimensions',
    contextKey: 'industrial-shipping-package-external-volume-quality-control',
    skill: 'حساب حجم جسم منتظم',
  },
  {
    id: 'g9-s1-u1-l2-game-glass-bead',
    path: 'game',
    questionKey: 'build-displacement-protocol-for-glass-bead',
    visualKey: 'g9-l12-game-glass-bead-sample-lab-v1',
    cognitiveFunction: 'construct-displacement-protocol-and-unit-equivalence',
    contextKey: 'sample-lab-irregular-glass-bead-displacement-protocol',
    skill: 'إيجاد حجم جسم غير منتظم بالإزاحة',
  },
  {
    id: 'g9-s1-u1-l2-game-quality-log',
    path: 'game',
    questionKey: 'rebuild-trustworthy-ceramic-retaining-ring-measurement-log',
    visualKey: 'g9-l12-game-quality-control-two-records-v1',
    cognitiveFunction: 'debug-full-measurement-record-across-tool-method-reading-unit',
    contextKey: 'production-quality-ceramic-retaining-ring-measurement-record',
    skill: 'فحص اتساق بروتوكول القياس',
  },
] as const;

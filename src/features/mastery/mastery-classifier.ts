import type { MasteryClassification } from '@shared-types/mastery.types';

export function classifyMasteryScore(score: number): MasteryClassification {
  if (score >= 80) {
    return 'متقن';
  }

  if (score >= 60) {
    return 'قريب من الإتقان';
  }

  return 'يحتاج مراجعة';
}

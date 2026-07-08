export type MasteryClassification = 'متقن' | 'قريب من الإتقان' | 'يحتاج مراجعة';

export interface MasteryResult {
  id: string;
  studentId: string;
  lessonId: string;
  score: number;
  classification: MasteryClassification;
  recommendation: string;
  createdAt: string;
}

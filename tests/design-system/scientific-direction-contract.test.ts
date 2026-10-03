import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CONTRACT_FILES = [
  'src/features/student/lesson-view/Grade9ImportanceMeasurementLesson.tsx',
  'src/features/student/review-questions/ReviewQuestionsView.tsx',
  'src/features/activities/measurement-trust/MeasurementTrustMission.tsx',
  'src/features/games/measurement-mission/MeasurementMissionGame.tsx',
  'src/features/mastery/MasteryTestView.tsx',
] as const;

function source(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('scientific direction contract — Grade 9 golden lesson', () => {
  it('routes scientific copy through the shared ScientificText renderer', () => {
    for (const file of CONTRACT_FILES) {
      expect(source(file), file).toContain('ScientificText');
    }
  });

  it('does not reintroduce local LTR patches containing physical units', () => {
    const localUnitBdi =
      /<bdi[^>]*dir=["']ltr["'][^>]*>[^<{]*(?:km\/h|m\/s²|m\/s|mL|km|cm|mm|kg|ms|ns|Hz|kPa|Pa|m³|m²|(?:^|\s)s(?:$|\s)|(?:^|\s)m(?:$|\s)|(?:^|\s)L(?:$|\s)|(?:^|\s)g(?:$|\s))[^<{]*<\/bdi>/u;

    for (const file of CONTRACT_FILES) {
      expect(source(file), file).not.toMatch(localUnitBdi);
    }
  });

  it('keeps review feedback on the same scientific-text path as prompts and choices', () => {
    const review = source('src/features/student/review-questions/ReviewQuestionsView.tsx');
    const normalizedReview = review.replace(/\s+/gu, ' ');
    expect(normalizedReview).toContain(
      '<ScientificText text={response.correct || response.resolved ? question.explanation : hint} />'
    );
  });
});

import type { Question } from '@shared-types/quiz.types';

import { MASTERY_SCORING_POLICY_VERSION } from './mastery-results.types';

export type Sha256HexDigest = (bytes: Uint8Array) => Promise<string>;

const HEX_64 = /^[0-9a-f]{64}$/;
const textEncoder = new TextEncoder();

function utf8Length(value: string): number {
  return textEncoder.encode(value).byteLength;
}

function questionMaterial(question: Question): string {
  return `${utf8Length(question.id)}:${question.id}:${question.correctAnswerIndex}:${question.choices.length}`;
}

export function buildMasteryScoringMaterial(
  lessonId: string,
  questions: readonly Question[]
): string {
  const questionLines = questions.map(questionMaterial).join('\n');

  return `${MASTERY_SCORING_POLICY_VERSION}\n${utf8Length(lessonId)}:${lessonId}\n${questionLines}`;
}

export async function digestSha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('SHA-256 is unavailable');
  }

  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function createMasteryScoringFingerprint(
  lessonId: string,
  questions: readonly Question[],
  digest: Sha256HexDigest = digestSha256Hex
): Promise<string> {
  const fingerprint = (await digest(textEncoder.encode(buildMasteryScoringMaterial(lessonId, questions))))
    .trim()
    .toLowerCase();

  if (!HEX_64.test(fingerprint)) {
    throw new Error('Invalid SHA-256 fingerprint');
  }

  return fingerprint;
}

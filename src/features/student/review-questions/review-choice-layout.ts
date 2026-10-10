export interface ReviewChoiceIdentity {
  readonly id: string;
  readonly text: string;
  readonly diagnosis: string;
  readonly correct: boolean;
}

export interface ReviewChoiceLayoutOptions {
  readonly seed: number;
  readonly questionIndex: number;
  readonly attempt: number;
  readonly preserveOrder: boolean;
}

function hashNumber(value: number): number {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

export function deterministicShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = hashNumber(seed) || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = hashNumber(state + index * 2654435761);
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function shouldPreserveReviewChoiceOrder(choices: readonly string[]): boolean {
  return choices.some((choice) =>
    /كل ما سبق|جميع ما سبق|العبارات السابقة|بالترتيب|رتّب|الخطوة الأولى|الخطوة الثانية/.test(choice)
  );
}

export function buildReviewChoiceLayout(
  choices: readonly ReviewChoiceIdentity[],
  options: ReviewChoiceLayoutOptions
): ReviewChoiceIdentity[] {
  if (options.preserveOrder || choices.length < 2) return [...choices];

  const correct = choices.find((choice) => choice.correct);
  if (!correct) {
    return deterministicShuffle(
      choices,
      options.seed + options.questionIndex * 101 + options.attempt * 1009
    );
  }

  const distractors = deterministicShuffle(
    choices.filter((choice) => !choice.correct),
    options.seed + options.questionIndex * 313 + options.attempt * 2017
  );

  // Across five questions this cycles through the four positions, so no one
  // position can host the correct answer more than twice. A retry shifts it.
  const correctPosition =
    Math.abs(options.seed + options.questionIndex + Math.max(0, options.attempt - 1)) %
    choices.length;

  const result = [...distractors];
  result.splice(correctPosition, 0, correct);
  return result;
}

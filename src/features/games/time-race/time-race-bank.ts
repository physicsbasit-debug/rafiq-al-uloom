export type TimeRaceCar = 'nissan' | 'lamborghini';

export interface TimeRacePair {
  readonly id: string;
  readonly nissanCs: number;
  readonly lamborghiniCs: number;
  readonly winner: TimeRaceCar;
  readonly differenceCs: number;
}

export interface SelectTimeRaceAttemptOptions {
  readonly seed: number;
  readonly lastPairId?: string;
  readonly previousPairIds?: readonly string[];
}

export const TIME_RACE_ATTEMPT_SIZE = 2 as const;
export const TIME_RACE_PHYSICS_REVIEWED = false as const;

export const TIME_RACE_PAIRS: readonly TimeRacePair[] = [
  { id: 'B01', nissanCs: 1047, lamborghiniCs: 1231, winner: 'nissan', differenceCs: 184 },
  { id: 'B02', nissanCs: 1187, lamborghiniCs: 1153, winner: 'lamborghini', differenceCs: 34 },
  { id: 'B03', nissanCs: 1306, lamborghiniCs: 1279, winner: 'lamborghini', differenceCs: 27 },
  { id: 'B04', nissanCs: 988, lamborghiniCs: 1042, winner: 'nissan', differenceCs: 54 },
  { id: 'B05', nissanCs: 1397, lamborghiniCs: 1435, winner: 'nissan', differenceCs: 38 },
  { id: 'B06', nissanCs: 1268, lamborghiniCs: 1222, winner: 'lamborghini', differenceCs: 46 },
  { id: 'B07', nissanCs: 1008, lamborghiniCs: 967, winner: 'lamborghini', differenceCs: 41 },
  { id: 'B08', nissanCs: 1143, lamborghiniCs: 1208, winner: 'nissan', differenceCs: 65 },
  { id: 'B09', nissanCs: 1376, lamborghiniCs: 1333, winner: 'lamborghini', differenceCs: 43 },
  { id: 'B10', nissanCs: 954, lamborghiniCs: 1001, winner: 'nissan', differenceCs: 47 },
  { id: 'B11', nissanCs: 1199, lamborghiniCs: 1286, winner: 'nissan', differenceCs: 87 },
  { id: 'B12', nissanCs: 1486, lamborghiniCs: 1441, winner: 'lamborghini', differenceCs: 45 },
] as const;

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  const truncated = Math.trunc(seed);
  return truncated === 0 ? 1 : Math.abs(truncated);
}

function createPrng(seed: number): () => number {
  let state = normalizeSeed(seed) >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function buildCandidatePairs(): TimeRacePair[][] {
  const nineTenCar1Wins = TIME_RACE_PAIRS.filter(
    (pair) => pair.winner === 'nissan' && (pair.id === 'B04' || pair.id === 'B10')
  );

  const noBorrowCar2Wins = TIME_RACE_PAIRS.filter(
    (pair) =>
      pair.winner === 'lamborghini' &&
      (pair.id === 'B02' || pair.id === 'B06' || pair.id === 'B09' || pair.id === 'B12')
  );

  const candidates: TimeRacePair[][] = [];

  for (const car1Pair of nineTenCar1Wins) {
    for (const car2Pair of noBorrowCar2Wins) {
      candidates.push([car1Pair, car2Pair]);
    }
  }

  return candidates;
}

export function selectTimeRaceAttempt(
  options: SelectTimeRaceAttemptOptions
): readonly TimeRacePair[] {
  const previous = new Set(options.previousPairIds ?? []);
  const allCandidates = buildCandidatePairs();

  const unusedCandidates = allCandidates.filter((group) =>
    group.every((pair) => !previous.has(pair.id))
  );

  const candidates = unusedCandidates.length > 0 ? unusedCandidates : allCandidates;

  const random = createPrng(options.seed);
  const candidateIndex = Math.floor(random() * candidates.length);
  const selected = shuffled(candidates[candidateIndex], random);

  if (selected[0]?.id === options.lastPairId) {
    [selected[0], selected[1]] = [selected[1], selected[0]];
  }

  return selected;
}

import type { DrawMode, DrawTier, PrizeDistributionResult } from "@/lib/types";

const DRAW_SIZE = 5;
const MIN_SCORE = 1;
const MAX_SCORE = 45;

const tierShare: Record<DrawTier, number> = {
  match_5: 0.4,
  match_4: 0.35,
  match_3: 0.25
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomUniqueNumbers() {
  const set = new Set<number>();
  while (set.size < DRAW_SIZE) {
    set.add(randomInt(MIN_SCORE, MAX_SCORE));
  }
  return [...set].sort((a, b) => a - b);
}

function weightedPick(pool: number[], weights: number[]) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return pool[randomInt(0, pool.length - 1)];
  }
  let threshold = Math.random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return pool[i];
    }
  }
  return pool[pool.length - 1];
}

export function generateDrawNumbers(mode: DrawMode, historicalScores: number[]) {
  if (mode === "random" || historicalScores.length === 0) {
    return randomUniqueNumbers();
  }

  const frequency = new Map<number, number>();
  for (const value of historicalScores) {
    if (value >= MIN_SCORE && value <= MAX_SCORE) {
      frequency.set(value, (frequency.get(value) ?? 0) + 1);
    }
  }

  const pool = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, index) => index + MIN_SCORE);
  const picked = new Set<number>();
  while (picked.size < DRAW_SIZE) {
    const available = pool.filter((value) => !picked.has(value));
    const weights = available.map((value) => {
      const count = frequency.get(value) ?? 1;
      if (mode === "algorithmic_most_frequent") {
        return count;
      }
      return 1 / count;
    });
    picked.add(weightedPick(available, weights));
  }

  return [...picked].sort((a, b) => a - b);
}

export function countMatches(userNumbers: number[], drawNumbers: number[]) {
  const drawSet = new Set(drawNumbers);
  return userNumbers.reduce((acc, value) => (drawSet.has(value) ? acc + 1 : acc), 0);
}

export function calculatePrizeDistribution(
  monthlyPrizePool: number,
  winnersByTier: Record<DrawTier, number>,
  previousRollover: number
): PrizeDistributionResult {
  const byTier: Record<DrawTier, number> = {
    match_5: 0,
    match_4: 0,
    match_3: 0
  };

  let rolloverToNextMonth = 0;
  const jackpotTotal = monthlyPrizePool * tierShare.match_5 + previousRollover;
  if (winnersByTier.match_5 > 0) {
    byTier.match_5 = jackpotTotal / winnersByTier.match_5;
  } else {
    rolloverToNextMonth = jackpotTotal;
  }

  const tier4Total = monthlyPrizePool * tierShare.match_4;
  if (winnersByTier.match_4 > 0) {
    byTier.match_4 = tier4Total / winnersByTier.match_4;
  }

  const tier3Total = monthlyPrizePool * tierShare.match_3;
  if (winnersByTier.match_3 > 0) {
    byTier.match_3 = tier3Total / winnersByTier.match_3;
  }

  return {
    byTier,
    rolloverToNextMonth
  };
}

export function resolveTier(matchCount: number): DrawTier | null {
  if (matchCount === 5) {
    return "match_5";
  }
  if (matchCount === 4) {
    return "match_4";
  }
  if (matchCount === 3) {
    return "match_3";
  }
  return null;
}

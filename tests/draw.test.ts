import { describe, expect, it } from "vitest";
import { calculatePrizeDistribution, countMatches, generateDrawNumbers } from "@/lib/draw";

describe("draw generation", () => {
  it("generates 5 unique numbers within 1-45 for random mode", () => {
    const numbers = generateDrawNumbers("random", []);
    expect(numbers).toHaveLength(5);
    expect(new Set(numbers).size).toBe(5);
    expect(numbers.every((value) => value >= 1 && value <= 45)).toBe(true);
  });

  it("counts matches correctly", () => {
    expect(countMatches([1, 2, 3, 4, 5], [1, 6, 7, 4, 9])).toBe(2);
  });
});

describe("prize distribution", () => {
  it("rolls over jackpot when there is no 5-match winner", () => {
    const result = calculatePrizeDistribution(
      1000,
      { match_5: 0, match_4: 2, match_3: 4 },
      200
    );
    expect(result.byTier.match_5).toBe(0);
    expect(result.rolloverToNextMonth).toBe(600);
    expect(result.byTier.match_4).toBe(175);
    expect(result.byTier.match_3).toBe(62.5);
  });
});

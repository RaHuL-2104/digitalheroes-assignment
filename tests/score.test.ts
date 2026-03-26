import { describe, expect, it } from "vitest";
import { applyRollingFiveScores } from "@/lib/score";

describe("score rolling logic", () => {
  it("keeps only latest five scores by played date", () => {
    const userId = "user-1";
    const existing = [
      { userId, score: 5, playedAt: "2026-01-01T00:00:00.000Z" },
      { userId, score: 10, playedAt: "2026-01-02T00:00:00.000Z" },
      { userId, score: 15, playedAt: "2026-01-03T00:00:00.000Z" },
      { userId, score: 20, playedAt: "2026-01-04T00:00:00.000Z" },
      { userId, score: 25, playedAt: "2026-01-05T00:00:00.000Z" }
    ];

    const next = { userId, score: 30, playedAt: "2026-01-06T00:00:00.000Z" };
    const result = applyRollingFiveScores(existing, next);

    expect(result).toHaveLength(5);
    expect(result.map((item) => item.score)).toEqual([30, 25, 20, 15, 10]);
  });
});

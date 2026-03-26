import { z } from "zod";
import type { ScoreRecord } from "@/lib/types";

export const scoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  playedAt: z.string().datetime({ offset: true })
});

export function normalizeAndSortScores(scores: ScoreRecord[]) {
  return [...scores].sort((a, b) => {
    const dateDiff = new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
}

export function applyRollingFiveScores(existing: ScoreRecord[], incoming: ScoreRecord) {
  const merged = normalizeAndSortScores([...existing, incoming]);
  return merged.slice(0, 5);
}

export function validateScoreInput(score: number, playedAt: string) {
  return scoreSchema.parse({
    score,
    playedAt: new Date(playedAt).toISOString()
  });
}

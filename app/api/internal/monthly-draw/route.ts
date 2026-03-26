import { NextResponse } from "next/server";
import { calculatePrizeDistribution, countMatches, generateDrawNumbers, resolveTier } from "@/lib/draw";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/runtime";
import type { DrawTier } from "@/lib/types";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin config missing" }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const drawMonth = new Date().toISOString().slice(0, 7);

  const { data: scoreRows } = await supabase.from("scores").select("score");
  const historicalScores = (scoreRows ?? []).map((row) => Number(row.score));
  const generatedNumbers = generateDrawNumbers("algorithmic_most_frequent", historicalScores);

  const { data: entries } = await supabase.from("draw_entries").select("user_id,numbers").eq("draw_month", drawMonth);
  const winnersByTier: Record<DrawTier, number> = { match_5: 0, match_4: 0, match_3: 0 };
  const winnerRows: Array<{ user_id: string; tier: DrawTier; match_count: number }> = [];

  for (const entry of entries ?? []) {
    const matchCount = countMatches(entry.numbers, generatedNumbers);
    const tier = resolveTier(matchCount);
    if (tier) {
      winnersByTier[tier] += 1;
      winnerRows.push({ user_id: entry.user_id, tier, match_count: matchCount });
    }
  }

  const { data: activeSubscribers } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("status", "active");
  const { data: previousDraw } = await supabase
    .from("draws")
    .select("rollover_amount")
    .order("draw_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const monthlyPrizePool = (activeSubscribers?.length ?? 0) * 25;
  const prizeDistribution = calculatePrizeDistribution(
    monthlyPrizePool,
    winnersByTier,
    Number(previousDraw?.rollover_amount ?? 0)
  );

  const { data: draw } = await supabase
    .from("draws")
    .upsert({
      draw_month: drawMonth,
      mode: "algorithmic_most_frequent",
      numbers: generatedNumbers,
      status: "published",
      winners_summary: winnersByTier,
      rollover_amount: prizeDistribution.rolloverToNextMonth,
      published_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (winnerRows.length > 0 && draw?.id) {
    await supabase.from("winners").insert(
      winnerRows.map((winner) => ({
        draw_id: draw.id,
        user_id: winner.user_id,
        tier: winner.tier,
        amount: prizeDistribution.byTier[winner.tier],
        verification_status: "pending_verification",
        payout_status: "pending"
      }))
    );
  }

  return NextResponse.json({
    drawMonth,
    numbers: generatedNumbers,
    winnersByTier,
    rollover: prizeDistribution.rolloverToNextMonth
  });
}

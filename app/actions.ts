"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { allocateSubscriptionContribution } from "@/lib/accounting";
import { requireRole, requireUser } from "@/lib/auth";
import { calculatePrizeDistribution, countMatches, generateDrawNumbers, resolveTier } from "@/lib/draw";
import { createSupabaseAdminClientSafe } from "@/lib/supabase/admin";
import { createSupabaseServerClient, createSupabaseServerClientSafe } from "@/lib/supabase/server";
import { getPaymentMode, isStripeConfigured, isSupabaseConfigured } from "@/lib/runtime";
import { getStripeClient } from "@/lib/stripe";
import type { DrawMode, DrawTier, SubscriptionPlan } from "@/lib/types";

const scoreInputSchema = z.object({
  score: z.coerce.number().int().min(1).max(45),
  playedAt: z.string().min(1)
});

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    redirect("/login?error=backend_unavailable");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) {
    redirect("/login?error=verify_email");
  }

  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const charityId = String(formData.get("charityId") ?? "").trim();
  const charityPercent = Number(formData.get("charityPercent") ?? "10");
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    redirect("/login?error=backend_unavailable");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/callback`
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await supabase.from("user_charity_settings").upsert({
      user_id: data.user.id,
      charity_id: charityId || null,
      contribution_percent: Math.max(10, charityPercent)
    });
  }

  redirect("/login?message=signup_success_verify_email");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClientSafe();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login?message=logged_out");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    redirect("/login?error=backend_unavailable");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password`
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/login?message=reset_email_sent");
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    redirect("/reset-password?error=password_too_short");
  }

  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    redirect("/reset-password?error=backend_unavailable");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/login?message=password_reset_success");
}

export async function submitScoreAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard?error=backend_unavailable");
  }
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const parsed = scoreInputSchema.parse({
    score: formData.get("score"),
    playedAt: formData.get("playedAt")
  });

  const { error } = await supabase.rpc("insert_user_score", {
    p_user_id: user.id,
    p_score: parsed.score,
    p_played_at: new Date(parsed.playedAt).toISOString()
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function createCheckoutSessionAction(plan: SubscriptionPlan) {
  const user = await requireUser();
  const paymentMode = getPaymentMode();

  if (paymentMode === "mock") {
    const supabase = createSupabaseAdminClientSafe();
    if (!supabase) {
      redirect("/dashboard?error=backend_unavailable");
    }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (plan === "monthly" ? 1 : 12));

    await supabase.from("subscriptions").insert({
      user_id: user.id,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      plan,
      status: "active",
      renewal_date: renewalDate.toISOString()
    });

    const { data: preference } = await supabase
      .from("user_charity_settings")
      .select("contribution_percent")
      .eq("user_id", user.id)
      .maybeSingle();

    const fallbackAmount = plan === "monthly"
      ? Number(process.env.MOCK_PRICE_MONTHLY ?? "99")
      : Number(process.env.MOCK_PRICE_YEARLY ?? "999");

    await recordSubscriptionLedgerAction({
      userId: user.id,
      subscriptionAmount: fallbackAmount,
      charityPercent: Number(preference?.contribution_percent ?? 10),
      eventType: "subscription_paid_mock"
    });

    redirect("/dashboard?billing=success&mode=mock");
  }

  if (!isStripeConfigured()) {
    redirect("/dashboard?error=stripe_not_configured");
  }

  const stripe = getStripeClient();
  const priceId = plan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_YEARLY;

  if (!priceId || !process.env.APP_URL) {
    redirect("/dashboard?error=stripe_env_missing");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${process.env.APP_URL}/dashboard?billing=success`,
    cancel_url: `${process.env.APP_URL}/dashboard?billing=cancelled`,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      plan
    }
  });

  if (!session.url) {
    redirect("/dashboard?error=checkout_session_failed");
  }

  redirect(session.url);
}

export async function updateCharityPreferenceAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard?error=backend_unavailable");
  }
  const user = await requireUser();
  const charityId = String(formData.get("charityId") ?? "");
  const contributionPercent = Math.max(10, Number(formData.get("contributionPercent") ?? "10"));
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_charity_settings").upsert({
    user_id: user.id,
    charity_id: charityId,
    contribution_percent: contributionPercent
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function simulateDrawAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/admin?error=backend_unavailable");
  }
  await requireRole(["admin"]);
  const mode = String(formData.get("mode") ?? "random") as DrawMode;
  const supabase = createSupabaseAdminClientSafe();
  if (!supabase) {
    redirect("/admin?error=backend_unavailable");
  }
  const drawMonth = String(formData.get("drawMonth") ?? new Date().toISOString().slice(0, 7));

  const { data: scoreRows } = await supabase.from("scores").select("score");
  const historicalScores = (scoreRows ?? []).map((row) => Number(row.score));
  const generatedNumbers = generateDrawNumbers(mode, historicalScores);

  const { data: entries } = await supabase
    .from("draw_entries")
    .select("id,user_id,numbers")
    .eq("draw_month", drawMonth);

  const winnersByTier: Record<DrawTier, number> = { match_5: 0, match_4: 0, match_3: 0 };
  for (const entry of entries ?? []) {
    const matches = countMatches(entry.numbers, generatedNumbers);
    const tier = resolveTier(matches);
    if (tier) {
      winnersByTier[tier] += 1;
    }
  }

  const { data: activeSubscribers } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active");

  const monthlyPrizePool = (activeSubscribers?.length ?? 0) * 25;
  const { data: previousDraw } = await supabase
    .from("draws")
    .select("rollover_amount")
    .order("draw_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prizeDistribution = calculatePrizeDistribution(monthlyPrizePool, winnersByTier, Number(previousDraw?.rollover_amount ?? 0));

  const { error } = await supabase.from("draws").upsert({
    draw_month: drawMonth,
    mode,
    numbers: generatedNumbers,
    status: "simulated",
    winners_summary: winnersByTier,
    rollover_amount: prizeDistribution.rolloverToNextMonth
  });

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
}

export async function publishDrawAction(drawId: string) {
  if (!isSupabaseConfigured()) {
    redirect("/admin?error=backend_unavailable");
  }
  await requireRole(["admin"]);
  const supabase = createSupabaseAdminClientSafe();
  if (!supabase) {
    redirect("/admin?error=backend_unavailable");
  }
  const { data: draw } = await supabase
    .from("draws")
    .select("*")
    .eq("id", drawId)
    .single();

  if (!draw) {
    redirect("/admin?error=draw_not_found");
  }

  const { data: entries } = await supabase
    .from("draw_entries")
    .select("id,user_id,numbers")
    .eq("draw_month", draw.draw_month);

  const winnersByTier: Record<DrawTier, number> = { match_5: 0, match_4: 0, match_3: 0 };
  const winners: Array<{ user_id: string; tier: DrawTier; match_count: number }> = [];
  for (const entry of entries ?? []) {
    const matchCount = countMatches(entry.numbers, draw.numbers);
    const tier = resolveTier(matchCount);
    if (!tier) {
      continue;
    }
    winnersByTier[tier] += 1;
    winners.push({ user_id: entry.user_id, tier, match_count: matchCount });
  }

  const { data: activeSubscribers } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active");
  const monthlyPrizePool = (activeSubscribers?.length ?? 0) * 25;
  const prizeDistribution = calculatePrizeDistribution(
    monthlyPrizePool,
    winnersByTier,
    Number(draw.rollover_amount ?? 0)
  );

  if (winners.length > 0) {
    const rows = winners.map((winner) => ({
      draw_id: draw.id,
      user_id: winner.user_id,
      tier: winner.tier,
      amount: prizeDistribution.byTier[winner.tier],
      verification_status: "pending_verification",
      payout_status: "pending"
    }));
    await supabase.from("winners").insert(rows);
  }

  await supabase
    .from("draws")
    .update({
      status: "published",
      winners_summary: winnersByTier,
      rollover_amount: prizeDistribution.rolloverToNextMonth,
      published_at: new Date().toISOString()
    })
    .eq("id", draw.id);

  revalidatePath("/admin");
}

export async function updateWinnerStatusAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/admin?error=backend_unavailable");
  }
  await requireRole(["admin"]);
  const winnerId = String(formData.get("winnerId") ?? "");
  const verificationStatus = String(formData.get("verificationStatus") ?? "pending_verification");
  const payoutStatus = String(formData.get("payoutStatus") ?? "pending");
  const supabase = createSupabaseAdminClientSafe();
  if (!supabase) {
    redirect("/admin?error=backend_unavailable");
  }

  const { error } = await supabase
    .from("winners")
    .update({
      verification_status: verificationStatus,
      payout_status: payoutStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", winnerId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
}

export async function uploadWinnerProofAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard?error=backend_unavailable");
  }
  const user = await requireUser();
  const winnerId = String(formData.get("winnerId") ?? "");
  const file = formData.get("proofFile");
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    redirect("/dashboard?error=backend_unavailable");
  }

  if (!(file instanceof File)) {
    redirect("/dashboard?error=proof_file_required");
  }

  const filePath = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("winner-proofs")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    redirect(`/dashboard?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data } = supabase.storage.from("winner-proofs").getPublicUrl(filePath);

  const { error } = await supabase.from("winner_verifications").insert({
    winner_id: winnerId,
    user_id: user.id,
    proof_url: data.publicUrl,
    status: "pending_verification"
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}

export async function recordSubscriptionLedgerAction(params: {
  userId: string;
  subscriptionAmount: number;
  charityPercent: number;
  eventType: string;
}) {
  const supabase = createSupabaseAdminClientSafe();
  if (!supabase) {
    return;
  }
  const allocation = allocateSubscriptionContribution({
    subscriptionAmount: params.subscriptionAmount,
    charityPercent: params.charityPercent
  });

  await supabase.from("prize_pool_ledger").insert({
    user_id: params.userId,
    event_type: params.eventType,
    subscription_amount: params.subscriptionAmount,
    charity_amount: allocation.charityAmount,
    prize_pool_amount: allocation.prizePoolAmount,
    retained_amount: allocation.retainedAmount
  });
}

export async function updateUserRoleAction(formData: FormData) {
  await requireRole(["admin"]);
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  if (!targetUserId || !["visitor", "subscriber", "admin"].includes(nextRole)) {
    redirect("/admin?error=invalid_role_update");
  }

  const supabase = createSupabaseAdminClientSafe();
  if (!supabase) {
    redirect("/admin?error=backend_unavailable");
  }

  const { data: actingUserRow } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", (await requireUser()).id)
    .single();
  if (!actingUserRow || actingUserRow.role !== "admin") {
    redirect("/admin?error=forbidden");
  }

  const { data: currentTarget } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetUserId)
    .single();

  if (currentTarget?.role === "admin" && nextRole !== "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      redirect("/admin?error=cannot_demote_last_admin");
    }
  }

  const { error } = await supabase.from("profiles").update({ role: nextRole }).eq("id", targetUserId);
  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: actingUserRow.id,
    action: "role_changed",
    entity: "profiles",
    entity_id: targetUserId,
    metadata: {
      previousRole: currentTarget?.role ?? null,
      nextRole
    }
  });

  revalidatePath("/admin");
  redirect("/admin?message=role_updated");
}

import {
  createCheckoutSessionAction,
  submitScoreAction,
  updateCharityPreferenceAction,
  uploadWinnerProofAction
} from "@/app/actions";
import { getSessionContext, requireActiveSubscription } from "@/lib/auth";
import { getPaymentMode } from "@/lib/runtime";
import { createSupabaseServerClientSafe } from "@/lib/supabase/server";
import { StatusBanner } from "@/components/status-banner";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function checkoutActionFactory(plan: "monthly" | "yearly") {
  "use server";
  await createCheckoutSessionAction(plan);
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSessionContext();
  if (!session.userId) {
    redirect("/login?error=auth_required");
  }
  if (!session.emailVerified) {
    redirect("/login?error=verify_email");
  }

  const supabase = await createSupabaseServerClientSafe();
  const paymentMode = getPaymentMode();
  const backendReady = Boolean(supabase);

  let subscription = { isActive: false, renewalDate: null as string | null };
  let scores: { data: any[] | null } = { data: [] };
  let charities: { data: any[] | null } = { data: [] };
  let preference: { data: any | null } = { data: null };
  let winners: { data: any[] | null } = { data: [] };
  let drawEntries: { data: any[] | null } = { data: [] };

  if (supabase) {
    [subscription, scores, charities, preference, winners, drawEntries] = await Promise.all([
      requireActiveSubscription(session.userId),
      supabase.from("scores").select("id,score,played_at,created_at").eq("user_id", session.userId).order("played_at", { ascending: false }),
      supabase.from("charities").select("id,name").order("name", { ascending: true }),
      supabase.from("user_charity_settings").select("charity_id,contribution_percent").eq("user_id", session.userId).maybeSingle(),
      supabase
        .from("winners")
        .select("id,amount,verification_status,payout_status,draw_id")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false }),
      supabase.from("draw_entries").select("id").eq("user_id", session.userId)
    ]);
  }

  const error = typeof params.error === "string" ? params.error : "";
  const billing = typeof params.billing === "string" ? params.billing : "";
  const mode = typeof params.mode === "string" ? params.mode : "";
  const totalWon = (winners.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <section className="shell py-10">
      {paymentMode === "mock" ? (
        <StatusBanner
          title="Demo payment mode active"
          message="Stripe is not configured. Subscription buttons use assignment-safe mock activation so all flows remain functional."
        />
      ) : null}
      {!backendReady ? (
        <StatusBanner
          title="Dashboard in limited mode"
          message="Backend is not configured. You can navigate this page, but data actions are disabled."
        />
      ) : null}
      {error ? <StatusBanner title="Dashboard notice" message={decodeURIComponent(error.replaceAll("_", " "))} /> : null}
      {billing === "success" ? (
        <StatusBanner
          title="Subscription updated"
          message={mode === "mock" ? "Mock subscription activated successfully." : "Subscription checkout completed successfully."}
        />
      ) : null}

      <h1 className="text-3xl font-black">Subscriber Dashboard</h1>
      <p className="mt-2 text-sm text-ink/70">
        Track subscription, scores, charity contribution, participation, and winner verification.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article className="card">
          <h2 className="font-bold">Subscription status</h2>
          <p className="mt-2 text-sm">
            {subscription.isActive ? "Active" : "Inactive"} | Renewal: {subscription.renewalDate ?? "N/A"}
          </p>
          <div className="mt-3 flex gap-2">
            <form action={checkoutActionFactory.bind(null, "monthly")}>
              <button className="btn-primary disabled:opacity-50" type="submit" disabled={!backendReady}>
                {paymentMode === "mock" ? "Activate Monthly (Demo)" : "Monthly Plan"}
              </button>
            </form>
            <form action={checkoutActionFactory.bind(null, "yearly")}>
              <button className="btn-secondary disabled:opacity-50" type="submit" disabled={!backendReady}>
                {paymentMode === "mock" ? "Activate Yearly (Demo)" : "Yearly Plan"}
              </button>
            </form>
          </div>
        </article>

        <article className="card">
          <h2 className="font-bold">Participation summary</h2>
          <p className="mt-2 text-sm">Draws entered: {drawEntries.data?.length ?? 0}</p>
          <p className="text-sm">Upcoming draw: First day of next month</p>
        </article>

        <article className="card">
          <h2 className="font-bold">Winnings</h2>
          <p className="mt-2 text-sm">Total won: ${totalWon.toFixed(2)}</p>
          <p className="text-sm">Latest payout: {winners.data?.[0]?.payout_status ?? "N/A"}</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-xl font-bold">Score entry (Stableford)</h2>
          <p className="mt-2 text-sm text-ink/70">Range 1-45, latest 5 scores retained automatically.</p>
          <form action={submitScoreAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="score" className="field" type="number" min={1} max={45} placeholder="Score" required disabled={!backendReady} />
            <input name="playedAt" className="field" type="date" required disabled={!backendReady} />
            <button type="submit" className="btn-primary sm:col-span-2 disabled:opacity-50" disabled={!backendReady}>
              Save score
            </button>
          </form>
          <ul className="mt-5 space-y-2 text-sm">
            {(scores.data ?? []).map((row) => (
              <li key={row.id} className="rounded-xl border border-ink/10 p-2">
                Score {row.score} | {new Date(row.played_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2 className="text-xl font-bold">Charity preference</h2>
          <form action={updateCharityPreferenceAction} className="mt-4 space-y-3">
            <select name="charityId" className="field" defaultValue={preference.data?.charity_id ?? ""} disabled={!backendReady}>
              <option value="">Select charity</option>
              {(charities.data ?? []).map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name}
                </option>
              ))}
            </select>
            <input
              name="contributionPercent"
              type="number"
              min={10}
              max={100}
              defaultValue={preference.data?.contribution_percent ?? 10}
              className="field"
              disabled={!backendReady}
            />
            <button className="btn-primary disabled:opacity-50" type="submit" disabled={!backendReady}>
              Update preference
            </button>
          </form>

          <h3 className="mt-6 font-semibold">Winner proof upload</h3>
          <form action={uploadWinnerProofAction} className="mt-3 space-y-3">
            <select name="winnerId" className="field" required defaultValue="" disabled={!backendReady}>
              <option value="">Select winner record</option>
              {(winners.data ?? []).map((winner) => (
                <option key={winner.id} value={winner.id}>
                  {winner.draw_id} | ${Number(winner.amount).toFixed(2)}
                </option>
              ))}
            </select>
            <input name="proofFile" type="file" accept="image/*" className="field" required disabled={!backendReady} />
            <button className="btn-secondary disabled:opacity-50" type="submit" disabled={!backendReady}>
              Upload proof
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}

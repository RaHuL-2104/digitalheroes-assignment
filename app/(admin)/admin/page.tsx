import { publishDrawAction, simulateDrawAction, updateUserRoleAction, updateWinnerStatusAction } from "@/app/actions";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClientSafe } from "@/lib/supabase/server";
import type { DrawMode } from "@/lib/types";
import { redirect } from "next/navigation";
import { StatusBanner } from "@/components/status-banner";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function publishActionFactory(drawId: string) {
  "use server";
  await publishDrawAction(drawId);
}

const drawModes: Array<{ label: string; value: DrawMode }> = [
  { label: "Random", value: "random" },
  { label: "Algorithmic (Most Frequent)", value: "algorithmic_most_frequent" },
  { label: "Algorithmic (Least Frequent)", value: "algorithmic_least_frequent" }
];

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  const session = await getSessionContext();
  if (!session.userId) {
    redirect("/login?error=auth_required");
  }
  if (!session.emailVerified) {
    redirect("/login?error=verify_email");
  }
  if (session.role !== "admin") {
    redirect("/?error=forbidden");
  }

  const supabase = await createSupabaseServerClientSafe();
  const backendReady = Boolean(supabase);

  let users: { data: any[] | null } = { data: [] };
  let subscriptions: { data: any[] | null } = { data: [] };
  let draws: { data: any[] | null } = { data: [] };
  let charities: { data: any[] | null } = { data: [] };
  let winners: { data: any[] | null } = { data: [] };
  let ledger: { data: any[] | null } = { data: [] };

  if (supabase) {
    [users, subscriptions, draws, charities, winners, ledger] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,role").order("created_at", { ascending: false }).limit(50),
      supabase.from("subscriptions").select("id,user_id,plan,status,renewal_date").order("created_at", { ascending: false }).limit(20),
      supabase.from("draws").select("id,draw_month,mode,status,numbers,rollover_amount").order("draw_month", { ascending: false }).limit(12),
      supabase.from("charities").select("id,name,is_featured,country_code").order("name", { ascending: true }),
      supabase
        .from("winners")
        .select("id,user_id,tier,amount,verification_status,payout_status,draw_id")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("prize_pool_ledger").select("charity_amount,prize_pool_amount")
    ]);
  }

  const analytics = {
    totalUsers: users.data?.length ?? 0,
    totalPrizePool: (ledger.data ?? []).reduce((sum, row) => sum + Number(row.prize_pool_amount), 0),
    totalCharity: (ledger.data ?? []).reduce((sum, row) => sum + Number(row.charity_amount), 0),
    publishedDraws: (draws.data ?? []).filter((row) => row.status === "published").length
  };

  return (
    <section className="shell py-10">
      {!backendReady ? (
        <StatusBanner
          title="Admin in limited mode"
          message="Backend is not configured. You can access the admin shell, but management actions are disabled."
        />
      ) : null}
      {error ? <StatusBanner title="Admin notice" message={decodeURIComponent(error.replaceAll("_", " "))} /> : null}
      {message ? <StatusBanner title="Admin update" message={decodeURIComponent(message.replaceAll("_", " "))} /> : null}

      <h1 className="text-3xl font-black">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-ink/70">Full controls for users, draws, charities, winners, and reporting.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <article className="card">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Total users</p>
          <p className="mt-2 text-2xl font-bold">{analytics.totalUsers}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Prize pool total</p>
          <p className="mt-2 text-2xl font-bold">${analytics.totalPrizePool.toFixed(2)}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Charity total</p>
          <p className="mt-2 text-2xl font-bold">${analytics.totalCharity.toFixed(2)}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Published draws</p>
          <p className="mt-2 text-2xl font-bold">{analytics.publishedDraws}</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-xl font-bold">Draw management</h2>
          <form action={simulateDrawAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="drawMonth" type="month" className="field" defaultValue={new Date().toISOString().slice(0, 7)} disabled={!backendReady} />
            <select name="mode" className="field" defaultValue="random" disabled={!backendReady}>
              {drawModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary sm:col-span-2 disabled:opacity-50" disabled={!backendReady}>
              Simulate Draw
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {(draws.data ?? []).map((draw) => (
              <div key={draw.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p>
                  {draw.draw_month} | {draw.mode} | {draw.status}
                </p>
                <p>Numbers: {(draw.numbers ?? []).join(", ") || "N/A"}</p>
                <p>Rollover: ${Number(draw.rollover_amount ?? 0).toFixed(2)}</p>
                <form action={publishActionFactory.bind(null, draw.id)} className="mt-2">
                  <button type="submit" className="btn-secondary disabled:opacity-50" disabled={!backendReady}>
                    Publish
                  </button>
                </form>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2 className="text-xl font-bold">Winner verification & payout</h2>
          <div className="mt-4 space-y-3">
            {(winners.data ?? []).map((winner) => (
              <form action={updateWinnerStatusAction} key={winner.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <input name="winnerId" type="hidden" value={winner.id} />
                <p>User: {winner.user_id}</p>
                <p>Tier: {winner.tier}</p>
                <p>Amount: ${Number(winner.amount).toFixed(2)}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select className="field" name="verificationStatus" defaultValue={winner.verification_status} disabled={!backendReady}>
                    <option value="pending_verification">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select className="field" name="payoutStatus" defaultValue={winner.payout_status} disabled={!backendReady}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <button className="btn-primary mt-2 disabled:opacity-50" type="submit" disabled={!backendReady}>
                  Update winner
                </button>
              </form>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="card">
          <h2 className="font-bold">Role management</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(users.data ?? []).map((user) => (
              <li key={user.id} className="rounded-xl border border-ink/10 p-2">
                <p className="mb-2">{user.full_name ?? user.email}</p>
                <form action={updateUserRoleAction} className="flex gap-2">
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <select name="role" defaultValue={user.role} className="field" disabled={!backendReady}>
                    <option value="visitor">visitor</option>
                    <option value="subscriber">subscriber</option>
                    <option value="admin">admin</option>
                  </select>
                  <button type="submit" className="btn-secondary whitespace-nowrap disabled:opacity-50" disabled={!backendReady}>
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2 className="font-bold">Subscriptions</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(subscriptions.data ?? []).map((sub) => (
              <li key={sub.id}>
                {sub.plan} | {sub.status} | {sub.renewal_date ?? "N/A"}
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2 className="font-bold">Charities</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(charities.data ?? []).map((charity) => (
              <li key={charity.id}>
                {charity.name} | {charity.country_code} | {charity.is_featured ? "featured" : "standard"}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

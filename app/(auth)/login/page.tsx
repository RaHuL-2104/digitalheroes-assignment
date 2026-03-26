import Link from "next/link";
import { forgotPasswordAction, loginAction, signupAction } from "@/app/actions";
import { StatusBanner } from "@/components/status-banner";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClientSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSessionContext();
  if (session.userId && session.emailVerified) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClientSafe();
  const backendReady = Boolean(supabase);
  const { data: charities } = supabase
    ? await supabase.from("charities").select("id,name").order("is_featured", { ascending: false }).order("name", { ascending: true })
    : { data: [] as Array<{ id: string; name: string }> };

  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <section className="shell py-10">
      {!backendReady ? (
        <StatusBanner
          title="Backend setup required"
          message="Supabase environment variables are not configured yet. Navigation works, but auth actions are disabled until setup is complete."
        />
      ) : null}

      {error ? <StatusBanner title="Action needed" message={decodeURIComponent(error.replaceAll("_", " "))} /> : null}
      {message ? <StatusBanner title="Update" message={decodeURIComponent(message.replaceAll("_", " "))} /> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <article className="card">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="mt-2 text-sm text-ink/70">Access subscriber and admin panels.</p>
          <form action={loginAction} className="mt-6 space-y-3">
            <input name="email" type="email" placeholder="Email" className="field" required disabled={!backendReady} />
            <input name="password" type="password" placeholder="Password" className="field" required disabled={!backendReady} />
            <button type="submit" className="btn-primary w-full disabled:opacity-50" disabled={!backendReady}>
              Continue
            </button>
          </form>
          <form action={forgotPasswordAction} className="mt-4 flex gap-2">
            <input name="email" type="email" placeholder="Forgot password? Enter email" className="field" required disabled={!backendReady} />
            <button type="submit" className="btn-secondary whitespace-nowrap disabled:opacity-50" disabled={!backendReady}>
              Send reset
            </button>
          </form>
        </article>

        <article className="card">
          <h2 className="text-2xl font-bold">Create account</h2>
          <p className="mt-2 text-sm text-ink/70">Includes charity selection and contribution percentage.</p>
          <form action={signupAction} className="mt-6 space-y-3">
            <input name="fullName" placeholder="Full name" className="field" required disabled={!backendReady} />
            <input name="email" type="email" placeholder="Email" className="field" required disabled={!backendReady} />
            <input name="password" type="password" placeholder="Password (8+ chars)" className="field" required disabled={!backendReady} />
            <select name="charityId" className="field" defaultValue="" disabled={!backendReady}>
              <option value="">Select charity</option>
              {(charities ?? []).map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name}
                </option>
              ))}
            </select>
            <input
              name="charityPercent"
              type="number"
              min={10}
              max={100}
              defaultValue={10}
              className="field"
              required
              disabled={!backendReady}
            />
            <button type="submit" className="btn-primary w-full disabled:opacity-50" disabled={!backendReady}>
              Create account
            </button>
          </form>
          <p className="mt-4 text-xs text-ink/60">
            You will receive an email verification link before protected access is granted.
          </p>
        </article>
      </div>
      <p className="mt-6 text-sm text-ink/60">
        Need charity details first? Visit{" "}
        <Link href="/charities" className="text-ocean">
          directory
        </Link>
        .
      </p>
    </section>
  );
}

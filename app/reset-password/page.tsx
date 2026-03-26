import { resetPasswordAction } from "@/app/actions";
import { StatusBanner } from "@/components/status-banner";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <section className="shell py-10">
      {error ? <StatusBanner title="Reset password error" message={decodeURIComponent(error.replaceAll("_", " "))} /> : null}
      <article className="card mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">Set new password</h1>
        <p className="mt-2 text-sm text-ink/70">Enter a new password to complete your reset flow.</p>
        <form action={resetPasswordAction} className="mt-5 space-y-3">
          <input name="password" type="password" minLength={8} required placeholder="New password" className="field" />
          <button className="btn-primary w-full" type="submit">
            Update password
          </button>
        </form>
      </article>
    </section>
  );
}

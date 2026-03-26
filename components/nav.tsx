import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { getSessionContext } from "@/lib/auth";

export async function Nav() {
  const session = await getSessionContext();
  const isLoggedIn = Boolean(session.userId);

  return (
    <header className="border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="shell flex flex-wrap items-center justify-between gap-3 py-4">
        <Link href="/" className="text-lg font-bold text-pine">
          ImpactDraw
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/charities" className="hover:text-ocean">
            Charities
          </Link>
          <Link href="/dashboard" className="hover:text-ocean">
            Dashboard
          </Link>
          <Link href="/admin" className="hover:text-ocean">
            Admin
          </Link>
          {isLoggedIn ? (
            <>
              <span className="hidden rounded-full bg-ink/5 px-2 py-1 text-xs uppercase tracking-wider text-ink/70 sm:inline">
                {session.role}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="btn-primary">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

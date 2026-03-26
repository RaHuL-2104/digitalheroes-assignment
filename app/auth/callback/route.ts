import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClientSafe } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const errorDescription = url.searchParams.get("error_description");
  const next = url.searchParams.get("next") ?? "/dashboard";

  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=backend_unavailable", url.origin));
  }

  try {
    if (errorDescription) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription)}`, url.origin)
      );
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
        );
      }
      return NextResponse.redirect(new URL("/login?message=account_confirmed_login_now", url.origin));
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      });
      if (error) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
        );
      }
      return NextResponse.redirect(new URL("/login?message=account_confirmed_login_now", url.origin));
    }
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent((error as Error).message)}`, url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

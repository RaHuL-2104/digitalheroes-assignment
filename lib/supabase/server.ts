import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/runtime";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase public env vars are missing.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      }
    }
  });
}

export async function createSupabaseServerClientSafe() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

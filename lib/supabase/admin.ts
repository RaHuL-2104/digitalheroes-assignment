import { createClient } from "@supabase/supabase-js";
import { isSupabaseAdminConfigured } from "@/lib/runtime";

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin env vars are missing.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createSupabaseAdminClientSafe() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

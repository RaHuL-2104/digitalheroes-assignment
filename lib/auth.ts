import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServerClientSafe } from "@/lib/supabase/server";
import type { UserRole, UserSessionContext } from "@/lib/types";

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    return "visitor";
  }

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error || !data?.role) {
    return "visitor";
  }
  return data.role as UserRole;
}

export async function getSessionContext(): Promise<UserSessionContext> {
  try {
    const supabase = await createSupabaseServerClientSafe();
    if (!supabase) {
      return {
        userId: null,
        role: "visitor",
        emailVerified: false,
        readiness: "degraded"
      };
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        userId: null,
        role: "visitor",
        emailVerified: false,
        readiness: "ready"
      };
    }

    const role = await getUserRole(user.id);
    return {
      userId: user.id,
      role,
      emailVerified: Boolean(user.email_confirmed_at),
      readiness: "ready"
    };
  } catch {
    return {
      userId: null,
      role: "visitor",
      emailVerified: false,
      readiness: "degraded"
    };
  }
}

export async function requireUser(requireVerified = true) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=auth_required");
  }
  if (requireVerified && !user.email_confirmed_at) {
    redirect("/login?error=verify_email");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[], requireVerified = true) {
  const user = await requireUser(requireVerified);
  const role = await getUserRole(user.id);

  if (!allowedRoles.includes(role)) {
    redirect("/?error=forbidden");
  }
  return { user, role };
}

export async function requireActiveSubscription(userId: string) {
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    return {
      isActive: false,
      renewalDate: null
    };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("status,renewal_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    isActive: data?.status === "active",
    renewalDate: data?.renewal_date ?? null
  };
}

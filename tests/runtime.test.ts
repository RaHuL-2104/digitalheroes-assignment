import { describe, expect, it } from "vitest";
import { isStripeConfigured, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/runtime";

describe("runtime readiness guards", () => {
  it("returns false when required env vars are missing", () => {
    const old = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
      STRIPE_PRICE_YEARLY: process.env.STRIPE_PRICE_YEARLY
    };

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_MONTHLY;
    delete process.env.STRIPE_PRICE_YEARLY;

    expect(isSupabaseConfigured()).toBe(false);
    expect(isSupabaseAdminConfigured()).toBe(false);
    expect(isStripeConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = old.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = old.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = old.SUPABASE_SERVICE_ROLE_KEY;
    process.env.STRIPE_SECRET_KEY = old.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = old.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_PRICE_MONTHLY = old.STRIPE_PRICE_MONTHLY;
    process.env.STRIPE_PRICE_YEARLY = old.STRIPE_PRICE_YEARLY;
  });
});

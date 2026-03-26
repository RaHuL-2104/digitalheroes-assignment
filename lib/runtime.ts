export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseAdminConfigured() {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_MONTHLY &&
      process.env.STRIPE_PRICE_YEARLY
  );
}

export function getPaymentMode(): "stripe" | "mock" {
  return isStripeConfigured() ? "stripe" : "mock";
}

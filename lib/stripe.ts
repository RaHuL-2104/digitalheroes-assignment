import Stripe from "stripe";

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }
  return new Stripe(key, {
    apiVersion: "2025-08-27.basil"
  });
}

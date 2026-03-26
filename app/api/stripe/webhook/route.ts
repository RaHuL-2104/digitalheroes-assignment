import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { recordSubscriptionLedgerAction } from "@/app/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, isSupabaseAdminConfigured } from "@/lib/runtime";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Stripe or Supabase admin config missing." }, { status: 503 });
  }
  const stripe = getStripeClient();
  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature/secret." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(error as Error).message}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.user_id;
      const plan = (session.metadata?.plan ?? "monthly") as "monthly" | "yearly";
      if (!userId) {
        break;
      }

      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + (plan === "monthly" ? 1 : 12));

      await supabase.from("subscriptions").insert({
        user_id: userId,
        stripe_subscription_id: String(session.subscription ?? ""),
        stripe_customer_id: String(session.customer ?? ""),
        plan,
        status: "active",
        renewal_date: renewalDate.toISOString()
      });

      const { data: preference } = await supabase
        .from("user_charity_settings")
        .select("contribution_percent")
        .eq("user_id", userId)
        .single();

      const amount = Number((session.amount_total ?? 0) / 100);
      await recordSubscriptionLedgerAction({
        userId,
        subscriptionAmount: amount,
        charityPercent: Number(preference?.contribution_percent ?? 10),
        eventType: "subscription_paid"
      });
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const currentPeriodEnd =
        (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ??
        subscription.items.data[0]?.current_period_end;
      let status: "active" | "canceled" | "lapsed" = "active";
      if (subscription.status === "canceled" || subscription.status === "unpaid") {
        status = "canceled";
      } else if (subscription.status === "incomplete_expired" || subscription.status === "past_due") {
        status = "lapsed";
      }

      await supabase
        .from("subscriptions")
        .update({
          status,
          renewal_date: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const subId = session.subscription as string;
    if (!userId || !subId) return NextResponse.json({ ok: true });

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);

    await supabase.from("billing_subscriptions").upsert(
      {
        user_id: userId,
        stripe_subscription_id: subId,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      },
      { onConflict: "user_id" }
    );

    await supabase
      .from("profiles")
      .update({
        plan: "pro",
        monthly_email_limit: 500,
      })
      .eq("id", userId);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const { data: billing } = await supabase
      .from("billing_subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", sub.id)
      .single();
    const userId = billing?.user_id ?? sub.metadata?.supabase_user_id;
    if (!userId) return NextResponse.json({ ok: true });

    if (sub.status === "canceled" || sub.status === "unpaid") {
      await supabase
        .from("profiles")
        .update({ plan: "free", monthly_email_limit: 20 })
        .eq("id", userId);
      await supabase
        .from("billing_subscriptions")
        .update({ status: sub.status })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("billing_subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          },
          { onConflict: "user_id" }
        );
    }
  }

  return NextResponse.json({ received: true });
}

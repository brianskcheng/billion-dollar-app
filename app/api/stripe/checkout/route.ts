import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!PRO_PRICE_ID) {
    return NextResponse.json(
      { error: "STRIPE_PRO_PRICE_ID not configured" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let customerId: string | null = null;
  const { data: billing } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (billing?.stripe_customer_id) {
    customerId = billing.stripe_customer_id as string;
  } else {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("billing_customers").upsert(
      { user_id: user.id, stripe_customer_id: customer.id },
      { onConflict: "user_id" }
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?stripe=success`,
    cancel_url: `${baseUrl}/dashboard`,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}

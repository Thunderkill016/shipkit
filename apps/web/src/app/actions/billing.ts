"use server";

import { getAuth } from "@/lib/auth";
import { getPayment, isStripeConfigured } from "@/lib/payment";

export type BillingActionState = { error: string | null; url?: string };

export async function startCheckoutAction(): Promise<BillingActionState> {
  if (!isStripeConfigured()) {
    return {
      error: "Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
    };
  }
  const user = await getAuth().getUser();
  if (!user?.email) {
    return { error: "Sign in required." };
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const session = await getPayment().createCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId: process.env.STRIPE_PRICE_ID!,
      successUrl: `${base}/app/billing?success=1`,
      cancelUrl: `${base}/app/billing?canceled=1`,
    });
    return { error: null, url: session.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Checkout failed" };
  }
}

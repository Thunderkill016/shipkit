import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { getPayment, isStripeConfigured } from "@/lib/payment";
import { CheckoutButton } from "./checkout-button";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const sp = await searchParams;
  const user = await getAuth().getUser();
  const stripeOn = isStripeConfigured();
  const status = user
    ? await getPayment().getSubscriptionStatus(user.id)
    : {
        active: false,
        planId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Open SaaS parity · billing</p>
          <h1 className="text-xl font-semibold">Billing</h1>
        </div>
        <Link href="/app" className="text-sm text-muted hover:text-foreground">
          ← App
        </Link>
      </header>

      {sp.success && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-card px-4 py-3 text-sm text-accent">
          Checkout completed (verify in Stripe Dashboard).
        </p>
      )}
      {sp.canceled && (
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
          Checkout canceled.
        </p>
      )}

      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 text-sm">
          <p className="text-muted">Stripe configured</p>
          <p className="mt-1 font-medium">{stripeOn ? "Yes" : "No (noop port)"}</p>
          <p className="mt-4 text-muted">Subscription active</p>
          <p className="mt-1 font-medium">{status.active ? "Yes" : "No / free"}</p>
          {status.planId && (
            <>
              <p className="mt-4 text-muted">Plan</p>
              <p className="mt-1 font-mono text-xs">{status.planId}</p>
            </>
          )}
        </div>

        {!user && (
          <p className="text-sm text-muted">
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>{" "}
            to start checkout.
          </p>
        )}

        {user && stripeOn && <CheckoutButton />}

        {user && !stripeOn && (
          <p className="text-sm text-muted">
            Set <code className="text-foreground">STRIPE_SECRET_KEY</code> and{" "}
            <code className="text-foreground">STRIPE_PRICE_ID</code> in{" "}
            <code className="text-foreground">.env.local</code> to enable checkout (mốc Open SaaS /
            ShipFast).
          </p>
        )}
      </div>
    </div>
  );
}

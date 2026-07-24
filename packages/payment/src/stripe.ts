import Stripe from "stripe";
import type {
  BillingPortalOptions,
  CheckoutSession,
  CheckoutSessionOptions,
  PaymentPort,
  SubscriptionStatus,
} from "./index";

/**
 * Stripe adapter — only instantiated when STRIPE_SECRET_KEY is set.
 */
export function createStripePaymentPort(secretKey: string): PaymentPort {
  const stripe = new Stripe(secretKey);

  return {
    async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession> {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: options.email,
        line_items: [{ price: options.priceId, quantity: 1 }],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        client_reference_id: options.userId,
        metadata: {
          userId: options.userId,
          ...options.metadata,
        },
      });
      if (!session.url) {
        throw new Error("[cyclewarden/payment] Stripe session missing url");
      }
      return { url: session.url, sessionId: session.id };
    },

    async createBillingPortalSession(options: BillingPortalOptions): Promise<string> {
      const customers = await stripe.customers.list({
        email: options.email,
        limit: 1,
      });
      let customerId = customers.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({
          email: options.email,
          metadata: { userId: options.userId },
        });
        customerId = created.id;
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: options.returnUrl,
      });
      return portal.url;
    },

    async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
      const customers = await stripe.customers.search({
        query: `metadata["userId"]:"${userId.replace(/"/g, "")}"`,
        limit: 1,
      });
      const customer = customers.data[0];
      if (!customer) {
        return {
          active: false,
          planId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });
      const mine = subs.data[0];
      if (!mine) {
        return {
          active: false,
          planId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }
      // Stripe SDK typings vary by version — read period end defensively
      const raw = mine as unknown as {
        current_period_end?: number;
        cancel_at_period_end?: boolean;
        items: { data: { price: { id: string } }[] };
      };
      return {
        active: true,
        planId: raw.items.data[0]?.price.id ?? null,
        currentPeriodEnd: raw.current_period_end
          ? new Date(raw.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: Boolean(raw.cancel_at_period_end),
      };
    },
  };
}

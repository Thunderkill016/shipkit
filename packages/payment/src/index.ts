/**
 * PaymentPort — framework-agnostic billing contract.
 *
 * Design intent:
 * - Keep Stripe (or any other provider) SDK confined to `lib/adapters/stripe/`.
 * - Product code only imports `PaymentPort` — never the Stripe SDK directly.
 * - Start with `createNoopPaymentPort` (always free) and upgrade to Stripe
 *   when billing is needed, without touching product code.
 *
 * @see docs/ADAPTER_GUIDE.md for how to write a concrete adapter.
 */

export interface CheckoutSessionOptions {
  /** User / customer ID in your system */
  userId: string;
  /** Email of the buyer */
  email: string;
  /** Price or plan identifier (e.g. Stripe Price ID or internal plan key) */
  priceId: string;
  /** URL to redirect to after success */
  successUrl: string;
  /** URL to redirect to if user cancels */
  cancelUrl: string;
  /** Arbitrary key-value metadata to attach to the session */
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  /** Redirect the user here to complete payment */
  url: string;
  /** Provider-specific session ID */
  sessionId: string;
}

export interface BillingPortalOptions {
  userId: string;
  email: string;
  returnUrl: string;
}

export interface SubscriptionStatus {
  active: boolean;
  planId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentPort {
  /**
   * Create a checkout session and return the URL to redirect the user to.
   */
  createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession>;

  /**
   * Return the URL of the billing portal where the user can manage subscription.
   */
  createBillingPortalSession(options: BillingPortalOptions): Promise<string>;

  /**
   * Get the subscription status for a user.
   */
  getSubscriptionStatus(userId: string): Promise<SubscriptionStatus>;
}

/**
 * No-op adapter — always returns "free plan / no billing".
 * Use this until you wire up a real payment provider.
 */
export function createNoopPaymentPort(): PaymentPort {
  return {
    async createCheckoutSession() {
      throw new Error(
        "[shipkit/payment] No payment adapter configured. " +
          "Set STRIPE_SECRET_KEY (+ STRIPE_PRICE_ID) — see packages/payment and /app/billing."
      );
    },

    async createBillingPortalSession() {
      throw new Error(
        "[shipkit/payment] No payment adapter configured. " +
          "Set STRIPE_SECRET_KEY — see packages/payment and /app/billing."
      );
    },

    async getSubscriptionStatus() {
      return {
        active: false,
        planId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    },
  };
}

export { createStripePaymentPort } from "./stripe";

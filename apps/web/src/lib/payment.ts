import {
  createNoopPaymentPort,
  createStripePaymentPort,
  type PaymentPort,
} from "@shipkit/payment";

let cached: PaymentPort | null = null;

/** Stripe when STRIPE_SECRET_KEY set; otherwise noop (status free). */
export function getPayment(): PaymentPort {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? createStripePaymentPort(key) : createNoopPaymentPort();
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

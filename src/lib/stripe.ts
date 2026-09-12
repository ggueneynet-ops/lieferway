import Stripe from "stripe";

let stripe: Stripe | null = null;

export function stripeSecretKey() {
  return (process.env.STRIPE_SECRET_KEY ?? "").trim();
}

export function stripePublishableKey() {
  return (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
}

export function stripeWebhookSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey() && stripePublishableKey());
}

export function isStripeTestMode() {
  const key = stripeSecretKey();
  return key.startsWith("sk_test_");
}

export function getStripe(): Stripe {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_UNCONFIGURED");
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function resetStripeClient() {
  stripe = null;
}

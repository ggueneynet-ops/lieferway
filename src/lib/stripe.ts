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

/** Reject live keys and secret/publishable mix-ups. Lieferway runs TEST MODE only. */
export function assertStripeKeySeparation() {
  const sk = stripeSecretKey();
  const pk = stripePublishableKey();
  if (sk && !sk.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY must start with sk_test_ (test mode)");
  }
  if (pk && !pk.startsWith("pk_")) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_");
  }
  if (pk.startsWith("sk_") || sk.startsWith("pk_")) {
    throw new Error("STRIPE_KEY_MIXUP: secret and publishable keys are swapped");
  }
  if (sk.startsWith("sk_live_") || pk.startsWith("pk_live_")) {
    throw new Error("STRIPE_LIVE_FORBIDDEN: live Stripe keys are not allowed");
  }
}

export function isStripeConfigured() {
  if (!stripeSecretKey() || !stripePublishableKey()) return false;
  try {
    assertStripeKeySeparation();
    return true;
  } catch {
    return false;
  }
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
  assertStripeKeySeparation();
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function resetStripeClient() {
  stripe = null;
}

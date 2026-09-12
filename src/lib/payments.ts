import type Stripe from "stripe";
import type { PaymentMethod } from "./constants";
import { getStripe, isStripeConfigured } from "./stripe";
import { computeApplicationFeeCents } from "./stripe-fees";

export type PaymentIntent = {
  id: string;
  clientSecret: string;
  amountCents: number;
  currency: "eur";
  method: PaymentMethod;
  status: "requires_confirmation" | "succeeded" | "cash" | "pending";
  provider: "stripe" | "stripe-mock";
};

export type DestinationChargeInput = {
  amountCents: number;
  applicationFeeCents: number;
  destinationAccountId: string;
  method: PaymentMethod;
  metadata: Record<string, string>;
  customerEmail?: string | null;
};

export function platformApplicationFeeCents(opts: {
  foodSubtotalCents: number;
  commissionPercent: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
}) {
  return computeApplicationFeeCents({
    amountCents: opts.totalCents,
    foodSubtotalCents: opts.foodSubtotalCents,
    commissionPercent: opts.commissionPercent,
    deliveryFeeCents: opts.deliveryFeeCents,
    discountCents: opts.discountCents,
  }).applicationFeeCents;
}

export function weeklyMondayPayoutSchedule(): Stripe.AccountUpdateParams.Settings.Payouts.Schedule {
  return {
    interval: "weekly",
    weekly_anchor: "monday",
  };
}

/** Destination PaymentIntent: transfer to the restaurant, fee = platform share. */
export async function createDestinationPaymentIntent(
  opts: DestinationChargeInput,
): Promise<PaymentIntent> {
  if (opts.method === "CASH") {
    return {
      id: `cash_${crypto.randomUUID().slice(0, 8)}`,
      clientSecret: "",
      amountCents: opts.amountCents,
      currency: "eur",
      method: "CASH",
      status: "cash",
      provider: isStripeConfigured() ? "stripe" : "stripe-mock",
    };
  }
  if (!isStripeConfigured()) {
    throw new Error("STRIPE_UNCONFIGURED");
  }
  if (opts.amountCents < 50) {
    throw new Error("Betrag zu niedrig für Kartenzahlung.");
  }
  const stripe = getStripe();
  const fee = Math.min(opts.applicationFeeCents, Math.max(0, opts.amountCents - 1));
  const intent = await stripe.paymentIntents.create({
    amount: opts.amountCents,
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    application_fee_amount: fee,
    transfer_data: { destination: opts.destinationAccountId },
    metadata: opts.metadata,
    receipt_email: opts.customerEmail || undefined,
    description: opts.metadata.shortCode
      ? `Lieferway ${opts.metadata.shortCode}`
      : "Lieferway Bestellung",
  });
  return {
    id: intent.id,
    clientSecret: intent.client_secret ?? "",
    amountCents: intent.amount,
    currency: "eur",
    method: opts.method,
    status: "requires_confirmation",
    provider: "stripe",
  };
}

export async function cancelPaymentIntent(id: string) {
  if (!id || id.startsWith("cash_") || id.startsWith("pi_mock_")) return;
  if (!isStripeConfigured()) return;
  const stripe = getStripe();
  try {
    await stripe.paymentIntents.cancel(id);
  } catch {
    /* already canceled or succeeded */
  }
}

/** @deprecated Demo helper — online checkout no longer confirms client-side. */
export function createMockPaymentIntent(opts: {
  amountCents: number;
  method: PaymentMethod;
}): PaymentIntent {
  const id = `pi_mock_${crypto.randomUUID().slice(0, 8)}`;
  if (opts.method === "CASH") {
    return {
      id,
      clientSecret: `${id}_secret_cash`,
      amountCents: opts.amountCents,
      currency: "eur",
      method: opts.method,
      status: "cash",
      provider: "stripe-mock",
    };
  }
  return {
    id,
    clientSecret: `${id}_secret_live`,
    amountCents: opts.amountCents,
    currency: "eur",
    method: opts.method,
    status: "requires_confirmation",
    provider: "stripe-mock",
  };
}

export function confirmMockPayment(intent: PaymentIntent): PaymentIntent {
  if (intent.method === "CASH") return { ...intent, status: "cash" };
  return { ...intent, status: "succeeded" };
}

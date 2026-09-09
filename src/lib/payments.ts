import type { PaymentMethod } from "./constants";

export type PaymentIntent = {
  id: string;
  clientSecret: string;
  amountCents: number;
  currency: "eur";
  method: PaymentMethod;
  status: "requires_confirmation" | "succeeded" | "cash";
  provider: "stripe-mock";
};

/** Swap this module for Stripe PaymentIntents later. */
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

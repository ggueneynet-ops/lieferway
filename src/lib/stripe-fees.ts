import { commissionCents } from "./money";

/** 1.5 % — Stripe EEA consumer cards (test-mode default, overridable). */
export const DEFAULT_STRIPE_FEE_PERCENT_BPS = 150;
/** 0,25 € fixed Stripe fee (test-mode default, overridable). */
export const DEFAULT_STRIPE_FEE_FIXED_CENTS = 25;

export function stripeFeePercentBps() {
  const raw = Number(process.env.STRIPE_FEE_PERCENT_BPS);
  if (Number.isFinite(raw) && raw >= 0) return Math.round(raw);
  return DEFAULT_STRIPE_FEE_PERCENT_BPS;
}

export function stripeFeeFixedCents() {
  const raw = Number(process.env.STRIPE_FEE_FIXED_CENTS);
  if (Number.isFinite(raw) && raw >= 0) return Math.round(raw);
  return DEFAULT_STRIPE_FEE_FIXED_CENTS;
}

/**
 * Destination charges: Stripe takes its processing fee from the **platform**.
 * Estimate = fixed + round(amount × bps / 10_000). Defaults: 1.5 % + 0,25 €.
 */
export function estimateStripeFeeCents(amountCents: number, _method?: string) {
  if (amountCents <= 0) return 0;
  return stripeFeeFixedCents() + Math.round((amountCents * stripeFeePercentBps()) / 10_000);
}

export type ApplicationFeeInput = {
  amountCents: number;
  foodSubtotalCents: number;
  commissionPercent: number;
  deliveryFeeCents?: number;
  discountCents?: number;
};

export type ApplicationFeeBreakdown = {
  netCommissionCents: number;
  stripeFeeEstimatedCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  /** application_fee_amount sent to Stripe */
  applicationFeeCents: number;
  restaurantTransferCents: number;
  /** What Lieferway keeps after paying Stripe (target ~5 % of food). */
  platformNetCommissionCents: number;
};

/**
 * application_fee = target net commission + Stripe fee estimate
 *                 + delivery − discount (delivery stays with the platform).
 *
 * Platform net after Stripe = application_fee − actual Stripe fee
 * ≈ food × commission% (default 5 %). Restaurant transfer = amount − application_fee.
 *
 * Example: 100 € food, 5 %, Stripe ~1.5 % + 0,25 € → fee 1,75 €
 * → application_fee 6,75 € → platform nets 5 €, restaurant 93,25 €.
 */
export function computeApplicationFeeCents(opts: ApplicationFeeInput): ApplicationFeeBreakdown {
  const deliveryFeeCents = opts.deliveryFeeCents ?? 0;
  const discountCents = opts.discountCents ?? 0;
  const netCommissionCents = commissionCents(opts.foodSubtotalCents, opts.commissionPercent);
  const stripeFeeEstimatedCents = estimateStripeFeeCents(opts.amountCents);
  const platformOwned = Math.max(0, netCommissionCents + deliveryFeeCents - discountCents);
  const desired = platformOwned + stripeFeeEstimatedCents;
  const maxFee = Math.max(0, opts.amountCents - 1);
  const applicationFeeCents = Math.max(0, Math.min(desired, maxFee));
  const restaurantTransferCents = Math.max(0, opts.amountCents - applicationFeeCents);
  return {
    netCommissionCents,
    stripeFeeEstimatedCents,
    deliveryFeeCents,
    discountCents,
    applicationFeeCents,
    restaurantTransferCents,
    platformNetCommissionCents: netCommissionCents,
  };
}

export function platformNetAfterStripeFee(applicationFeeCents: number, stripeFeeActualCents: number) {
  return applicationFeeCents - stripeFeeActualCents;
}

export function stripeFeeVarianceNote(estimatedCents: number, actualCents: number) {
  if (estimatedCents === actualCents) return null;
  return `Stripe-Gebühr Schätzung ${estimatedCents} ct, tatsächlich ${actualCents} ct`;
}

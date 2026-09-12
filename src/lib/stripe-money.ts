import { commissionCents } from "./money";

/** Standard Stripe EEA consumer card fee in test/live (1.5 % + 0,25 €). */
export function estimateEuCardFeeCents(amountCents: number) {
  if (amountCents <= 0) return 0;
  return Math.round(amountCents * 0.015) + 25;
}

/**
 * Destination-charge application fee kept by Lieferway.
 * Commission is food × restaurant % (default 5 %). Delivery stays with the
 * platform; discounts are platform-funded. Stripe processing fees are NOT
 * included here — they are attributed to the restaurant (on_behalf_of).
 */
export function applicationFeeAmountCents(opts: {
  foodSubtotalCents: number;
  commissionPercent: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
}) {
  const commission = commissionCents(opts.foodSubtotalCents, opts.commissionPercent);
  const platformShare = commission + opts.deliveryFeeCents - opts.discountCents;
  const maxFee = Math.max(0, opts.totalCents - 1);
  return Math.max(0, Math.min(platformShare, maxFee));
}

export function restaurantNetAfterStripeFee(opts: {
  foodSubtotalCents: number;
  commissionCents: number;
  stripeFeeCents: number;
}) {
  return Math.max(0, opts.foodSubtotalCents - opts.commissionCents - opts.stripeFeeCents);
}

export function remainingOrderTotals(order: {
  totalCents: number;
  commissionCents: number;
  restaurantNetCents: number;
  stripeFeeCents: number;
  refundedCents: number;
  refundedCommissionCents: number;
  refundedRestaurantNetCents: number;
  refundedStripeFeeCents: number;
}) {
  return {
    remainingTotalCents: Math.max(0, order.totalCents - order.refundedCents),
    remainingCommissionCents: Math.max(0, order.commissionCents - order.refundedCommissionCents),
    remainingRestaurantNetCents: Math.max(0, order.restaurantNetCents - order.refundedRestaurantNetCents),
    remainingStripeFeeCents: Math.max(0, order.stripeFeeCents - order.refundedStripeFeeCents),
  };
}

/** Full or partial refund allocation. The last slice takes remainders so books close. */
export function refundSlice(opts: {
  refundAmountCents: number;
  totalCents: number;
  commissionCents: number;
  restaurantNetCents: number;
  stripeFeeCents: number;
  refundedCents: number;
  refundedCommissionCents: number;
  refundedRestaurantNetCents: number;
  refundedStripeFeeCents: number;
}) {
  const remaining = remainingOrderTotals(opts);
  const amountCents = Math.max(0, Math.min(opts.refundAmountCents, remaining.remainingTotalCents));
  if (amountCents <= 0 || opts.totalCents <= 0) {
    return {
      amountCents: 0,
      commissionReversalCents: 0,
      restaurantNetReversalCents: 0,
      stripeFeeReversalCents: 0,
    };
  }
  if (amountCents === remaining.remainingTotalCents) {
    return {
      amountCents,
      commissionReversalCents: remaining.remainingCommissionCents,
      restaurantNetReversalCents: remaining.remainingRestaurantNetCents,
      stripeFeeReversalCents: remaining.remainingStripeFeeCents,
    };
  }
  return {
    amountCents,
    commissionReversalCents: Math.round((opts.commissionCents * amountCents) / opts.totalCents),
    restaurantNetReversalCents: Math.round((opts.restaurantNetCents * amountCents) / opts.totalCents),
    stripeFeeReversalCents: Math.round((opts.stripeFeeCents * amountCents) / opts.totalCents),
  };
}

export function paymentStatusAfterRefund(refundedCents: number, totalCents: number) {
  if (refundedCents <= 0) return "PAID";
  if (refundedCents >= totalCents) return "REFUNDED";
  return "PARTIALLY_REFUNDED";
}

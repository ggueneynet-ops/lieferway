import { computeApplicationFeeCents } from "./stripe-fees";

export {
  computeApplicationFeeCents,
  estimateStripeFeeCents,
  platformNetAfterStripeFee,
  stripeFeeVarianceNote,
} from "./stripe-fees";

/** @deprecated use computeApplicationFeeCents — kept for call sites. */
export function applicationFeeAmountCents(opts: {
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

export function estimateEuCardFeeCents(amountCents: number) {
  return computeApplicationFeeCents({
    amountCents,
    foodSubtotalCents: amountCents,
    commissionPercent: 0,
  }).stripeFeeEstimatedCents;
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

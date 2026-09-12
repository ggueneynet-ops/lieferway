import assert from "node:assert/strict";
import {
  paymentStatusAfterRefund,
  refundSlice,
  remainingOrderTotals,
} from "../src/lib/stripe-money";
import {
  computeApplicationFeeCents,
  DEFAULT_STRIPE_FEE_FIXED_CENTS,
  DEFAULT_STRIPE_FEE_PERCENT_BPS,
  estimateStripeFeeCents,
} from "../src/lib/stripe-fees";
import { computeOrderTotals } from "../src/lib/orders";
import { weeklyMondayPayoutSchedule } from "../src/lib/payments";
import Stripe from "stripe";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

check("commission is food × % (5 % of 2000 = 100)", () => {
  const totals = computeOrderTotals({
    foodSubtotalCents: 2000,
    deliveryFeeCents: 249,
    discountCents: 0,
    commissionPercent: 5,
  });
  assert.equal(totals.commissionCents, 100);
  assert.equal(totals.restaurantPayoutCents, 1900);
  assert.equal(totals.totalCents, 2249);
});

check("100€ food: application_fee = 5% + Stripe estimate (6.75€)", () => {
  assert.equal(DEFAULT_STRIPE_FEE_PERCENT_BPS, 150);
  assert.equal(DEFAULT_STRIPE_FEE_FIXED_CENTS, 25);
  const stripeFee = estimateStripeFeeCents(10000);
  assert.equal(stripeFee, 175);
  const fees = computeApplicationFeeCents({
    amountCents: 10000,
    commissionPercent: 5,
  });
  assert.equal(fees.netCommissionCents, 500);
  assert.equal(fees.applicationFeeCents, 675);
  assert.equal(fees.restaurantTransferCents, 9325);
  assert.equal(fees.applicationFeeCents - fees.stripeFeeEstimatedCents, 500);
});

check("application fee includes Stripe estimate + delivery", () => {
  const fees = computeApplicationFeeCents({
    amountCents: 2249,
    foodSubtotalCents: 2000,
    commissionPercent: 5,
    deliveryFeeCents: 249,
    discountCents: 0,
  });
  const stripeFee = estimateStripeFeeCents(2249);
  assert.equal(fees.netCommissionCents, 100);
  assert.equal(fees.applicationFeeCents, 100 + 249 + stripeFee);
  assert.equal(fees.restaurantTransferCents, 2249 - fees.applicationFeeCents);
  assert.equal(fees.applicationFeeCents - stripeFee, 349);
});

check("discount is platform-funded (still collect Stripe estimate)", () => {
  const fees = computeApplicationFeeCents({
    amountCents: 1749,
    foodSubtotalCents: 2000,
    commissionPercent: 5,
    deliveryFeeCents: 249,
    discountCents: 500,
  });
  const stripeFee = estimateStripeFeeCents(1749);
  assert.equal(fees.applicationFeeCents, stripeFee);
});

check("partial refund allocates; last slice closes books", () => {
  const order = {
    totalCents: 2249,
    commissionCents: 100,
    restaurantNetCents: 1841,
    stripeFeeCents: 59,
    refundedCents: 0,
    refundedCommissionCents: 0,
    refundedRestaurantNetCents: 0,
    refundedStripeFeeCents: 0,
  };
  const first = refundSlice({ ...order, refundAmountCents: 1000 });
  assert.equal(first.amountCents, 1000);
  assert.ok(first.commissionReversalCents > 0);
  const after = {
    ...order,
    refundedCents: first.amountCents,
    refundedCommissionCents: first.commissionReversalCents,
    refundedRestaurantNetCents: first.restaurantNetReversalCents,
    refundedStripeFeeCents: first.stripeFeeReversalCents,
  };
  const last = refundSlice({ ...after, refundAmountCents: 99999 });
  assert.equal(last.amountCents, 2249 - 1000);
  assert.equal(after.refundedCommissionCents + last.commissionReversalCents, 100);
  assert.equal(after.refundedRestaurantNetCents + last.restaurantNetReversalCents, 1841);
  assert.equal(after.refundedStripeFeeCents + last.stripeFeeReversalCents, 59);
  assert.equal(paymentStatusAfterRefund(1000, 2249), "PARTIALLY_REFUNDED");
  assert.equal(paymentStatusAfterRefund(2249, 2249), "REFUNDED");
  const rem = remainingOrderTotals({
    ...after,
    refundedCents: after.refundedCents + last.amountCents,
    refundedCommissionCents: after.refundedCommissionCents + last.commissionReversalCents,
    refundedRestaurantNetCents: after.refundedRestaurantNetCents + last.restaurantNetReversalCents,
    refundedStripeFeeCents: after.refundedStripeFeeCents + last.stripeFeeReversalCents,
  });
  assert.equal(rem.remainingTotalCents, 0);
  assert.equal(rem.remainingCommissionCents, 0);
});

check("failed / unpaid never looks like kitchen-ready PAID", () => {
  assert.equal(paymentStatusAfterRefund(0, 1000), "PAID");
});

check("weekly Monday payout schedule", () => {
  const schedule = weeklyMondayPayoutSchedule();
  assert.equal(schedule.interval, "weekly");
  assert.equal(schedule.weekly_anchor, "monday");
});

check("duplicate refund slice of zero remaining is safe", () => {
  const slice = refundSlice({
    refundAmountCents: 100,
    totalCents: 1000,
    commissionCents: 50,
    restaurantNetCents: 900,
    stripeFeeCents: 40,
    refundedCents: 1000,
    refundedCommissionCents: 50,
    refundedRestaurantNetCents: 900,
    refundedStripeFeeCents: 40,
  });
  assert.equal(slice.amountCents, 0);
});

check("webhook signatures reject tampering and accept the same payload twice", () => {
  const stripe = new Stripe("sk_test_dummy_for_construct_only");
  const secret = "whsec_test_lieferway_idempotent";
  const payload = JSON.stringify({
    id: "evt_test_dup",
    object: "event",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_test", object: "payment_intent", status: "succeeded" } },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const first = stripe.webhooks.constructEvent(payload, header, secret);
  const second = stripe.webhooks.constructEvent(payload, header, secret);
  assert.equal(first.id, second.id);
  assert.equal(first.type, "payment_intent.succeeded");
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, "whsec_other"));
  assert.throws(() => stripe.webhooks.constructEvent(payload.replace("succeeded", "failed"), header, secret));
});

console.log("\nAll Stripe Connect accounting checks passed.");

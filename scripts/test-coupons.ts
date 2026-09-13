import assert from "node:assert/strict";
import {
  applyCoupon,
  couponBelowMinimum,
  couponDateActive,
  couponScopeAllows,
  couponXorBlocks,
} from "../src/lib/coupons";
import { computeOrderTotals } from "../src/lib/orders";
import { checkoutDiscountPlan } from "../src/lib/waypoints";
import { computeApplicationFeeCents, estimateStripeFeeCents } from "../src/lib/stripe-fees";

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

check("PERCENT capped by maxDiscount", () => {
  const d = applyCoupon(10000, {
    code: "P",
    isActive: true,
    type: "PERCENT",
    discountPercent: 50,
    discountCents: null,
    maxDiscountCents: 1000,
  });
  assert.equal(d, 1000);
});

check("FIXED never exceeds food", () => {
  assert.equal(
    applyCoupon(300, {
      code: "F",
      isActive: true,
      type: "FIXED",
      discountPercent: null,
      discountCents: 500,
    }),
    300,
  );
});

check("inactive / min / dates / scope", () => {
  assert.equal(
    applyCoupon(5000, {
      code: "X",
      isActive: false,
      discountPercent: 10,
      discountCents: null,
    }),
    0,
  );
  assert.equal(
    couponBelowMinimum(1500, {
      code: "X",
      isActive: true,
      discountPercent: 10,
      discountCents: null,
      minSubtotalCents: 2000,
    }),
    true,
  );
  assert.equal(
    couponDateActive({
      code: "X",
      isActive: true,
      discountPercent: 10,
      discountCents: null,
      validTo: new Date(Date.now() - 60_000),
    }),
    false,
  );
  assert.equal(
    couponScopeAllows({ code: "X", isActive: true, discountPercent: 10, discountCents: null, scope: "PICKUP" }, "DELIVERY"),
    false,
  );
});

check("commission after restaurant coupon (30€ − 5€ → 2€)", () => {
  const totals = computeOrderTotals({
    foodSubtotalCents: 3000,
    deliveryFeeCents: 249,
    discountCents: 500,
    commissionPercent: 8,
    restaurantCouponCents: 500,
  });
  assert.equal(totals.commissionBaseCents, 2500);
  assert.equal(totals.commissionCents, 200);
  assert.equal(totals.totalCents, 2749);
  assert.equal(totals.restaurantPayoutCents, 2300);
});

check("restaurant coupon not in application_fee discount slice", () => {
  const food = 3000;
  const coupon = 500;
  const plan = checkoutDiscountPlan({
    foodSubtotalCents: food,
    couponDiscountCents: coupon,
    wayPointsDiscountCents: 0,
    wayPointsLieferwayShareCents: 0,
  });
  assert.equal(plan.platformAbsorbedDiscountCents, 0);
  assert.equal(plan.customerDiscountCents, 500);
  const totals = computeOrderTotals({
    foodSubtotalCents: food,
    deliveryFeeCents: 0,
    discountCents: plan.customerDiscountCents,
    commissionPercent: 8,
    restaurantCouponCents: coupon,
  });
  const fees = computeApplicationFeeCents({
    amountCents: totals.totalCents,
    foodSubtotalCents: totals.commissionBaseCents,
    commissionPercent: 8,
    deliveryFeeCents: 0,
    discountCents: plan.platformAbsorbedDiscountCents,
  });
  const stripeFee = estimateStripeFeeCents(totals.totalCents);
  assert.equal(fees.netCommissionCents, 200);
  assert.equal(fees.applicationFeeCents, 200 + stripeFee);
});

check("XOR blocks by default", () => {
  assert.equal(couponXorBlocks({ hasCoupon: true, hasWayPoints: true }), true);
  assert.equal(couponXorBlocks({ hasCoupon: true, hasWayPoints: false }), false);
});

console.log("\nAll coupon checks passed.");

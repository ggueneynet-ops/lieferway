import assert from "node:assert/strict";
import {
  applyEarnMultiplier,
  customerDiscountCents,
  DEFAULT_POINTS_PER_EURO,
  earnPointsFromFood,
  isWayPointsParticipating,
  ledgerUniqueKey,
  nextRewardProgress,
  platformAbsorbedDiscountCents,
  rewardDiscountCents,
  sharesToBps,
  splitWayPointsFunding,
  WAYPOINTS_COMPLETED_STATUS,
} from "../src/lib/waypoints";
import { checkoutDiscountPlan, previewEarnPoints } from "../src/lib/waypoints";
import { computeApplicationFeeCents, estimateStripeFeeCents } from "../src/lib/stripe-fees";
import { computeOrderTotals } from "../src/lib/orders";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

check("completed status is DELIVERED (handed-off), not payment", () => {
  assert.equal(WAYPOINTS_COMPLETED_STATUS, "DELIVERED");
});

check("default earn rate 1 € = 10 WayPoints (not hardcoded in callers)", () => {
  assert.equal(DEFAULT_POINTS_PER_EURO, 10);
  assert.equal(earnPointsFromFood(3200, 10), 320);
  assert.equal(earnPointsFromFood(3299, 10), 320);
  assert.equal(earnPointsFromFood(0, 10), 0);
  assert.equal(earnPointsFromFood(5000, 20), 1000);
});

check("2x campaign multiplies earn", () => {
  assert.equal(applyEarnMultiplier(320, 2), 640);
  assert.equal(previewEarnPoints({ foodSubtotalCents: 3200, pointsPerEuro: 10, multiplier: 2 }), 640);
});

check("opt-in default off; admin lock wins", () => {
  assert.equal(isWayPointsParticipating({}), false);
  assert.equal(isWayPointsParticipating({ wayPointsEnabled: false }), false);
  assert.equal(isWayPointsParticipating({ wayPointsEnabled: true }), true);
  assert.equal(
    isWayPointsParticipating({ wayPointsEnabled: true, wayPointsDisabledByAdmin: true }),
    false,
  );
});

check("reward types: percent, fixed, free item (must be in cart)", () => {
  assert.equal(
    rewardDiscountCents({ type: "PERCENT", foodSubtotalCents: 3000, percentOff: 10 }),
    300,
  );
  assert.equal(
    rewardDiscountCents({ type: "FIXED", foodSubtotalCents: 3000, discountCents: 500 }),
    500,
  );
  assert.equal(
    rewardDiscountCents({
      type: "FREE_ITEM",
      foodSubtotalCents: 3000,
      freeItemPriceCents: 890,
      freeItemInCart: true,
    }),
    890,
  );
  assert.equal(
    rewardDiscountCents({
      type: "FREE_ITEM",
      foodSubtotalCents: 3000,
      freeItemPriceCents: 890,
      freeItemInCart: false,
    }),
    0,
  );
});

check("funding split stores restaurant + Lieferway shares", () => {
  const restaurant = splitWayPointsFunding({ discountCents: 300, fundedBy: "RESTAURANT" });
  assert.equal(restaurant.restaurantShareCents, 300);
  assert.equal(restaurant.lieferwayShareCents, 0);

  const platform = splitWayPointsFunding({ discountCents: 300, fundedBy: "LIEFERWAY" });
  assert.equal(platform.restaurantShareCents, 0);
  assert.equal(platform.lieferwayShareCents, 300);

  const shared = splitWayPointsFunding({
    discountCents: 300,
    fundedBy: "SHARED",
    restaurantShareBps: 5000,
  });
  assert.equal(shared.restaurantShareCents, 150);
  assert.equal(shared.lieferwayShareCents, 150);

  const bps = sharesToBps(70, 30);
  assert.equal(bps.restaurantShareBps, 7000);
  assert.equal(bps.lieferwayShareBps, 3000);
});

check("30 € basket, −3 € WP: guest pays 27 €; totals unchanged besides discount", () => {
  const food = 3000;
  const wp = 300;
  const totals = computeOrderTotals({
    foodSubtotalCents: food,
    deliveryFeeCents: 0,
    discountCents: wp,
    commissionPercent: 8,
  });
  assert.equal(totals.totalCents, 2700);
  assert.equal(totals.commissionCents, 240);
});

check("restaurant-funded WP does not subtract from application_fee", () => {
  const food = 3000;
  const wp = 300;
  const plan = checkoutDiscountPlan({
    foodSubtotalCents: food,
    couponDiscountCents: 0,
    wayPointsDiscountCents: wp,
    wayPointsLieferwayShareCents: 0,
  });
  assert.equal(plan.customerDiscountCents, 300);
  assert.equal(plan.platformAbsorbedDiscountCents, 0);

  const amount = 2700;
  const fees = computeApplicationFeeCents({
    amountCents: amount,
    foodSubtotalCents: food,
    commissionPercent: 8,
    deliveryFeeCents: 0,
    discountCents: plan.platformAbsorbedDiscountCents,
  });
  const stripeFee = estimateStripeFeeCents(amount);
  assert.equal(fees.netCommissionCents, 240);
  assert.equal(fees.applicationFeeCents, 240 + stripeFee);
  assert.equal(fees.restaurantTransferCents, amount - fees.applicationFeeCents);
});

check("Lieferway-funded WP is the existing platform discount slice", () => {
  const food = 3000;
  const wp = 300;
  const plan = checkoutDiscountPlan({
    foodSubtotalCents: food,
    couponDiscountCents: 0,
    wayPointsDiscountCents: wp,
    wayPointsLieferwayShareCents: 300,
  });
  assert.equal(plan.platformAbsorbedDiscountCents, 300);
  const amount = 2700;
  const fees = computeApplicationFeeCents({
    amountCents: amount,
    foodSubtotalCents: food,
    commissionPercent: 8,
    deliveryFeeCents: 0,
    discountCents: plan.platformAbsorbedDiscountCents,
  });
  const stripeFee = estimateStripeFeeCents(amount);
  assert.equal(fees.applicationFeeCents, stripeFee);
});

check("shared funding: only Lieferway share hits application_fee", () => {
  const split = splitWayPointsFunding({
    discountCents: 300,
    fundedBy: "SHARED",
    restaurantShareBps: 5000,
  });
  const plan = checkoutDiscountPlan({
    foodSubtotalCents: 3000,
    couponDiscountCents: 0,
    wayPointsDiscountCents: 300,
    wayPointsLieferwayShareCents: split.lieferwayShareCents,
  });
  assert.equal(plan.platformAbsorbedDiscountCents, 150);
  assert.equal(
    platformAbsorbedDiscountCents({ couponDiscountCents: 200, wayPointsLieferwayShareCents: 150 }),
    350,
  );
});

check("coupon + WP never exceed food subtotal", () => {
  assert.equal(
    customerDiscountCents({
      couponDiscountCents: 2000,
      wayPointsDiscountCents: 1500,
      foodSubtotalCents: 3000,
    }),
    3000,
  );
});

check("ledger keys are idempotent per order + type", () => {
  assert.equal(ledgerUniqueKey("EARN", "ord_1"), "EARN:ord_1");
  assert.equal(ledgerUniqueKey("EARN_REVERSAL", "ord_1"), "EARN_REVERSAL:ord_1");
  assert.notEqual(ledgerUniqueKey("EARN", "ord_1"), ledgerUniqueKey("REDEEM", "ord_1"));
});

check("progress to next reward", () => {
  const p = nextRewardProgress(1280, [1500, 1000, 2000]);
  assert.equal(p.target, 1500);
  assert.equal(p.remaining, 220);
});

console.log("\nAll WayPoints checks passed.");

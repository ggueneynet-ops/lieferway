import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_COMMISSION_PERCENT } from "../src/lib/constants";
import {
  aggregateSettlement,
  couponDiscountFromOrder,
  csvEscape,
  expectedFoodPayoutCents,
  settleOrder,
  toCsv,
  weeklySummariesToCsv,
  parseWeekStartParam,
  weekEnd,
  weekStart,
  type OrderSettlementInput,
} from "../src/lib/settlement";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function baseOrder(over: Partial<OrderSettlementInput> = {}): OrderSettlementInput {
  return {
    status: "DELIVERED",
    paymentStatus: "PAID",
    paymentMethod: "CARD",
    totalCents: 3000,
    foodSubtotalCents: 3000,
    deliveryFeeCents: 0,
    discountCents: 0,
    couponCode: null,
    commissionPercent: 8,
    commissionCents: 240,
    restaurantPayoutCents: 2760,
    restaurantNetCents: 2760,
    refundedCents: 0,
    refundedCommissionCents: 0,
    refundedRestaurantNetCents: 0,
    wayPointsDiscountCents: 0,
    wayPointsFundedBy: null,
    wayPointsRestaurantShareCents: 0,
    wayPointsLieferwayShareCents: 0,
    ...over,
  };
}

check("default commission is 8%", () => {
  assert.equal(DEFAULT_COMMISSION_PERCENT, 8);
});

check("Gutschein: commission on post-coupon food (30€ − 5€ → 8% = 2€)", () => {
  const ordersSrc = fs.readFileSync(path.join(root, "src/lib/orders.ts"), "utf8");
  assert.match(ordersSrc, /restaurantCouponCents/);
  assert.match(ordersSrc, /Commission is calculated on food AFTER this coupon/);
  const expected = expectedFoodPayoutCents(3000, 500, 8);
  assert.deepEqual(expected, {
    commissionBaseCents: 2500,
    commissionCents: 200,
    restaurantPayoutCents: 2300,
  });
  const line = settleOrder(
    baseOrder({
      totalCents: 2500,
      discountCents: 500,
      couponCode: "SAVE5",
      commissionCents: expected.commissionCents,
      restaurantPayoutCents: expected.restaurantPayoutCents,
      restaurantNetCents: expected.restaurantPayoutCents,
    }),
  );
  assert.equal(couponDiscountFromOrder({ discountCents: 500, wayPointsDiscountCents: 0 }), 500);
  assert.equal(line.couponDiscountCents, 500);
  assert.equal(line.commissionCents, 200);
  assert.equal(line.foodCents, 3000);
  assert.equal(line.cardPayoutCents, 2300);
  assert.equal(line.netPayableCents, 2300);
});

check("WayPoints restaurant-funded does not reduce commission base", () => {
  const expected = expectedFoodPayoutCents(3000, 0, 8);
  assert.equal(expected.commissionBaseCents, 3000);
  assert.equal(expected.commissionCents, 240);
  const line = settleOrder(
    baseOrder({
      totalCents: 2749,
      deliveryFeeCents: 249,
      discountCents: 500,
      wayPointsDiscountCents: 500,
      wayPointsFundedBy: "RESTAURANT",
      wayPointsRestaurantShareCents: 500,
      wayPointsLieferwayShareCents: 0,
      commissionCents: 240,
      restaurantPayoutCents: 2760,
      restaurantNetCents: 2200,
    }),
  );
  assert.equal(line.couponDiscountCents, 0);
  assert.equal(line.wayPointsRestaurantCents, 500);
  assert.equal(line.wayPointsLieferwayCents, 0);
  assert.equal(line.commissionCents, 240);
  assert.equal(line.cardPayoutCents, 2200);
  assert.equal(line.netPayableCents, 2200);
});

check("WayPoints Lieferway-funded is platform, not restaurant coupon", () => {
  const line = settleOrder(
    baseOrder({
      discountCents: 400,
      wayPointsDiscountCents: 400,
      wayPointsFundedBy: "LIEFERWAY",
      wayPointsRestaurantShareCents: 0,
      wayPointsLieferwayShareCents: 400,
      restaurantNetCents: 2760,
    }),
  );
  assert.equal(line.couponDiscountCents, 0);
  assert.equal(line.wayPointsRestaurantCents, 0);
  assert.equal(line.wayPointsLieferwayCents, 400);
  assert.equal(line.commissionCents, 240);
});

check("cash: restaurant collected, commission due, net can be negative", () => {
  const line = settleOrder(
    baseOrder({
      paymentMethod: "CASH",
      paymentStatus: "CASH_ON_DELIVERY",
      restaurantNetCents: 2760,
    }),
  );
  assert.equal(line.cashCommissionDueCents, 240);
  assert.equal(line.cardPayoutCents, 0);
  assert.equal(line.netPayableCents, -240);
});

check("full refund zeros remaining food/commission/net", () => {
  const line = settleOrder(
    baseOrder({
      refundedCents: 3000,
      refundedCommissionCents: 240,
      refundedRestaurantNetCents: 2760,
    }),
  );
  assert.equal(line.foodCents, 0);
  assert.equal(line.commissionCents, 0);
  assert.equal(line.cardPayoutCents, 0);
  assert.equal(line.netPayableCents, 0);
  assert.equal(line.refundedCents, 3000);
  assert.equal(line.refundedOrderCount, 1);
});

check("cancelled / rejected / unpaid are not payable", () => {
  for (const status of ["CANCELLED", "REJECTED"] as const) {
    const line = settleOrder(baseOrder({ status }));
    assert.equal(line.eligible, false);
    assert.equal(line.cancelledCount, 1);
    assert.equal(line.netPayableCents, 0);
    assert.equal(line.foodCents, 0);
  }
  const pending = settleOrder(baseOrder({ status: "PENDING_PAYMENT", paymentStatus: "PENDING" }));
  assert.equal(pending.eligible, false);
  assert.equal(pending.cancelledCount, 0);
  const failed = settleOrder(baseOrder({ paymentStatus: "FAILED" }));
  assert.equal(failed.eligible, false);
});

check("weekly mix: card net minus cash commission", () => {
  const card = settleOrder(baseOrder({ restaurantNetCents: 2760 }));
  const cash = settleOrder(
    baseOrder({
      paymentMethod: "CASH",
      paymentStatus: "CASH_ON_DELIVERY",
      restaurantNetCents: 2760,
    }),
  );
  const cancelled = settleOrder(baseOrder({ status: "CANCELLED" }));
  const totals = aggregateSettlement([card, cash, cancelled]);
  assert.equal(totals.orderCount, 2);
  assert.equal(totals.cancelledCount, 1);
  assert.equal(totals.cardPayoutCents, 2760);
  assert.equal(totals.cashCommissionDueCents, 240);
  assert.equal(totals.netPayableCents, 2520);
});

check("Berlin week starts Monday 00:00 (CEST / CET)", () => {
  const wed = new Date("2026-09-09T13:00:00.000Z"); // 15:00 Berlin CEST
  const start = weekStart(wed);
  assert.equal(start.toISOString(), "2026-09-06T22:00:00.000Z");
  assert.equal(weekEnd(start).toISOString(), "2026-09-13T21:59:59.999Z");
  const sun = new Date("2026-09-13T21:30:00.000Z");
  assert.equal(weekStart(sun).toISOString(), start.toISOString());
  const nextMon = new Date("2026-09-13T22:00:00.000Z");
  assert.equal(weekStart(nextMon).toISOString(), "2026-09-13T22:00:00.000Z");
  const jan = weekStart(new Date("2026-01-07T12:00:00.000Z"));
  assert.equal(jan.toISOString(), "2026-01-04T23:00:00.000Z");
  assert.equal(parseWeekStartParam("2026-09-09")?.toISOString(), start.toISOString());
  assert.equal(parseWeekStartParam("nope"), null);
});

check("CSV escapes quotes/commas; weekly export has accounting columns", () => {
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  const csv = toCsv(["a", "b"], [[1, 'x,y']]);
  assert.equal(csv, "a,b\n1,\"x,y\"\n");
  const weekly = weeklySummariesToCsv([
    {
      restaurant: "Test, Grill",
      restaurantId: "r1",
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      status: "PENDING",
      totals: {
        orderCount: 1,
        cancelledCount: 0,
        refundedOrderCount: 0,
        grossGuestCents: 3000,
        foodCents: 3000,
        couponDiscountCents: 0,
        wayPointsRestaurantCents: 0,
        wayPointsLieferwayCents: 0,
        commissionCents: 240,
        refundedCents: 0,
        cashCommissionDueCents: 0,
        cardPayoutCents: 2760,
        netPayableCents: 2760,
      },
    },
  ]);
  assert.match(weekly, /"Test, Grill"/);
  assert.match(weekly, /net_payable_cents/);
  assert.match(weekly, /coupon_cents/);
  assert.match(weekly, /waypoints_restaurant_cents/);
});

check("pages + APIs exist, no Stripe live, tax TODOs marked", () => {
  const files = [
    "src/lib/settlement.ts",
    "src/lib/payouts.ts",
    "src/app/admin/payouts/page.tsx",
    "src/app/restaurant/finance/page.tsx",
    "src/app/api/admin/payouts/route.ts",
    "src/app/api/restaurant/finance/route.ts",
    "src/components/admin-payouts.tsx",
    "src/components/settlement-breakdown.tsx",
  ];
  for (const rel of files) {
    const body = fs.readFileSync(path.join(root, rel), "utf8");
    assert.equal(body.includes("sk_live"), false, rel);
    assert.equal(/stripe\.(payouts|transfers)/i.test(body), false, rel);
  }
  const settlement = fs.readFileSync(path.join(root, "src/lib/settlement.ts"), "utf8");
  assert.match(settlement, /TODO\(tax\/invoice\)/);
  const invoices = fs.readFileSync(path.join(root, "src/lib/invoices.ts"), "utf8");
  assert.match(invoices, /TODO\(tax\/invoice\)/);
  const adminApi = fs.readFileSync(path.join(root, "src/app/api/admin/payouts/route.ts"), "utf8");
  assert.match(adminApi, /requireSession\(\["ADMIN"\]\)/);
  assert.match(adminApi, /searchParams.get\("format"\) === "csv"/);
  assert.match(adminApi, /writeAuditLog/);
  const restApi = fs.readFileSync(path.join(root, "src/app/api/restaurant/finance/route.ts"), "utf8");
  assert.match(restApi, /requireSession\(\["RESTAURANT", "ADMIN"\]\)/);
  assert.match(restApi, /ownerId: userId/);
  const finance = fs.readFileSync(path.join(root, "src/app/restaurant/finance/page.tsx"), "utf8");
  assert.match(finance, /settleRefunds/);
  assert.match(finance, /settleNetPayable/);
  assert.match(finance, /\/api\/restaurant\/finance\?format=csv/);
  const adminPage = fs.readFileSync(path.join(root, "src/app/admin/payouts/page.tsx"), "utf8");
  assert.match(adminPage, /settleTaxTodo/);
  assert.match(adminPage, /listPayoutSummaries/);
});

console.log("all settlement tests passed");

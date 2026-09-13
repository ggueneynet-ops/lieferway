/**
 * Static / pure coverage map for E2E sandbox scenarios A–F.
 * Does NOT call Stripe Live or place charges. Complements the existing
 * unit scripts (payment-lifecycle, stripe-connect, waypoints, coupons, …).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CUSTOMER_CANCELLABLE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "../src/lib/constants";
import {
  acceptTimeoutCutoff,
  refundIdempotencyKey,
  type ReleaseReason,
} from "../src/lib/payment-lifecycle-shared";
import { paymentStatusAfterRefund } from "../src/lib/stripe-money";
import { WAYPOINTS_COMPLETED_STATUS, WAYPOINTS_REVERSAL_STATUSES } from "../src/lib/waypoints";
import { orderStatusToEvent } from "../src/lib/email/templates";
import { assertStripeKeySeparation, resetStripeClient } from "../src/lib/stripe";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// ── A) Happy path order → accept → paid kitchen → out/ready → completed ──
check("A: status chain + kitchen accept + deliver + WayPoints on DELIVERED", () => {
  for (const s of [
    "PENDING_PAYMENT",
    "PLACED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ]) {
    assert.ok((ORDER_STATUSES as readonly string[]).includes(s), s);
  }
  assert.equal(WAYPOINTS_COMPLETED_STATUS, "DELIVERED");

  const patch = read("src/app/api/orders/[id]/route.ts");
  assert.match(patch, /action === "accept"/);
  assert.match(patch, /status = "PREPARING"/);
  assert.match(patch, /action === "ready"/);
  assert.match(patch, /status = "READY"/);
  assert.match(patch, /action === "out"/);
  assert.match(patch, /status = "OUT_FOR_DELIVERY"/);
  assert.match(patch, /action === "deliver"/);
  assert.match(patch, /status = "DELIVERED"/);
  assert.match(patch, /syncWayPointsAfterStatusChange/);

  const kitchen = read("src/lib/kitchen-accept.ts");
  assert.match(kitchen, /acceptKitchenOrder|PREPARING/);

  const wh = read("src/lib/stripe-webhooks.ts");
  assert.match(wh, /handlePaymentIntentSucceeded/);
  assert.match(wh, /PENDING_PAYMENT" \? "PLACED"/);
  assert.match(wh, /paymentStatus:\s*"PAID"/);

  assert.equal(orderStatusToEvent("PREPARING"), "order_accepted");
  assert.equal(orderStatusToEvent("READY"), "order_ready");
  assert.equal(orderStatusToEvent("OUT_FOR_DELIVERY"), "order_out_for_delivery");
  assert.equal(orderStatusToEvent("DELIVERED"), "order_completed");
});

// ── B) Reject → cancel/refund → WayPoints clawback + coupon restore + email ──
check("B: reject releases payment, reverses WP + coupon, emails customer", () => {
  const patch = read("src/app/api/orders/[id]/route.ts");
  assert.match(patch, /action === "reject"/);
  assert.match(patch, /status = "REJECTED"/);
  assert.match(patch, /restaurant_reject/);
  assert.match(patch, /reverseCouponUsageForOrder/);
  assert.match(patch, /releaseOrderPayment/);
  assert.match(patch, /notifyCustomerOfOrderStatus/);

  const life = read("src/lib/payment-lifecycle.ts");
  assert.match(life, /releaseOrderPayment/);
  assert.match(life, /applyRefundToOrder/);

  const coupons = read("src/lib/coupons.ts");
  assert.match(coupons, /reverseCouponUsageForOrder/);
  assert.match(coupons, /status:\s*"REVERSED"/);

  const wp = read("src/lib/waypoints-service.ts");
  assert.match(wp, /reverseWayPointsForOrder/);
  assert.ok((WAYPOINTS_REVERSAL_STATUSES as readonly string[]).includes("REJECTED"));
  assert.ok((WAYPOINTS_REVERSAL_STATUSES as readonly string[]).includes("CANCELLED"));

  assert.equal(orderStatusToEvent("REJECTED"), "order_rejected");
  assert.equal(orderStatusToEvent("CANCELLED"), "order_cancelled");

  const key = refundIdempotencyKey("ord_b", "restaurant_reject", 2500);
  assert.equal(key, refundIdempotencyKey("ord_b", "restaurant_reject", 2500));
  assert.notEqual(key, refundIdempotencyKey("ord_b", "customer_cancel", 2500));
});

// ── C) No restaurant response → timeout expire → auto cancel/refund + notify ──
check("C: expire cron + expirePlacedOrder REJECTED + release + notify", () => {
  const cron = read("src/app/api/cron/expire-orders/route.ts");
  assert.match(cron, /expireStalePlacedOrders/);
  assert.match(cron, /CRON_SECRET|Bearer/);

  const life = read("src/lib/payment-lifecycle.ts");
  assert.match(life, /expirePlacedOrder/);
  assert.match(life, /findExpiredPlacedOrders/);
  assert.match(life, /"REJECTED"/);
  assert.match(life, /restaurant_timeout/);
  assert.match(life, /reverseCouponUsageForOrder/);
  assert.match(life, /reverseWayPointsForOrder/);
  assert.match(life, /notifyCustomerOfOrderStatus/);

  const cut = acceptTimeoutCutoff(new Date("2026-09-13T17:00:00.000Z"));
  assert.ok(cut.getTime() < Date.parse("2026-09-13T17:00:00.000Z"));
});

// ── D) Payment fails → correct order/payment state + clear error ──
check("D: payment_failed → FAILED payment, stays PENDING_PAYMENT, email + alert", () => {
  assert.ok((PAYMENT_STATUSES as readonly string[]).includes("FAILED"));
  assert.ok((ORDER_STATUSES as readonly string[]).includes("PENDING_PAYMENT"));

  const wh = read("src/lib/stripe-webhooks.ts");
  const start = wh.indexOf("export async function handlePaymentIntentFailed");
  const end = wh.indexOf("export async function handlePaymentIntentCanceled");
  assert.ok(start >= 0 && end > start);
  const body = wh.slice(start, end);
  assert.match(body, /paymentStatus:\s*"FAILED"/);
  assert.equal(body.includes('status: "CANCELLED"'), false);
  assert.match(body, /sendPaymentFailed/);
  assert.match(body, /payment_capture_failure|alertCritical/);

  const checkout = read("scripts/test-checkout-guards.ts");
  assert.match(checkout, /payment_failed keeps PENDING_PAYMENT/);
});

// ── E) Duplicate webhook → nothing processed twice ──
check("E: StripeEvent claim + refund id + refund idempotency keys", () => {
  const wh = read("src/lib/stripe-webhooks.ts");
  assert.match(wh, /claimStripeEvent/);
  assert.match(wh, /duplicate:\s*true/);
  assert.match(wh, /stripeRefund\.findUnique|stripeRefundId/);
  assert.match(wh, /refund_seen/);

  const life = read("src/lib/payment-lifecycle.ts");
  assert.match(life, /refundIdempotencyKey/);
  assert.match(life, /idempotencyKey/);

  const reasons: ReleaseReason[] = [
    "restaurant_reject",
    "customer_cancel",
    "restaurant_timeout",
    "admin_refund",
    "admin_cancel",
  ];
  const keys = new Set(reasons.map((r) => refundIdempotencyKey("ord_e", r, 1000)));
  assert.equal(keys.size, reasons.length);

  assert.equal(paymentStatusAfterRefund(1000, 1000), "REFUNDED");
  assert.equal(paymentStatusAfterRefund(400, 1000), "PARTIALLY_REFUNDED");
});

// ── F) Admin manual refund → Stripe + order + WayPoints + email consistent ──
check("F: admin refund API + release reason + audit + reverse hooks", () => {
  const refundRoute = read("src/app/api/admin/orders/[id]/refund/route.ts");
  assert.match(refundRoute, /requireSession\(\["ADMIN"\]\)/);
  assert.match(refundRoute, /reason:\s*"admin_refund"/);
  assert.match(refundRoute, /releaseOrderPayment/);
  assert.match(refundRoute, /ORDER_REFUND/);
  assert.match(refundRoute, /writeAuditLog/);

  const wh = read("src/lib/stripe-webhooks.ts");
  const applyStart = wh.indexOf("export async function applyRefundToOrder");
  const applyEnd = wh.indexOf("export async function handleChargeRefunded");
  assert.ok(applyStart >= 0 && applyEnd > applyStart);
  const applySlice = wh.slice(applyStart, applyEnd);
  assert.match(applySlice, /reverseWayPointsForOrder/);
  assert.match(applySlice, /reverseCouponUsageForOrder/);
  assert.match(applySlice, /sendOrderRefunded/);
  assert.match(applySlice, /notifyCustomerOfOrderStatus/);

  assert.deepEqual([...CUSTOMER_CANCELLABLE_STATUSES], ["PENDING_PAYMENT", "PLACED"]);
});

// ── Safety: still TEST-only Stripe (no Live switch) ──
check("safety: assertStripeKeySeparation rejects live keys", () => {
  const prevSk = process.env.STRIPE_SECRET_KEY;
  const prevPk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  try {
    resetStripeClient();
    process.env.STRIPE_SECRET_KEY = "sk_live_forbidden";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_ok";
    assert.throws(() => assertStripeKeySeparation(), /STRIPE_LIVE_FORBIDDEN|sk_test_/);
    process.env.STRIPE_SECRET_KEY = "sk_test_ok";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_ok";
    assert.doesNotThrow(() => assertStripeKeySeparation());
  } finally {
    if (prevSk === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevSk;
    if (prevPk === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = prevPk;
    resetStripeClient();
  }
});

console.log("\nAll E2E sandbox coverage (A–F wiring) checks passed.");

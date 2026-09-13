import assert from "node:assert/strict";
import {
  CUSTOMER_CANCELLABLE_STATUSES,
  DEFAULT_RESTAURANT_ACCEPT_TIMEOUT_MINUTES,
  PAYMENT_STATUSES,
  restaurantAcceptTimeoutMinutes,
} from "../src/lib/constants";
import {
  acceptTimeoutCutoff,
  refundIdempotencyKey,
} from "../src/lib/payment-lifecycle-shared";
import { paymentStatusAfterRefund } from "../src/lib/stripe-money";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

check("payment statuses include REFUND_PENDING (refund_pending) and PAID (captured)", () => {
  assert.ok(PAYMENT_STATUSES.includes("PENDING"));
  assert.ok(PAYMENT_STATUSES.includes("PAID"));
  assert.ok(PAYMENT_STATUSES.includes("FAILED"));
  assert.ok(PAYMENT_STATUSES.includes("REFUND_PENDING"));
  assert.ok(PAYMENT_STATUSES.includes("REFUNDED"));
  // No AUTHORIZED — auth-hold not used
  assert.equal((PAYMENT_STATUSES as readonly string[]).includes("AUTHORIZED"), false);
});

check("customer cancel only PENDING_PAYMENT + PLACED", () => {
  assert.deepEqual([...CUSTOMER_CANCELLABLE_STATUSES], ["PENDING_PAYMENT", "PLACED"]);
});

check("accept timeout default 15, env override, clamp", () => {
  assert.equal(DEFAULT_RESTAURANT_ACCEPT_TIMEOUT_MINUTES, 15);
  const prev = process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES;
  delete process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES;
  assert.equal(restaurantAcceptTimeoutMinutes(), 15);
  process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES = "20";
  assert.equal(restaurantAcceptTimeoutMinutes(), 20);
  process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES = "0";
  assert.equal(restaurantAcceptTimeoutMinutes(), 15);
  process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES = "99999";
  assert.equal(restaurantAcceptTimeoutMinutes(), 24 * 60);
  if (prev === undefined) delete process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES;
  else process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES = prev;
});

check("acceptTimeoutCutoff is now - N minutes", () => {
  process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES = "15";
  const now = new Date("2026-09-13T17:00:00.000Z");
  const cut = acceptTimeoutCutoff(now);
  assert.equal(cut.toISOString(), "2026-09-13T16:45:00.000Z");
  delete process.env.RESTAURANT_ACCEPT_TIMEOUT_MINUTES;
});

check("refund idempotency key stable and bounded", () => {
  const a = refundIdempotencyKey("ord_1", "restaurant_reject", 1999);
  const b = refundIdempotencyKey("ord_1", "restaurant_reject", 1999);
  const c = refundIdempotencyKey("ord_1", "customer_cancel", 1999);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a.length <= 255);
  assert.ok(a.startsWith("lw_refund_"));
});

check("full refund → REFUNDED; partial → PARTIALLY_REFUNDED", () => {
  assert.equal(paymentStatusAfterRefund(500, 1000), "PARTIALLY_REFUNDED");
  assert.equal(paymentStatusAfterRefund(1000, 1000), "REFUNDED");
});

check("lifecycle module does not enable capture_method manual (architecture lock)", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const root = path.join(__dirname, "..");
  const payments = fs.readFileSync(path.join(root, "src/lib/payments.ts"), "utf8");
  assert.equal(payments.includes("capture_method"), false);
  const lifecycle = fs.readFileSync(path.join(root, "src/lib/payment-lifecycle.ts"), "utf8");
  assert.ok(lifecycle.includes("do not blind-refactor to auth-hold"));
});

console.log("\nAll payment-lifecycle checks passed.");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import {
  assertCartLinesAgainstMenu,
  assertDeliveryAddress,
  assertDeliveryCoverage,
  assertDeliveryFeeMatches,
  assertMinOrder,
  assertValidDeliveryPlz,
  CHECKOUT_ERROR,
  normalizeIdempotencyKey,
  restaurantAcceptingOrders,
} from "../src/lib/checkout-guards";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

check("normalizeIdempotencyKey accepts uuid-like keys", () => {
  assert.equal(normalizeIdempotencyKey("abcd1234"), "abcd1234");
  assert.ok(normalizeIdempotencyKey("550e8400-e29b-41d4-a716-446655440000"));
  assert.equal(normalizeIdempotencyKey("short"), null);
  assert.equal(normalizeIdempotencyKey("bad key!!"), null);
});

check("PLZ must be 5 German digits", () => {
  assert.equal(assertValidDeliveryPlz("60311").ok, true);
  assert.equal(assertValidDeliveryPlz("6031").ok, false);
  assert.equal(assertValidDeliveryPlz("abcde").ok, false);
  const bad = assertValidDeliveryPlz("12");
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.code, CHECKOUT_ERROR.INVALID_PLZ);
});

check("delivery address requires street, city, PLZ", () => {
  const ok = assertDeliveryAddress({
    street: "Berger Straße 1",
    city: "Frankfurt",
    postalCode: "60316",
  });
  assert.equal(ok.ok, true);
  const bad = assertDeliveryAddress({ street: "x", city: "F", postalCode: "60316" });
  assert.equal(bad.ok, false);
});

check("min order enforced", () => {
  assert.equal(assertMinOrder(999, 1000).ok, false);
  assert.equal(assertMinOrder(1000, 1000).ok, true);
});

check("delivery coverage uses radius when coords exist", () => {
  // Restaurant near 60311; far PLZ should fail when maxDeliveryKm is small
  const restaurant = {
    lat: 50.1109,
    lng: 8.6821,
    maxDeliveryKm: 3,
    serviceAreas: [{ postalCode: "60311" }],
  };
  const near = assertDeliveryCoverage({ postalCode: "60311", restaurant });
  assert.equal(near.ok, true);
  const far = assertDeliveryCoverage({ postalCode: "65931", restaurant });
  // 65931 may or may not be in FRANKFURT_PLZ lookup — if lookup missing, falls back to servesPlz=false + no distance → out of area via our hasAreas path when no radius... but we HAVE radius
  // With distance from lookup: if 65931 is in table and far, fail; if not in table distance null → servesPlz false, cap=3 ignored when distance null → restaurantCoversDistance uses servesPlz → false
  assert.equal(far.ok, false);
});

check("service area required when no radius configured", () => {
  const restaurant = {
    lat: null as number | null,
    lng: null as number | null,
    maxDeliveryKm: null as number | null,
    serviceAreas: [{ postalCode: "60311" }],
  };
  assert.equal(assertDeliveryCoverage({ postalCode: "60311", restaurant }).ok, true);
  assert.equal(assertDeliveryCoverage({ postalCode: "60316", restaurant }).ok, false);
});

check("price change vs cart rejects with PRICE_CHANGED", () => {
  const res = assertCartLinesAgainstMenu({
    requested: [{ menuItemId: "a", quantity: 1, expectedPriceCents: 500 }],
    menuItems: [{ id: "a", name: "Döner", priceCents: 600, isAvailable: true }],
  });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.code, CHECKOUT_ERROR.PRICE_CHANGED);
    assert.equal(res.changed?.[0]?.currentPriceCents, 600);
  }
});

check("unavailable item rejected", () => {
  const res = assertCartLinesAgainstMenu({
    requested: [{ menuItemId: "a", quantity: 1 }, { menuItemId: "b", quantity: 1 }],
    menuItems: [{ id: "a", name: "Döner", priceCents: 500, isAvailable: true }],
  });
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, CHECKOUT_ERROR.ITEM_UNAVAILABLE);
});

check("delivery fee mismatch", () => {
  assert.equal(assertDeliveryFeeMatches(249, 249).ok, true);
  assert.equal(assertDeliveryFeeMatches(249, 199).ok, false);
  assert.equal(assertDeliveryFeeMatches(249, undefined).ok, true);
});

check("restaurant closed / inactive", () => {
  assert.equal(
    restaurantAcceptingOrders({
      isActive: false,
      isOpen: true,
      wantsPreorder: false,
      preorderEnabled: false,
    }).ok,
    false,
  );
  assert.equal(
    restaurantAcceptingOrders({
      isActive: true,
      isOpen: false,
      wantsPreorder: false,
      preorderEnabled: false,
    }).ok,
    false,
  );
  assert.equal(
    restaurantAcceptingOrders({
      isActive: true,
      isOpen: false,
      wantsPreorder: true,
      preorderEnabled: true,
    }).ok,
    true,
  );
});

check("schema + migration + API wiring present", () => {
  const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  assert.ok(schema.includes("idempotencyKey"));
  const mig = path.join(root, "prisma/migrations/20260913230000_order_idempotency_key/migration.sql");
  assert.ok(fs.existsSync(mig));
  const sql = fs.readFileSync(mig, "utf8");
  assert.ok(sql.includes("idempotencyKey"));
  const api = fs.readFileSync(path.join(root, "src/app/api/orders/route.ts"), "utf8");
  assert.ok(api.includes("assertDeliveryCoverage"));
  assert.ok(api.includes("idempotencyKey"));
  assert.ok(api.includes("expectedPriceCents"));
  assert.ok(api.includes("replayOrderResponse"));
  assert.ok(api.includes("DEFAULT_COMMISSION_PERCENT") === false); // commission stays on restaurant
  assert.ok(api.includes("commissionPercent: restaurant.commissionPercent"));
  const checkout = fs.readFileSync(path.join(root, "src/components/checkout-client.tsx"), "utf8");
  assert.ok(checkout.includes("idempotencyKey"));
  assert.ok(checkout.includes("submittingRef"));
  assert.ok(checkout.includes("expectedPriceCents"));
  assert.ok(checkout.includes("lw_checkout_idem"));
  // Cart still replaces on restaurant switch
  const cart = fs.readFileSync(path.join(root, "src/components/cart-provider.tsx"), "utf8");
  assert.ok(cart.includes("prev.restaurantId !== restaurant.restaurantId"));
  // 8% default untouched
  const constants = fs.readFileSync(path.join(root, "src/lib/constants.ts"), "utf8");
  assert.ok(constants.includes("DEFAULT_COMMISSION_PERCENT = 8"));
  // Legal docs untouched marker
  assert.ok(fs.existsSync(path.join(root, "docs/legal/agb.md")));
});

check("payment_failed keeps PENDING_PAYMENT for retry (correct state)", () => {
  const wh = fs.readFileSync(path.join(root, "src/lib/stripe-webhooks.ts"), "utf8");
  assert.ok(wh.includes("handlePaymentIntentFailed"));
  assert.ok(wh.includes('paymentStatus: "FAILED"'));
  // Must not force CANCELLED on payment_failed (retry via /api/orders/[id]/pay)
  const fnStart = wh.indexOf("export async function handlePaymentIntentFailed");
  const fnEnd = wh.indexOf("export async function handlePaymentIntentCanceled");
  const body = wh.slice(fnStart, fnEnd);
  assert.equal(body.includes('status: "CANCELLED"'), false);
});

console.log("\nAll checkout guard checks passed.");

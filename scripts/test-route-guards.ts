import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canAccessOrderDetailPage,
  canAccessOrderPayment,
  canViewOrder,
} from "../src/lib/order-access";
import { AUTH_RATE, rateLimit, resetRateLimitBuckets } from "../src/lib/rate-limit";
import { hashPasswordResetToken, mintPasswordResetToken } from "../src/lib/password-reset";
import { assertStripeKeySeparation, resetStripeClient } from "../src/lib/stripe";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const ROUTES = [
  { prefix: "/admin", roles: ["ADMIN"], fileHint: "src/app/admin" },
  { prefix: "/restaurant", roles: ["RESTAURANT", "ADMIN"], fileHint: "src/app/restaurant" },
  { prefix: "/courier", roles: ["COURIER", "ADMIN"], fileHint: "src/app/courier" },
  { prefix: "/checkout", roles: ["CUSTOMER", "ADMIN"], fileHint: "src/app/checkout" },
  { prefix: "/orders", roles: ["CUSTOMER", "ADMIN", "RESTAURANT", "COURIER"], fileHint: "src/app/orders" },
  { prefix: "/account", roles: ["CUSTOMER", "ADMIN", "RESTAURANT", "COURIER"], fileHint: "src/app/account" },
] as const;

check("middleware encodes protected role prefixes", () => {
  const mw = fs.readFileSync(path.join(root, "src/middleware.ts"), "utf8");
  assert.match(mw, /verifySessionToken/);
  for (const r of ROUTES) {
    assert.match(mw, new RegExp(`prefix:\\s*"${r.prefix}"`));
    for (const role of r.roles) {
      assert.match(mw, new RegExp(`"${role}"`));
    }
  }
  assert.match(mw, /\/partner/);
  console.log(
    "route guards:\n" +
      ROUTES.map((r) => `  ${r.prefix.padEnd(12)} → ${r.roles.join("|")}  (${r.fileHint})`).join("\n") +
      "\n  /partner      → public apply (staff = /restaurant)\n" +
      "  /api/auth/*   → rate-limited login/register/password-reset",
  );
});

check("order IDOR helpers: customer cannot view others", () => {
  const foreign = { customerId: "c1", courierId: "k1", restaurantOwnerId: "o1" };
  assert.equal(canViewOrder("CUSTOMER", "c2", foreign), false);
  assert.equal(canAccessOrderDetailPage("CUSTOMER", "c2", foreign), false);
  assert.equal(canAccessOrderPayment("CUSTOMER", "c2", foreign), false);
  assert.equal(canViewOrder("CUSTOMER", "c1", foreign), true);
  assert.equal(canAccessOrderPayment("CUSTOMER", "c1", foreign), true);
});

check("order IDOR helpers: restaurant scoped to owner", () => {
  const order = { customerId: "c1", courierId: null, restaurantOwnerId: "o1" };
  assert.equal(canViewOrder("RESTAURANT", "o1", order), true);
  assert.equal(canViewOrder("RESTAURANT", "o2", order), false);
  assert.equal(canAccessOrderDetailPage("RESTAURANT", "o2", order), false);
  assert.equal(canAccessOrderPayment("RESTAURANT", "o1", order), false);
});

check("courier detail page requires assignment (API may allow unassigned)", () => {
  const unassigned = { customerId: "c1", courierId: null, restaurantOwnerId: "o1" };
  assert.equal(canViewOrder("COURIER", "k1", unassigned), true);
  assert.equal(canAccessOrderDetailPage("COURIER", "k1", unassigned), false);
  assert.equal(
    canAccessOrderDetailPage("COURIER", "k1", { ...unassigned, courierId: "k1" }),
    true,
  );
});

check("password reset token is hashed (raw != hash)", () => {
  const raw = mintPasswordResetToken();
  const hash = hashPasswordResetToken(raw);
  assert.notEqual(raw, hash);
  assert.equal(hash.length, 64);
  assert.equal(hashPasswordResetToken(raw), hash);
});

check("auth rate limiter trips after limit", () => {
  resetRateLimitBuckets();
  const key = "test-login";
  for (let i = 0; i < AUTH_RATE.login.limit; i++) {
    assert.equal(rateLimit({ key, limit: AUTH_RATE.login.limit, windowMs: 60_000 }).ok, true);
  }
  assert.equal(rateLimit({ key, limit: AUTH_RATE.login.limit, windowMs: 60_000 }).ok, false);
  resetRateLimitBuckets();
});

check("stripe rejects live keys and mixups", () => {
  const prevSk = process.env.STRIPE_SECRET_KEY;
  const prevPk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  resetStripeClient();
  try {
    process.env.STRIPE_SECRET_KEY = "sk_live_forbidden";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
    assert.throws(() => assertStripeKeySeparation(), /STRIPE_LIVE_FORBIDDEN|sk_test_/);

    process.env.STRIPE_SECRET_KEY = "sk_test_ok";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "sk_test_leaked";
    assert.throws(() => assertStripeKeySeparation(), /STRIPE_KEY_MIXUP|pk_test_/);

    process.env.STRIPE_SECRET_KEY = "sk_test_ok";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_ok";
    assert.doesNotThrow(() => assertStripeKeySeparation());
  } finally {
    process.env.STRIPE_SECRET_KEY = prevSk;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = prevPk;
    resetStripeClient();
  }
});

check("password-reset + rate-limit sources exist", () => {
  for (const rel of [
    "src/app/api/auth/password-reset/request/route.ts",
    "src/app/api/auth/password-reset/confirm/route.ts",
    "src/app/login/forgot/page.tsx",
    "src/app/login/reset/page.tsx",
    "src/lib/rate-limit.ts",
    "src/lib/order-access.ts",
    "docs/security-authz.md",
    "prisma/migrations/20260913240000_password_reset_tokens/migration.sql",
  ]) {
    assert.ok(fs.existsSync(path.join(root, rel)), rel);
  }
  const login = fs.readFileSync(path.join(root, "src/app/api/auth/login/route.ts"), "utf8");
  assert.match(login, /rateLimit/);
  const reg = fs.readFileSync(path.join(root, "src/app/api/auth/register/route.ts"), "utf8");
  assert.match(reg, /rateLimit/);
});

check("NEXT_PUBLIC_ stripe key is publishable-only in source", () => {
  const stripe = fs.readFileSync(path.join(root, "src/lib/stripe.ts"), "utf8");
  assert.match(stripe, /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  assert.match(stripe, /STRIPE_SECRET_KEY/);
  assert.doesNotMatch(stripe, /NEXT_PUBLIC_STRIPE_SECRET/);
  const envEx = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  assert.match(envEx, /STRIPE_SECRET_KEY/);
  assert.match(envEx, /NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(envEx, /NEXT_PUBLIC_STRIPE_SECRET/);
});

console.log("route guards + authz helpers ok");

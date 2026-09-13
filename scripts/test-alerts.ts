import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isCriticalDatabaseError,
  sanitizeAlertDetail,
  safeErrorMessage,
} from "../src/lib/alerts";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

check("sanitize redacts stripe secrets and passwords", () => {
  const raw =
    "fail sk_test_ABC123xyz password=supersecret Bearer tok.abc card=4111111111111111 pan=4111";
  const s = sanitizeAlertDetail(raw);
  assert.equal(s.includes("sk_test_"), false);
  assert.equal(s.includes("supersecret"), false);
  assert.equal(s.includes("tok.abc"), false);
  assert.ok(s.includes("[redacted]"));
});

check("safeErrorMessage never throws on odd values", () => {
  assert.equal(safeErrorMessage(new Error("boom sk_live_XXX")), sanitizeAlertDetail("boom sk_live_XXX"));
  assert.ok(safeErrorMessage({ nested: true }).length > 0);
  assert.equal(safeErrorMessage(undefined), "unknown_error");
  assert.equal(safeErrorMessage(null), "null");
});

check("isCriticalDatabaseError detects Prisma connection codes", () => {
  assert.equal(isCriticalDatabaseError({ code: "P1001" }), true);
  assert.equal(isCriticalDatabaseError({ code: "P2024" }), true);
  assert.equal(isCriticalDatabaseError({ code: "P2002" }), false);
  assert.equal(isCriticalDatabaseError(new Error("Can't reach database server")), true);
});

check("alerts module + docs + hooks exist", () => {
  assert.ok(fs.existsSync(path.join(root, "src/lib/alerts.ts")));
  assert.ok(fs.existsSync(path.join(root, "docs/critical-alerts.md")));
  const webhooks = fs.readFileSync(path.join(root, "src/lib/stripe-webhooks.ts"), "utf8");
  assert.ok(webhooks.includes('kind: "stripe_webhook_failure"'));
  assert.ok(webhooks.includes('kind: "payment_capture_failure"'));
  assert.ok(!webhooks.includes("sendCriticalPaymentOrWebhookError"));
  const life = fs.readFileSync(path.join(root, "src/lib/payment-lifecycle.ts"), "utf8");
  assert.ok(life.includes("alertCritical"));
  assert.ok(life.includes('"refund_failure"'));
  const mail = fs.readFileSync(path.join(root, "src/lib/email/service.ts"), "utf8");
  assert.ok(mail.includes("email_provider_failure"));
  assert.ok(mail.includes('critical_payment_or_webhook_error'));
  const orders = fs.readFileSync(path.join(root, "src/app/api/orders/route.ts"), "utf8");
  assert.ok(orders.includes("order_creation_failure"));
  assert.ok(orders.includes("database_error"));
  const bon = fs.readFileSync(
    path.join(root, "src/app/api/restaurant/orders/[id]/bon/route.ts"),
    "utf8",
  );
  assert.ok(bon.includes("printer_failure"));
});

check("no Stripe Live keys introduced", () => {
  const alerts = fs.readFileSync(path.join(root, "src/lib/alerts.ts"), "utf8");
  assert.ok(alerts.includes("sk_(?:live|test)_") || alerts.includes("sk_live")); // sanitizer pattern only
  assert.equal(/sk_live_[A-Za-z0-9]{10,}/.test(alerts), false);
  assert.equal(alerts.includes("STRIPE_SECRET_KEY_LIVE"), false);
  assert.equal(alerts.includes("sk_live_51"), false);
});

check("registry points critical event at alerts.ts", () => {
  const reg = fs.readFileSync(path.join(root, "src/lib/email/registry.ts"), "utf8");
  assert.ok(reg.includes("src/lib/alerts.ts"));
});

console.log("\nAll alerts checks passed.");

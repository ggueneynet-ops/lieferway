import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orderStatusToEvent } from "../src/lib/email/templates";
import { orderStatusLabel, parseLocale, t as dict, interpolate } from "../src/lib/i18n";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

check("browser-notifications helper exists", () => {
  const p = path.join(root, "src/lib/browser-notifications.ts");
  assert.ok(fs.existsSync(p));
  const src = fs.readFileSync(p, "utf8");
  assert.match(src, /notifyKitchenNewOrder/);
  assert.match(src, /notifyCustomerBrowserNotice/);
  assert.match(src, /KITCHEN_NOTIFIED_ORDERS_KEY/);
  assert.match(src, /onlyWhenHidden/);
  assert.doesNotMatch(src, /serviceWorker|web-push|WebPush/i);
});

check("docs mention HTTPS and no service worker", () => {
  const doc = fs.readFileSync(path.join(root, "docs/browser-notifications.md"), "utf8");
  assert.match(doc, /HTTPS/i);
  assert.match(doc, /No service worker/i);
  assert.match(doc, /notifyCustomerOfOrderStatus/);
});

check("restaurant panel still uses kitchen gong + adds browser notify", () => {
  const src = fs.readFileSync(path.join(root, "src/components/restaurant-orders.tsx"), "utf8");
  assert.match(src, /playKitchenBell/);
  assert.match(src, /notifyKitchenNewOrder/);
  assert.match(src, /KITCHEN_NOTIF_PROMPT_KEY/);
  assert.match(src, /enableBrowserNotifs/);
});

check("customer poller wires browser notices + soft prompt", () => {
  const src = fs.readFileSync(path.join(root, "src/components/customer-notice-poller.tsx"), "utf8");
  assert.match(src, /notifyCustomerBrowserNotice/);
  assert.match(src, /CUSTOMER_NOTIF_PROMPT_KEY/);
  assert.match(src, /offerCustomerPermission/);
});

check("notify-customer covers preparing + refunded notice statuses", () => {
  const src = fs.readFileSync(path.join(root, "src/lib/notify-customer.ts"), "utf8");
  assert.match(src, /"PREPARING"/);
  assert.match(src, /"REFUNDED"/);
  assert.match(src, /orderNoticePreparing/);
  assert.match(src, /orderNoticeRefunded/);
  assert.match(src, /Shared order-status notification hook/);
});

check("refund path creates REFUNDED CustomerNotice after email", () => {
  const src = fs.readFileSync(path.join(root, "src/lib/stripe-webhooks.ts"), "utf8");
  assert.match(src, /notifyCustomerOfOrderStatus\(order\.id, "REFUNDED"\)/);
  assert.match(src, /sendOrderRefunded/);
});

check("Permissions-Policy allows notifications", () => {
  const src = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
  assert.match(src, /notifications=\(self\)/);
});

check("status labels match customer-facing DE copy", () => {
  const locale = parseLocale("de");
  assert.equal(orderStatusLabel(locale, "PLACED"), "Bestellt");
  assert.equal(orderStatusLabel(locale, "ACCEPTED"), "Angenommen");
  assert.equal(orderStatusLabel(locale, "PREPARING"), "In Zubereitung");
  assert.equal(orderStatusLabel(locale, "OUT_FOR_DELIVERY"), "Unterwegs zu dir");
  assert.equal(orderStatusLabel(locale, "DELIVERED"), "Geliefert");
  assert.equal(orderStatusLabel(locale, "CANCELLED"), "Storniert");
  assert.equal(orderStatusLabel(locale, "REFUNDED"), "Erstattet");
  assert.equal(orderStatusLabel(locale, "READY", "PICKUP"), dict(locale).pickupStatusReady);
});

check("i18n keys exist in de/en/tr", () => {
  for (const loc of ["de", "en", "tr"] as const) {
    const d = dict(loc);
    assert.ok(d.orderNoticePreparing.length > 0, loc);
    assert.ok(d.orderNoticeRefunded.length > 0, loc);
    assert.ok(d.browserNotifEnableBtn.length > 0, loc);
    assert.ok(d.kitchenBrowserTitle.includes("{code}"), loc);
    assert.ok(interpolate(d.kitchenBrowserBody, { count: "2" }).includes("2"), loc);
  }
});

check("email mapping unchanged for core statuses; REFUNDED has no orderStatusToEvent", () => {
  assert.equal(orderStatusToEvent("PLACED"), "order_created");
  assert.equal(orderStatusToEvent("PREPARING"), "order_accepted");
  assert.equal(orderStatusToEvent("READY"), "order_ready");
  assert.equal(orderStatusToEvent("REFUNDED"), null);
});

console.log("\nAll browser-notification checks passed.");

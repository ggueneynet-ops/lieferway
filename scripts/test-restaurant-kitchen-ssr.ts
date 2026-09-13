import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serializeKitchenOrder } from "../src/lib/restaurant-live";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

check("serializeKitchenOrder null-safe customer and items", () => {
  const row = serializeKitchenOrder({
    id: "ord_1",
    shortCode: "AB12",
    status: "PLACED",
    paymentMethod: "CASH",
    totalCents: 1290,
    foodSubtotalCents: 1290,
    notes: null,
    createdAt: new Date("2026-09-13T12:00:00.000Z"),
    street: "Zeil 1",
    city: "Frankfurt",
    postalCode: "60313",
    customer: null,
    items: null,
  });
  assert.equal(row.customer.name, "—");
  assert.equal(row.customer.phone, null);
  assert.deepEqual(row.items, []);
  assert.equal(row.fulfillmentType, "DELIVERY");
  assert.equal(row.prepMinutes, null);
  assert.equal(row.createdAt, "2026-09-13T12:00:00.000Z");
});

check("serializeKitchenOrder missing fulfillmentType and prepMinutes", () => {
  const row = serializeKitchenOrder({
    id: "ord_2",
    createdAt: "2026-09-13T15:00:00.000Z",
  });
  assert.equal(row.fulfillmentType, "DELIVERY");
  assert.equal(row.prepMinutes, null);
  assert.equal(row.totalCents, 0);
  assert.equal(row.foodSubtotalCents, 0);
  assert.equal(row.customer.name, "—");
});

check("serializeKitchenOrder keeps PICKUP and phone", () => {
  const row = serializeKitchenOrder({
    id: "ord_3",
    fulfillmentType: "PICKUP",
    prepMinutes: 20,
    createdAt: new Date("2026-09-13T16:00:00.000Z"),
    items: [{ id: "i1", name: "Döner", quantity: 2 }],
    customer: { name: "Ada", phone: "+49151" },
  });
  assert.equal(row.fulfillmentType, "PICKUP");
  assert.equal(row.prepMinutes, 20);
  assert.equal(row.customer.name, "Ada");
  assert.equal(row.customer.phone, "+49151");
  assert.equal(row.items[0]?.name, "Döner");
});

check("loadKitchenSnapshot uses kitchenOrderSelect not full include", () => {
  const src = fs.readFileSync(path.join(root, "src/lib/restaurant-live.ts"), "utf8");
  assert.match(src, /export const kitchenOrderSelect/);
  assert.match(src, /select: kitchenOrderSelect/);
  assert.match(src, /loadKitchenSnapshot failed/);
  assert.doesNotMatch(src, /include: kitchenOrderInclude/);
  assert.doesNotMatch(src, /idempotencyKey:\s*true/);
  assert.doesNotMatch(src, /scheduledFor:\s*true/);
  assert.match(src, /o\.customer\?\.name \?\? "—"/);
});

check("restaurant home try/catch + kitchenLoadError banner", () => {
  const src = fs.readFileSync(path.join(root, "src/app/restaurant/page.tsx"), "utf8");
  assert.match(src, /try \{/);
  assert.match(src, /loadKitchenSnapshot/);
  assert.match(src, /kitchenLoadError/);
  assert.match(src, /\[restaurant\] loadKitchenSnapshot failed/);
  assert.match(src, /initial=\{snapshot\?\.orders \?\? \[\]\}/);
});

check("orders history try/catch + explicit select", () => {
  const src = fs.readFileSync(path.join(root, "src/app/restaurant/orders/page.tsx"), "utf8");
  assert.match(src, /try \{/);
  assert.match(src, /\[restaurant\/orders\] findMany failed/);
  assert.match(src, /select:\s*\{/);
  assert.match(src, /kitchenLoadError/);
  assert.match(src, /o\.customer\?\.name/);
  assert.doesNotMatch(src, /include:\s*\{\s*customer/);
});

check("menu page recovers from category load failure", () => {
  const src = fs.readFileSync(path.join(root, "src/app/restaurant/menu/page.tsx"), "utf8");
  assert.match(src, /try \{/);
  assert.match(src, /restaurantLoadError/);
  assert.match(src, /\[restaurant\/menu\] categories failed/);
});

check("restaurant error boundary exists", () => {
  const src = fs.readFileSync(path.join(root, "src/app/restaurant/error.tsx"), "utf8");
  assert.match(src, /"use client"/);
  assert.match(src, /Seite konnte nicht geladen werden/);
});

check("public language flags still present", () => {
  for (const code of ["de", "en", "tr"]) {
    const flag = path.join(root, "public/flags", `${code}.svg`);
    assert.ok(fs.existsSync(flag), `missing flag ${code}`);
    assert.match(fs.readFileSync(flag, "utf8"), /<svg /);
  }
});

console.log("restaurant kitchen SSR ok");

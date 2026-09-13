import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bonHtml, escapeHtml, splitItemName, type BonOrder } from "../src/lib/bon";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const sample: BonOrder = {
  shortCode: "LW-ÄÖÜ1",
  restaurantName: "Süßholz Café & Grill",
  logoSrc: null,
  initials: "SG",
  createdAt: "2026-09-13T16:45:00.000Z",
  paymentMethod: "CASH",
  totalCents: 2890,
  foodSubtotalCents: 2590,
  notes: "Bitte klingeln — Hinterhof. Extra scharf, ohne Zwiebeln (äöüß).",
  street: "Große Friedberger Straße 22–24",
  postalCode: "60313",
  city: "Frankfurt am Main",
  prepMinutes: 25,
  fulfillmentType: "DELIVERY",
  items: [
    {
      name: "Döner Spezial mit Extra Käse, Extra scharfer Sauce und doppeltem Salat (sehr lange Bezeichnung)",
      quantity: 2,
      extras: "Extra Käse, scharfe Sauce, ohne Zwiebeln",
    },
    {
      name: "Lahmacun — mit Extra Ayran und scharf",
      quantity: 1,
    },
    {
      name: "İçli Köfte (mit Joghurt)",
      quantity: 3,
    },
  ],
  customer: { name: "Jürgen Müller", phone: "+49 69 12345678" },
};

check("UTF-8 charset and German characters survive bonHtml", () => {
  const html = bonHtml(sample, "de");
  assert.match(html, /charset=["']?utf-8/i);
  assert.match(html, /Süßholz Café/);
  assert.match(html, /Jürgen Müller/);
  assert.match(html, /äöüß/);
  assert.match(html, /Große Friedberger/);
  assert.doesNotMatch(html, /Ã¤|Ã¶|Ã¼|ÃŸ/); // classic mojibake
  assert.equal(Buffer.from(html, "utf8").toString("utf8"), html);
});

check("narrow layout fields present (qty, note, address, phone, pay, total, id, time)", () => {
  const html = bonHtml(sample, "de");
  assert.match(html, /2×/);
  assert.match(html, /3×/);
  assert.match(html, /Hinweis/);
  assert.match(html, /Bitte klingeln/);
  assert.match(html, /Adresse/);
  assert.match(html, /60313/);
  assert.match(html, /\+49 69 12345678/);
  assert.match(html, /Zahlung/);
  assert.match(html, /Bar bei Lieferung/);
  assert.match(html, /Gesamt/);
  assert.match(html, /Bestell-Nr\./);
  assert.match(html, /LW-ÄÖÜ1/);
  assert.match(html, /80mm/);
  assert.match(html, /overflow-wrap:\s*anywhere/);
  assert.match(html, /Lieferung/);
  assert.match(html, /Extras/);
});

check("pickup banner and no delivery address block", () => {
  const html = bonHtml({ ...sample, fulfillmentType: "PICKUP" }, "de");
  assert.match(html, /Abholung an der Theke/);
  assert.doesNotMatch(html, /Große Friedberger/);
});

check("splitItemName parses extras from long labels", () => {
  assert.deepEqual(splitItemName("Lahmacun — mit Extra Ayran"), {
    name: "Lahmacun",
    extras: "mit Extra Ayran",
  });
  assert.deepEqual(splitItemName("İçli Köfte (mit Joghurt)"), {
    name: "İçli Köfte",
    extras: "mit Joghurt",
  });
  assert.deepEqual(splitItemName("Einfacher Döner"), {
    name: "Einfacher Döner",
    extras: null,
  });
});

check("escapeHtml keeps umlauts and escapes markup", () => {
  assert.equal(escapeHtml("Käse <test> & \"x\""), "Käse &lt;test&gt; &amp; &quot;x&quot;");
});

check("print button + offline hint + partner 99€ copy still present", () => {
  const btn = fs.readFileSync(path.join(root, "src/components/print-bon-button.tsx"), "utf8");
  assert.match(btn, /printBonOfflineHint/);
  assert.match(btn, /reprint/);
  assert.match(btn, /\/restaurant\/bon\/\$\{orderId\}/);

  const i18n = fs.readFileSync(path.join(root, "src/lib/i18n.ts"), "utf8");
  assert.match(i18n, /Optionaler 80-mm-Bondrucker: 99 €/);
  assert.match(i18n, /reprintBon/);
  assert.match(i18n, /printBonOfflineHint/);

  const partner = fs.readFileSync(path.join(root, "src/app/partner/anmelden/page.tsx"), "utf8");
  assert.match(partner, /partnerPrinterBenefit/);

  const agb = fs.readFileSync(path.join(root, "docs/legal/agb.md"), "utf8");
  assert.match(agb, /Bondrucker.*99/);
});

check("API route returns charset utf-8", () => {
  const route = fs.readFileSync(
    path.join(root, "src/app/api/restaurant/orders/[id]/bon/route.ts"),
    "utf8",
  );
  assert.match(route, /text\/html; charset=utf-8/);
  assert.match(route, /bonHtml/);
});

const outDir = path.join(root, "tmp");
fs.mkdirSync(outDir, { recursive: true });
const fixture = path.join(outDir, "lieferbon-sample.html");
fs.writeFileSync(fixture, bonHtml(sample, "de"), "utf8");
console.log(`wrote ${path.relative(root, fixture)}`);
console.log("All bon layout checks passed.");

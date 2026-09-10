import fs from "node:fs";
import path from "node:path";
import { formatEUR } from "@/lib/money";
import { formatBerlinBonDate } from "@/lib/datetime";
import { interpolate, t as dict, type Dictionary, type Locale } from "@/lib/i18n";
import { restaurantInitials, restaurantLogo } from "@/lib/media";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export type BonRestaurant = {
  name: string;
  logoUrl?: string | null;
  slug?: string | null;
};

export type BonOrder = {
  shortCode: string;
  restaurantName: string;
  /** Data URI or absolute URL of the restaurant logo. Never the Lieferway site mark. */
  logoSrc: string | null;
  initials: string;
  createdAt: string | Date;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  notes: string | null;
  street: string;
  postalCode: string;
  city: string;
  prepMinutes?: number | null;
  items: { name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
};

export function resolveBonBrand(restaurant: BonRestaurant): { logoSrc: string | null; initials: string } {
  const initials = restaurantInitials(restaurant.name);
  const src = restaurantLogo(restaurant.logoUrl, restaurant.slug ?? undefined);
  if (!src) return { logoSrc: null, initials };
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return { logoSrc: src, initials };
  }
  if (src.startsWith("/")) {
    const embedded = embedPublicFile(src);
    return { logoSrc: embedded, initials };
  }
  return { logoSrc: null, initials };
}

/** Embed /public files as data URIs so Drucken/Bon works in about:blank popups. */
export function embedPublicFile(urlPath: string): string | null {
  const clean = urlPath.split("?")[0].split("#")[0];
  if (!clean.startsWith("/") || clean.startsWith("//") || clean.includes("..")) return null;
  const publicRoot = path.resolve(process.cwd(), "public");
  const file = path.resolve(publicRoot, clean.replace(/^\//, ""));
  const rel = path.relative(publicRoot, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  try {
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function buildBonOrder(
  restaurant: BonRestaurant,
  order: Omit<BonOrder, "restaurantName" | "logoSrc" | "initials">,
): BonOrder {
  const brand = resolveBonBrand(restaurant);
  return {
    ...order,
    restaurantName: restaurant.name,
    logoSrc: brand.logoSrc,
    initials: brand.initials,
  };
}

export function bonPayLabel(method: string, t: Dictionary) {
  if (method === "CASH") return t.payCash;
  if (method === "APPLE_PAY") return t.payApple;
  if (method === "GOOGLE_PAY") return t.payGoogle;
  return t.payCard;
}

export function bonHtml(order: BonOrder, locale: Locale = "de") {
  const t = dict(locale);
  const pay = bonPayLabel(order.paymentMethod, t);
  const when = formatBerlinBonDate(order.createdAt, locale);
  const rows = order.items
    .map(
      (i) =>
        `<tr><td class="qty">${i.quantity}×</td><td>${escapeHtml(i.name)}</td></tr>`,
    )
    .join("");
  const phone = order.customer.phone?.trim();
  const prep =
    order.prepMinutes != null
      ? `<p class="line"><span class="k">${escapeHtml(t.bonPrepLabel)}</span><br/>${escapeHtml(interpolate(t.bonPrep, { min: String(order.prepMinutes) }))}</p>`
      : "";
  const notes = order.notes?.trim()
    ? `<p class="line"><span class="k">${escapeHtml(t.bonNote)}</span><br/>${escapeHtml(order.notes.trim())}</p>`
    : "";

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bon ${escapeHtml(order.shortCode)}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
    }
    .ticket {
      width: 74mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2mm 0 8mm;
      color: #000;
    }
    .brand {
      text-align: center;
      margin: 0 0 8px;
    }
    .logo {
      display: block;
      margin: 0 auto 6px;
      max-width: 42mm;
      max-height: 28mm;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .initials {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22mm;
      height: 22mm;
      margin: 0 auto 6px;
      background: #000;
      color: #fff;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 6px;
      line-height: 1.15;
      text-align: center;
    }
    .code {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin: 0 0 4px;
      line-height: 1.1;
    }
    .when { font-size: 14px; margin: 0 0 10px; }
    .k { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .line { font-size: 16px; line-height: 1.35; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }
    td { font-size: 17px; font-weight: 700; padding: 3px 0; vertical-align: top; }
    td.qty { width: 2.2em; }
    .hr { border: 0; border-top: 2px dashed #000; margin: 8px 0; }
    .sum {
      font-size: 22px;
      font-weight: 800;
      margin: 8px 0 0;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .toolbar { margin: 12px 0 16px; }
    .toolbar button {
      font-size: 16px;
      padding: 10px 16px;
      background: #000;
      color: #fff;
      border: 0;
      border-radius: 8px;
    }
    @media print {
      .toolbar { display: none !important; }
      html, body { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">${escapeHtml(t.printBon)}</button>
  </div>
  <article class="ticket">
    <div class="brand">
      ${
        order.logoSrc
          ? `<img class="logo" src="${escapeHtml(order.logoSrc)}" alt="" width="160" height="80" />`
          : `<div class="initials">${escapeHtml(order.initials)}</div>`
      }
      <h1>${escapeHtml(order.restaurantName)}</h1>
    </div>
    <p class="code">${escapeHtml(order.shortCode)}</p>
    <p class="when">${escapeHtml(when)}</p>
    <hr class="hr" />
    <p class="line"><span class="k">${escapeHtml(t.bonCustomer)}</span><br/>${escapeHtml(order.customer.name)}</p>
    ${phone ? `<p class="line"><span class="k">${escapeHtml(t.bonPhone)}</span><br/>${escapeHtml(phone)}</p>` : ""}
    <p class="line"><span class="k">${escapeHtml(t.bonAddress)}</span><br/>${escapeHtml(order.street)}<br/>${escapeHtml(order.postalCode)} ${escapeHtml(order.city)}</p>
    <hr class="hr" />
    <p class="k">${escapeHtml(t.bonItems)}</p>
    <table>${rows}</table>
    ${notes}
    <p class="line"><span class="k">${escapeHtml(t.bonPay)}</span><br/>${escapeHtml(pay)}</p>
    ${prep}
    <hr class="hr" />
    <p class="sum"><span>${escapeHtml(t.bonTotal)}</span><span>${escapeHtml(formatEUR(order.totalCents, locale))}</span></p>
  </article>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

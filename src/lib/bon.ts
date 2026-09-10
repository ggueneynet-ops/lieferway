import fs from "node:fs";
import path from "node:path";
import { formatEUR } from "@/lib/money";
import { formatBerlinBonDate } from "@/lib/datetime";
import { interpolate, t as dict, type Dictionary, type Locale } from "@/lib/i18n";
import { restaurantInitials, restaurantLogo } from "@/lib/media";
import { isPickup } from "@/lib/fulfillment";

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
  fulfillmentType?: string | null;
  items: { name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
};

export async function resolveBonBrand(restaurant: BonRestaurant): Promise<{ logoSrc: string | null; initials: string }> {
  const initials = restaurantInitials(restaurant.name);
  const src = restaurantLogo(restaurant.logoUrl, restaurant.slug ?? undefined);
  if (!src) return { logoSrc: null, initials };
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return { logoSrc: src, initials };
  }
  if (src.startsWith("/")) {
    const embedded = await embedPublicFile(src);
    return { logoSrc: embedded, initials };
  }
  return { logoSrc: null, initials };
}

/** Embed /public files as data URIs so Lieferbon print works in about:blank popups. */
export async function embedPublicFile(urlPath: string): Promise<string | null> {
  const clean = urlPath.split("?")[0].split("#")[0];
  if (!clean.startsWith("/") || clean.startsWith("//") || clean.includes("..")) return null;
  const publicRoot = path.resolve(process.cwd(), "public");
  const file = path.resolve(publicRoot, clean.replace(/^\//, ""));
  const rel = path.relative(publicRoot, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  try {
    const buf = fs.readFileSync(file);
    const print = await printFriendlyLogo(buf);
    if (print) return print;
    const ext = path.extname(file).toLowerCase();
    const mime = sniffImageMime(buf) ?? MIME[ext] ?? "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Lift dark restaurant marks so they stay readable on 80mm thermal paper. */
async function printFriendlyLogo(buf: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf)
      .rotate()
      .resize(720, 720, { fit: "inside", withoutEnlargement: false })
      .modulate({ brightness: 1.95, saturation: 0.82 })
      .linear(1.2, 22)
      .sharpen()
      .png({ compressionLevel: 8 })
      .toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 6 && buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  const head = buf.subarray(0, 64).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  return null;
}

export async function buildBonOrder(
  restaurant: BonRestaurant,
  order: Omit<BonOrder, "restaurantName" | "logoSrc" | "initials">,
): Promise<BonOrder> {
  const brand = await resolveBonBrand(restaurant);
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
  const pickup = isPickup(order.fulfillmentType);
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
  <title>Lieferbon ${escapeHtml(order.shortCode)}</title>
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
    .logo-wrap {
      display: flex;
      justify-content: center;
      margin: 0 auto 5px;
      padding: 1.5mm;
      background: #fff;
    }
    .logo {
      display: block;
      width: 62mm;
      max-width: 62mm;
      max-height: 52mm;
      height: auto;
      object-fit: contain;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .initials {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28mm;
      height: 28mm;
      margin: 0 auto 6px;
      background: #000;
      color: #fff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 2px;
      line-height: 1.15;
      text-align: center;
    }
    .kind {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 8px;
    }
    .pickup-banner {
      border: 3px solid #000;
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: center;
      padding: 6px 4px;
      margin: 0 0 10px;
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
          ? `<div class="logo-wrap"><img class="logo" src="${escapeHtml(order.logoSrc)}" alt="" width="280" height="280" /></div>`
          : `<div class="initials">${escapeHtml(order.initials)}</div>`
      }
      <h1>${escapeHtml(order.restaurantName)}</h1>
      <p class="kind">${escapeHtml(t.lieferbonTitle)}</p>
      ${pickup ? `<p class="pickup-banner">${escapeHtml(t.pickupAtCounter)}</p>` : ""}
    </div>
    <p class="code">${escapeHtml(order.shortCode)}</p>
    <p class="when">${escapeHtml(when)}</p>
    <hr class="hr" />
    <p class="line"><span class="k">${escapeHtml(t.bonCustomer)}</span><br/>${escapeHtml(order.customer.name)}</p>
    ${phone ? `<p class="line"><span class="k">${escapeHtml(t.bonPhone)}</span><br/>${escapeHtml(phone)}</p>` : ""}
    ${
      pickup
        ? `<p class="line"><span class="k">${escapeHtml(t.fulfillmentPickup)}</span><br/>${escapeHtml(t.pickupAtCounter)}</p>`
        : `<p class="line"><span class="k">${escapeHtml(t.bonAddress)}</span><br/>${escapeHtml(order.street)}<br/>${escapeHtml(order.postalCode)} ${escapeHtml(order.city)}</p>`
    }
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

import { formatEUR } from "@/lib/money";
import { formatBerlinDateTime } from "@/lib/datetime";
import type { Locale } from "@/lib/i18n";

export type BonOrder = {
  shortCode: string;
  restaurantName: string;
  createdAt: string;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  notes: string | null;
  street: string;
  postalCode: string;
  city: string;
  items: { name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
};

export function bonHtml(order: BonOrder, locale: Locale = "de") {
  const pay =
    order.paymentMethod === "CASH"
      ? "Bar"
      : order.paymentMethod === "APPLE_PAY"
        ? "Apple Pay"
        : order.paymentMethod === "GOOGLE_PAY"
          ? "Google Pay"
          : "Karte";
  const rows = order.items
    .map((i) => `<tr><td>${i.quantity}×</td><td>${escapeHtml(i.name)}</td></tr>`)
    .join("");
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>Bon ${escapeHtml(order.shortCode)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 16px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p, td { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    td { padding: 3px 0; vertical-align: top; }
    .muted { color: #555; }
    .sum { font-weight: 700; font-size: 15px; margin-top: 8px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Lieferway · ${escapeHtml(order.restaurantName)}</h1>
  <p><strong>${escapeHtml(order.shortCode)}</strong><br />
  <span class="muted">${escapeHtml(formatBerlinDateTime(order.createdAt, locale))}</span></p>
  <p>${escapeHtml(order.customer.name)}<br />
  ${order.customer.phone ? escapeHtml(order.customer.phone) + "<br />" : ""}
  ${escapeHtml(order.street)}, ${escapeHtml(order.postalCode)} ${escapeHtml(order.city)}</p>
  <table>${rows}</table>
  ${order.notes ? `<p>Hinweis: ${escapeHtml(order.notes)}</p>` : ""}
  <p class="muted">${pay} · Speisen ${formatEUR(order.foodSubtotalCents, locale)}</p>
  <p class="sum">${formatEUR(order.totalCents, locale)}</p>
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

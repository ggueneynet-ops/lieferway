export function formatEUR(cents: number, locale: string = "de") {
  const tag = locale === "tr" || locale.startsWith("tr") ? "tr-TR" : locale === "en" || locale.startsWith("en") ? "en-GB" : "de-DE";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function eurosToCents(value: string | number) {
  if (typeof value === "number") return Math.round(value * 100);
  const normalized = value.replace(",", ".").trim();
  const n = Number(normalized);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function commissionCents(foodSubtotalCents: number, percent: number) {
  return Math.round((foodSubtotalCents * percent) / 100);
}

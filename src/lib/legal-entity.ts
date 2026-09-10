/** Demo issuer for customer Rechnungen and B2B Provisionsrechnungen. Not a real company filing. */
export const LIEFERWAY_ISSUER = {
  name: "Lieferway GmbH i.G.",
  street: "Platzhalterstraße 1",
  postalCode: "60311",
  city: "Frankfurt am Main",
  country: "Deutschland",
  vatId: "DE000000000",
  email: "rechnung@lieferway.de",
} as const;

export const VAT_FOOD = 0.07;
export const VAT_DELIVERY = 0.19;

export function vatIncluded(grossCents: number, rate: number) {
  const net = Math.round(grossCents / (1 + rate));
  return { netCents: net, vatCents: grossCents - net };
}

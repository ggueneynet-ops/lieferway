/** Invoice issuer. Live values from env; Demo-Platzhalter only when a field is unset. */

function envText(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export type LieferwayIssuer = {
  name: string;
  addressLines: string[];
  vatId: string | null;
  nameSet: boolean;
  addressSet: boolean;
  vatSet: boolean;
};

export function lieferwayIssuer(): LieferwayIssuer {
  const name = envText("LIEFERWAY_LEGAL_NAME");
  const address = envText("LIEFERWAY_ADDRESS", "LIEFERWAY_LEGAL_ADDRESS");
  const vatId = envText("LIEFERWAY_UST_ID", "LIEFERWAY_LEGAL_UST_ID");
  return {
    name: name || "Gökhan Güney",
    addressLines: address
      ? address
          .split(/\n|;/)
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
    vatId: vatId || null,
    nameSet: Boolean(name),
    addressSet: Boolean(address),
    vatSet: Boolean(vatId),
  };
}

export const VAT_FOOD = 0.07;
export const VAT_DELIVERY = 0.19;

export function vatIncluded(grossCents: number, rate: number) {
  const net = Math.round(grossCents / (1 + rate));
  return { netCents: net, vatCents: grossCents - net };
}

import { lookupPlz } from "@/lib/plz";

export type DeliveryPlace = {
  street: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
};

/** Known Frankfurt streets so autocomplete works even if OSM is slow. */
export const FRANKFURT_STREETS: DeliveryPlace[] = [
  { street: "Zeil 70", postalCode: "60313", city: "Frankfurt am Main", lat: 50.1145, lng: 8.6798 },
  { street: "Hauptwache 1", postalCode: "60313", city: "Frankfurt am Main", lat: 50.1136, lng: 8.6794 },
  { street: "Römerberg 9", postalCode: "60311", city: "Frankfurt am Main", lat: 50.1106, lng: 8.6821 },
  { street: "Mainkai 12", postalCode: "60311", city: "Frankfurt am Main", lat: 50.1094, lng: 8.6828 },
  { street: "Berger Straße 142", postalCode: "60316", city: "Frankfurt am Main", lat: 50.1241, lng: 8.6988 },
  { street: "Berger Straße 18", postalCode: "60316", city: "Frankfurt am Main", lat: 50.1189, lng: 8.6928 },
  { street: "Eckenheimer Landstraße 30", postalCode: "60318", city: "Frankfurt am Main", lat: 50.1264, lng: 8.6842 },
  { street: "Leipziger Straße 4", postalCode: "60487", city: "Frankfurt am Main", lat: 50.1218, lng: 8.6418 },
  { street: "Leipziger Straße 67", postalCode: "60487", city: "Frankfurt am Main", lat: 50.1226, lng: 8.6394 },
  { street: "Bockenheimer Landstraße 25", postalCode: "60325", city: "Frankfurt am Main", lat: 50.1169, lng: 8.6574 },
  { street: "Schweizer Straße 30", postalCode: "60594", city: "Frankfurt am Main", lat: 50.1028, lng: 8.6816 },
  { street: "Schweizer Straße 84", postalCode: "60594", city: "Frankfurt am Main", lat: 50.1002, lng: 8.6802 },
  { street: "Textorstraße 20", postalCode: "60594", city: "Frankfurt am Main", lat: 50.1036, lng: 8.6874 },
  { street: "Berger Straße 265", postalCode: "60385", city: "Frankfurt am Main", lat: 50.1312, lng: 8.7086 },
  { street: "Höhenstraße 40", postalCode: "60385", city: "Frankfurt am Main", lat: 50.1284, lng: 8.7042 },
  { street: "Bolongarostraße 88", postalCode: "65929", city: "Frankfurt am Main", lat: 50.0986, lng: 8.5472 },
  { street: "Hostatostraße 6", postalCode: "65929", city: "Frankfurt am Main", lat: 50.0994, lng: 8.5458 },
  { street: "Münchener Straße 48", postalCode: "60329", city: "Frankfurt am Main", lat: 50.1072, lng: 8.6648 },
  { street: "Kaiserstraße 35", postalCode: "60329", city: "Frankfurt am Main", lat: 50.1092, lng: 8.6712 },
  { street: "Hanauer Landstraße 160", postalCode: "60314", city: "Frankfurt am Main", lat: 50.1124, lng: 8.7142 },
];

export function placeKey(p: Pick<DeliveryPlace, "street" | "postalCode">) {
  return `${p.postalCode}|${p.street.trim().toLowerCase()}`;
}

export function formatPlaceLine(p: { street?: string; postalCode: string; city: string }) {
  const street = (p.street ?? "").trim();
  if (street) return `${street}, ${p.postalCode} ${p.city}`;
  return `${p.postalCode} ${p.city}`;
}

export function shortCityName(city?: string | null) {
  const raw = (city ?? "").trim();
  if (!raw) return "Frankfurt";
  return raw.replace(/\s+am\s+Main$/i, "").trim() || raw;
}

/** Compact header chip: `60311 · Frankfurt` or `Frankfurt · Innenstadt`. */
export function formatLocationChip(opts: {
  postalCode?: string | null;
  city?: string | null;
  district?: string | null;
  street?: string | null;
}) {
  const plz = (opts.postalCode ?? "").trim();
  const city = shortCityName(opts.city);
  const district = (opts.district ?? "").trim();
  const street = (opts.street ?? "").trim();
  const streetIsDistrict = Boolean(street && district && street.toLowerCase() === district.toLowerCase());
  const hasRealStreet = Boolean(street && !streetIsDistrict);
  if (plz && city && (hasRealStreet || !district)) return `${plz} · ${city}`;
  if (city && district) return `${city} · ${district}`;
  if (plz && city) return `${plz} · ${city}`;
  if (plz && district) return `${plz} · ${district}`;
  if (plz) return plz;
  return city && city !== "Frankfurt" ? city : "";
}

export function coordsForPostal(postalCode: string): { lat: number; lng: number } | null {
  const hit = FRANKFURT_STREETS.find((s) => s.postalCode === postalCode);
  if (hit) return { lat: hit.lat, lng: hit.lng };
  const plz = lookupPlz(postalCode);
  if (plz) return { lat: plz.lat, lng: plz.lng };
  return null;
}

export function searchLocalStreets(q: string): DeliveryPlace[] {
  const n = q.trim().toLowerCase();
  if (n.length < 2) return [];
  const digits = n.replace(/\D/g, "");
  return FRANKFURT_STREETS.filter((s) => {
    const blob = `${s.street} ${s.postalCode} ${s.city}`.toLowerCase();
    if (blob.includes(n)) return true;
    if (digits.length >= 3 && s.postalCode.includes(digits)) return true;
    return false;
  }).slice(0, 8);
}

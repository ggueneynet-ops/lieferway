import { PLZ_COOKIE } from "@/lib/constants";

export type PlzPlace = {
  plz: string;
  district: string;
  lat: number;
  lng: number;
};

/** Approximate centroids for Frankfurt am Main postal codes. */
export const FRANKFURT_PLZ: PlzPlace[] = [
  { plz: "60311", district: "Innenstadt", lat: 50.1109, lng: 8.6821 },
  { plz: "60313", district: "Innenstadt / Zeil", lat: 50.1145, lng: 8.6798 },
  { plz: "60314", district: "Ostend", lat: 50.1124, lng: 8.6995 },
  { plz: "60316", district: "Nordend-Ost", lat: 50.1188, lng: 8.6924 },
  { plz: "60318", district: "Nordend-West", lat: 50.1242, lng: 8.6828 },
  { plz: "60320", district: "Dornbusch", lat: 50.1392, lng: 8.6705 },
  { plz: "60322", district: "Westend-Nord", lat: 50.1218, lng: 8.6688 },
  { plz: "60323", district: "Westend-Süd", lat: 50.1164, lng: 8.6622 },
  { plz: "60325", district: "Westend", lat: 50.1169, lng: 8.6574 },
  { plz: "60326", district: "Gallus", lat: 50.1048, lng: 8.6448 },
  { plz: "60327", district: "Gutleutviertel", lat: 50.1022, lng: 8.6628 },
  { plz: "60329", district: "Bahnhofsviertel", lat: 50.1076, lng: 8.6654 },
  { plz: "60385", district: "Bornheim", lat: 50.1268, lng: 8.7062 },
  { plz: "60386", district: "Ostend / Riederwald", lat: 50.1226, lng: 8.7184 },
  { plz: "60388", district: "Bergen-Enkheim", lat: 50.1542, lng: 8.7531 },
  { plz: "60389", district: "Bornheim / Seckbach", lat: 50.1356, lng: 8.7104 },
  { plz: "60431", district: "Ginnheim", lat: 50.1408, lng: 8.6462 },
  { plz: "60433", district: "Eschersheim", lat: 50.1564, lng: 8.6568 },
  { plz: "60435", district: "Preungesheim", lat: 50.1472, lng: 8.6864 },
  { plz: "60437", district: "Frankfurter Berg", lat: 50.1668, lng: 8.6802 },
  { plz: "60438", district: "Kalbach", lat: 50.1824, lng: 8.6388 },
  { plz: "60439", district: "Niederursel", lat: 50.1672, lng: 8.6264 },
  { plz: "60486", district: "Bockenheim", lat: 50.1186, lng: 8.6442 },
  { plz: "60487", district: "Bockenheim", lat: 50.1218, lng: 8.6418 },
  { plz: "60488", district: "Hausen / Praunheim", lat: 50.1354, lng: 8.6248 },
  { plz: "60489", district: "Rödelheim", lat: 50.1258, lng: 8.6122 },
  { plz: "60528", district: "Niederrad", lat: 50.0854, lng: 8.6426 },
  { plz: "60529", district: "Schwanheim", lat: 50.0858, lng: 8.5824 },
  { plz: "60549", district: "Flughafen", lat: 50.0504, lng: 8.5718 },
  { plz: "60594", district: "Sachsenhausen", lat: 50.1062, lng: 8.6868 },
  { plz: "60596", district: "Sachsenhausen", lat: 50.1004, lng: 8.6784 },
  { plz: "60598", district: "Sachsenhausen-Süd", lat: 50.0918, lng: 8.6856 },
  { plz: "60599", district: "Sachsenhausen-Ost", lat: 50.1016, lng: 8.7048 },
  { plz: "65929", district: "Höchst", lat: 50.0986, lng: 8.5472 },
  { plz: "65931", district: "Unterliederbach", lat: 50.1084, lng: 8.5286 },
  { plz: "65933", district: "Sindlingen", lat: 50.0852, lng: 8.5184 },
  { plz: "65934", district: "Zeilsheim", lat: 50.0968, lng: 8.4962 },
  { plz: "65936", district: "Sossenheim", lat: 50.1214, lng: 8.5688 },
];

export const DEMO_PLZ_CHIPS = [
  { plz: "60311", label: "60311 Innenstadt" },
  { plz: "60316", label: "60316 Nordend" },
  { plz: "60487", label: "60487 Bockenheim" },
  { plz: "60594", label: "60594 Sachsenhausen" },
  { plz: "60385", label: "60385 Bornheim" },
  { plz: "65929", label: "65929 Höchst" },
] as const;

export const DEFAULT_NEW_RESTAURANT_PLZS = ["60311", "60313", "60329", "60314", "60316"];

/** Demo marketplace default when the user has not chosen a place yet. */
export const DEFAULT_DEMO_PLZ = "60311";
export const FRANKFURT_CENTER = { lat: 50.1109, lng: 8.6821 };

export function isFrankfurtServicePlz(plz?: string | null) {
  const n = normalizePlz(plz);
  return Boolean(n && FRANKFURT_PLZ.some((p) => p.plz === n));
}

export function isNearFrankfurt(lat: number, lng: number, maxKm = 40) {
  return haversineKm({ lat, lng }, FRANKFURT_CENTER) <= maxKm;
}

/** Drop stale/wrong IP zips (e.g. 49661) unless the user actually picked a street. */
export function sanitizeDemoPlz(plz?: string | null, hasStreet = false) {
  const n = normalizePlz(plz);
  if (n && isFrankfurtServicePlz(n)) return n;
  if (n && hasStreet) return n;
  return DEFAULT_DEMO_PLZ;
}

export function defaultDemoPlace() {
  const place = lookupPlz(DEFAULT_DEMO_PLZ)!;
  return {
    street: "",
    postalCode: place.plz,
    city: "Frankfurt am Main",
    lat: place.lat,
    lng: place.lng,
    district: place.district,
  };
}

export function normalizePlz(raw?: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

export function lookupPlz(plz: string): PlzPlace | undefined {
  return FRANKFURT_PLZ.find((p) => p.plz === plz);
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestPlz(lat: number, lng: number): PlzPlace {
  let best = FRANKFURT_PLZ[0]!;
  let bestKm = Infinity;
  for (const place of FRANKFURT_PLZ) {
    const km = haversineKm({ lat, lng }, place);
    if (km < bestKm) {
      best = place;
      bestKm = km;
    }
  }
  return best;
}

export function formatDistanceKm(km: number, locale: string) {
  const tag = locale === "tr" ? "tr-TR" : locale === "en" ? "en-GB" : "de-DE";
  if (km < 0.1) return locale === "en" ? "< 0.1 km" : "< 0,1 km";
  return `${km.toLocaleString(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/** Compact badge like “809 m” / “1,2 km”. */
export function formatDistanceShort(km: number, locale: string) {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  return formatDistanceKm(km, locale);
}

export function plzCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export { PLZ_COOKIE };

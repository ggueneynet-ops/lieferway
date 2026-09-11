import type { DeliveryPlace } from "@/lib/place";

const OPENPLZ_LOCALITIES = "https://openplzapi.org/de/Localities";
const ZIPPO = "https://api.zippopotam.us/de";
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const UA = "Lieferway/1.0 (food-delivery demo; address lookup)";

type OpenPlzLocality = {
  postalCode?: string;
  name?: string;
  municipality?: { key?: string; name?: string; type?: string };
};

type ZippoPlace = {
  "place name"?: string;
  latitude?: string;
  longitude?: string;
};

const cache = new Map<string, { at: number; places: DeliveryPlace[] }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

function normName(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

/** Strip Destatis suffixes; do not special-case individual PLZs. */
export function cleanGemeindeName(name: string) {
  return name
    .replace(/,?\s*Freie und Hansestadt\s*$/i, "")
    .replace(/,?\s*Landeshauptstadt\s*$/i, "")
    .replace(/,?\s*Kreisfreie Stadt\s*$/i, "")
    .replace(/,?\s*Große Kreisstadt\s*$/i, "")
    .replace(/,?\s*Stadt\s*$/i, "")
    .replace(/,?\s*Markt\s*$/i, "")
    .replace(/,?\s*,?\s*M\s*$/i, "")
    .trim();
}

function isUninhabited(type?: string) {
  return (type || "").toLowerCase().includes("unbewohnt");
}

export function isGermanLatLng(lat: number, lng: number) {
  return lat >= 47.2 && lat <= 55.2 && lng >= 5.8 && lng <= 15.1;
}

function parseZippoCoords(row: ZippoPlace): { lat: number; lng: number } | null {
  const a = Number(row.latitude);
  const b = Number(row.longitude);
  if (Number.isFinite(a) && Number.isFinite(b) && isGermanLatLng(a, b)) return { lat: a, lng: b };
  if (Number.isFinite(a) && Number.isFinite(b) && isGermanLatLng(b, a)) return { lat: b, lng: a };
  return null;
}

async function fetchJson(url: string, timeoutMs: number) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res;
}

async function openPlzLocalities(plz: string): Promise<OpenPlzLocality[]> {
  const out: OpenPlzLocality[] = [];
  let page = 1;
  for (;;) {
    const url = `${OPENPLZ_LOCALITIES}?postalCode=${encodeURIComponent(plz)}&page=${page}&pageSize=50`;
    const res = await fetchJson(url, 8000);
    const rows = (await res.json()) as OpenPlzLocality[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    const totalPages = Number(res.headers.get("x-total-pages") || "1");
    if (page >= totalPages || rows.length < 50) break;
    page += 1;
    if (page > 8) break;
  }
  return out;
}

async function zippoPlaces(plz: string): Promise<ZippoPlace[]> {
  try {
    const res = await fetchJson(`${ZIPPO}/${encodeURIComponent(plz)}`, 6000);
    const data = (await res.json()) as { places?: ZippoPlace[] };
    return Array.isArray(data.places) ? data.places : [];
  } catch {
    return [];
  }
}

async function nominatimPlzCentroid(plz: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL(NOMINATIM_SEARCH);
    url.searchParams.set("q", plz);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "de");
    url.searchParams.set("limit", "1");
    url.searchParams.set("accept-language", "de");
    const res = await fetchJson(url.toString(), 8000);
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const row = rows[0];
    if (!row) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    return isGermanLatLng(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

async function nominatimCityPlz(city: string, plz: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL(NOMINATIM_SEARCH);
    url.searchParams.set("postalcode", plz);
    url.searchParams.set("city", city);
    url.searchParams.set("country", "Germany");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("accept-language", "de");
    const res = await fetchJson(url.toString(), 8000);
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const row = rows[0];
    if (!row) return null;
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    return isGermanLatLng(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

/**
 * Exact 5-digit German PLZ → unique inhabited Gemeinden (not the first Ortsteil).
 * lat/lng are the Gemeinde / PLZ centroid for distance; the display name is separate.
 */
export async function lookupCanonicalPlzPlaces(plz: string): Promise<DeliveryPlace[]> {
  const hit = cache.get(plz);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places;

  const localities = await openPlzLocalities(plz);
  const groups = new Map<
    string,
    { key: string; muniName: string; localityNames: string[] }
  >();
  for (const row of localities) {
    const muni = row.municipality;
    if (!muni?.key || isUninhabited(muni.type)) continue;
    const g = groups.get(muni.key) ?? {
      key: muni.key,
      muniName: muni.name || row.name || "",
      localityNames: [],
    };
    if (row.name) g.localityNames.push(row.name);
    groups.set(muni.key, g);
  }

  const zippo = await zippoPlaces(plz);
  const zippoByName = new Map<string, { lat: number; lng: number }>();
  for (const z of zippo) {
    const coords = parseZippoCoords(z);
    const name = (z["place name"] || "").trim();
    if (!coords || !name) continue;
    zippoByName.set(normName(name), coords);
  }

  let centroid: { lat: number; lng: number } | null = null;
  const zippoVals = [...zippoByName.values()];
  if (zippoVals.length > 0) {
    centroid = {
      lat: zippoVals.reduce((s, c) => s + c.lat, 0) / zippoVals.length,
      lng: zippoVals.reduce((s, c) => s + c.lng, 0) / zippoVals.length,
    };
    if (!isGermanLatLng(centroid.lat, centroid.lng)) centroid = null;
  }
  if (!centroid) centroid = await nominatimPlzCentroid(plz);

  const places: DeliveryPlace[] = [];
  for (const g of groups.values()) {
    const cleaned = cleanGemeindeName(g.muniName);
    const localMatch = g.localityNames.find((n) => {
      const nn = n.trim();
      return normName(nn) === normName(cleaned) || cleaned.toLowerCase().startsWith(nn.toLowerCase());
    });
    const city = (localMatch || g.localityNames[0] || cleaned).trim();
    const coords =
      zippoByName.get(normName(city)) ||
      zippoByName.get(normName(cleaned)) ||
      centroid;
    const resolved = coords ?? (await nominatimCityPlz(city, plz));
    if (!resolved) continue;
    places.push({
      street: "",
      postalCode: plz,
      city,
      lat: resolved.lat,
      lng: resolved.lng,
    });
  }

  places.sort((a, b) => a.city.localeCompare(b.city, "de"));
  cache.set(plz, { at: Date.now(), places });
  return places;
}

/** Keep GPS lat/lng; rename city to the PLZ Gemeinde when that PLZ has exactly one. */
export async function canonicalizePlaceGemeinde(place: DeliveryPlace): Promise<DeliveryPlace> {
  const plz = place.postalCode;
  if (!/^\d{5}$/.test(plz)) return place;
  try {
    const munis = await lookupCanonicalPlzPlaces(plz);
    if (munis.length === 1) {
      return { ...place, city: munis[0].city };
    }
    if (munis.length > 1) {
      const here = normName(place.city);
      const match = munis.find(
        (m) => normName(m.city) === here || here.includes(normName(m.city)) || normName(m.city).includes(here),
      );
      if (match) return { ...place, city: match.city };
    }
  } catch {
    /* keep reverse-geocoded label */
  }
  return place;
}

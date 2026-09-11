import { haversineKm, isFrankfurtServicePlz, isNearFrankfurt, lookupPlz, nearestPlz, normalizePlz } from "@/lib/plz";
import { searchLocalStreets, type DeliveryPlace } from "@/lib/place";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const UA = "Lieferway/1.0 (food-delivery demo; address lookup)";

export type DetectedPlz = {
  plz: string;
  city?: string;
  district?: string;
  street?: string;
  lat?: number;
  lng?: number;
  source: "gps" | "ip";
};

type OsmAddress = {
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  city_district?: string;
  country_code?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  square?: string;
  residential?: string;
  house_number?: string;
};

export function germanPlz(raw?: string | null) {
  const plz = normalizePlz(raw);
  if (!plz) return null;
  return plz;
}

function streetFromOsm(addr: OsmAddress) {
  const road = addr.road ?? addr.pedestrian ?? addr.footway ?? addr.square ?? addr.residential ?? "";
  const hn = addr.house_number ?? "";
  return `${road} ${hn}`.trim();
}

function cityFromOsm(addr: OsmAddress) {
  return (
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.suburb ??
    addr.city_district ??
    ""
  );
}

function placeFromOsm(addr: OsmAddress, lat: number, lng: number): DeliveryPlace | null {
  const postalCode = germanPlz(addr.postcode);
  const city = cityFromOsm(addr);
  if (!postalCode && !city) return null;
  const street = streetFromOsm(addr);
  return {
    street,
    postalCode: postalCode ?? "",
    city,
    lat,
    lng,
  };
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<DeliveryPlace | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  try {
    const url = new URL(NOMINATIM_REVERSE);
    url.searchParams.set("lat", lat.toFixed(6));
    url.searchParams.set("lon", lng.toFixed(6));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("accept-language", "de");

    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as { address?: OsmAddress; lat?: string; lon?: string };
    const addr = data.address ?? {};
    const place = placeFromOsm(addr, lat, lng);
    if (place && (place.postalCode || place.city)) return place;
  } catch {
    /* do not snap to Frankfurt */
  }

  return null;
}

export async function reverseGeocodePlz(lat: number, lng: number): Promise<Omit<DetectedPlz, "source"> | null> {
  const place = await reverseGeocodeAddress(lat, lng);
  if (!place) return null;
  const district = lookupPlz(place.postalCode)?.district;
  return {
    plz: place.postalCode,
    city: place.city,
    district,
    street: place.street,
    lat: place.lat,
    lng: place.lng,
  };
}

export async function searchAddresses(q: string): Promise<DeliveryPlace[]> {
  const query = q.trim();
  const local = searchLocalStreets(query);
  const seen = new Set(local.map((p) => `${p.postalCode}|${p.street.toLowerCase()}`));
  const out: DeliveryPlace[] = [...local];
  const typedPlz = germanPlz(query);
  if (typedPlz && isFrankfurtServicePlz(typedPlz)) {
    const known = lookupPlz(typedPlz);
    if (known) {
      const key = `${known.plz}|`;
      if (!seen.has(key)) {
        seen.add(key);
        out.unshift({
          street: "",
          postalCode: known.plz,
          city: "Frankfurt am Main",
          lat: known.lat,
          lng: known.lng,
        });
      }
    }
  }

  if (query.length < 3) return out.slice(0, 8);

  try {
    const url = new URL(NOMINATIM_SEARCH);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "de");
    url.searchParams.set("limit", "8");
    url.searchParams.set("accept-language", "de");
    url.searchParams.set("viewbox", "8.47,50.22,8.80,50.01");
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const rows = (await res.json()) as { lat: string; lon: string; address?: OsmAddress }[];
      for (const row of rows) {
        const lat = Number(row.lat);
        const lng = Number(row.lon);
        const place = placeFromOsm(row.address ?? {}, lat, lng);
        if (!place || !place.street) continue;
        const key = `${place.postalCode}|${place.street.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(place);
      }
    }
  } catch {
    /* local catalog is enough */
  }

  return out.slice(0, 8);
}

export function clientIpFromHeaders(headers: Headers) {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const trueClient = headers.get("true-client-ip")?.trim();
  if (trueClient) return trueClient;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return "";
}

function isPublicIp(ip: string) {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1") return false;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  return true;
}

export async function plzFromIp(ip: string): Promise<Omit<DetectedPlz, "source"> | null> {
  if (!isPublicIp(ip)) return null;

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,postal,city,latitude,longitude,country_code`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        postal?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        country_code?: string;
      };
      if (data.success !== false) {
        return constrainIpToFrankfurt({
          plz: germanPlz(data.postal),
          city: data.city,
          lat: data.latitude,
          lng: data.longitude,
          country: data.country_code,
        });
      }
    }
  } catch {
    /* HTTPS IP lookup only */
  }
  return null;
}

async function constrainIpToFrankfurt(opts: {
  plz?: string | null;
  city?: string;
  lat?: number;
  lng?: number;
  country?: string;
}): Promise<Omit<DetectedPlz, "source"> | null> {
  if (opts.plz && isFrankfurtServicePlz(opts.plz) && (!opts.country || opts.country === "DE")) {
    const known = lookupPlz(opts.plz);
    return {
      plz: opts.plz,
      city: opts.city ?? "Frankfurt am Main",
      district: known?.district,
      lat: known?.lat ?? opts.lat,
      lng: known?.lng ?? opts.lng,
    };
  }
  if (typeof opts.lat === "number" && typeof opts.lng === "number" && isNearFrankfurt(opts.lat, opts.lng)) {
    return reverseGeocodePlz(opts.lat, opts.lng);
  }
  return null;
}

export const PLZ_STORAGE_KEY = "lw_plz";
export const GEO_ATTEMPTED_KEY = "lw_geo_attempted";

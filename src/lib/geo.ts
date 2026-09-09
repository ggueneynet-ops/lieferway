import { haversineKm, lookupPlz, nearestPlz, normalizePlz } from "@/lib/plz";
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
  return addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? "Frankfurt am Main";
}

function placeFromOsm(addr: OsmAddress, lat: number, lng: number): DeliveryPlace | null {
  const postalCode = germanPlz(addr.postcode) ?? lookupPlz(nearestPlz(lat, lng).plz)?.plz;
  if (!postalCode) return null;
  const street = streetFromOsm(addr);
  const city = cityFromOsm(addr);
  const near = lookupPlz(postalCode);
  return {
    street: street || (near ? near.district : ""),
    postalCode,
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
    if (place?.postalCode) return place;
  } catch {
    /* snap to Frankfurt catalog if nearby */
  }

  const near = nearestPlz(lat, lng);
  if (haversineKm({ lat, lng }, near) <= 30) {
    return {
      street: near.district,
      postalCode: near.plz,
      city: "Frankfurt am Main",
      lat,
      lng,
    };
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
        const zip = germanPlz(data.postal);
        if (zip && data.country_code === "DE") {
          return { plz: zip, city: data.city };
        }
        if (typeof data.latitude === "number" && typeof data.longitude === "number") {
          const geo = await reverseGeocodePlz(data.latitude, data.longitude);
          if (geo) return geo;
        }
      }
    }
  } catch {
    /* try ip-api next */
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,zip,lat,lon,city,countryCode`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      zip?: string;
      lat?: number;
      lon?: number;
      city?: string;
      countryCode?: string;
    };
    if (data.status !== "success") return null;
    const zip = germanPlz(data.zip);
    if (zip && data.countryCode === "DE") return { plz: zip, city: data.city };
    if (typeof data.lat === "number" && typeof data.lon === "number") {
      return reverseGeocodePlz(data.lat, data.lon);
    }
  } catch {
    return null;
  }
  return null;
}

export const PLZ_STORAGE_KEY = "lw_plz";
export const GEO_ATTEMPTED_KEY = "lw_geo_attempted";

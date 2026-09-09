import { haversineKm, nearestPlz, normalizePlz } from "@/lib/plz";

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const UA = "Lieferway/1.0 (food-delivery demo; PLZ lookup)";

export type DetectedPlz = {
  plz: string;
  city?: string;
  district?: string;
  source: "gps" | "ip";
};

function germanPlz(raw?: string | null) {
  const plz = normalizePlz(raw);
  if (!plz) return null;
  if (plz[0] === "0" && plz.length === 5) return plz;
  if (/^[0-9]{5}$/.test(plz)) return plz;
  return plz;
}

export async function reverseGeocodePlz(lat: number, lng: number): Promise<Omit<DetectedPlz, "source"> | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  try {
    const url = new URL(NOMINATIM);
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
    const data = (await res.json()) as {
      address?: {
        postcode?: string;
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        city_district?: string;
        country_code?: string;
      };
    };
    const addr = data.address ?? {};
    const fromOsm = germanPlz(addr.postcode);
    if (fromOsm) {
      return {
        plz: fromOsm,
        city: addr.city ?? addr.town ?? addr.village,
        district: addr.suburb ?? addr.city_district,
      };
    }
  } catch {
    /* snap to Frankfurt catalog if nearby */
  }

  const near = nearestPlz(lat, lng);
  if (haversineKm({ lat, lng }, near) <= 30) {
    return { plz: near.plz, city: "Frankfurt am Main", district: near.district };
  }
  return null;
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

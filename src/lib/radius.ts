import {
  DEFAULT_RADIUS_KM,
  DEFAULT_RESTAURANT_RADIUS_KM,
  LAT_COOKIE,
  LNG_COOKIE,
  RADIUS_COOKIE,
  RADIUS_PRESETS,
} from "@/lib/constants";
import { haversineKm, lookupPlz, normalizePlz, plzCookieOptions } from "@/lib/plz";

export { RADIUS_COOKIE, LAT_COOKIE, LNG_COOKIE, RADIUS_PRESETS, DEFAULT_RADIUS_KM };

export type GeoOrigin = { lat: number; lng: number };

export function radiusCookieOptions() {
  return plzCookieOptions();
}

/** `undefined` = not specified; `null` = city-wide / no user cap; number = km. */
export function parseUserRadius(raw?: string | null): number | null | undefined {
  if (raw == null || raw === "") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "all" || v === "stadt" || v === "city" || v === "unlimited") return null;
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(25, Math.max(1, Math.round(n)));
}

export function resolveUserRadius(param?: string | null, cookie?: string | null): number | null {
  const fromParam = parseUserRadius(param);
  if (fromParam !== undefined) return fromParam;
  const fromCookie = parseUserRadius(cookie);
  if (fromCookie !== undefined) return fromCookie;
  return DEFAULT_RADIUS_KM;
}

export function radiusQueryValue(km: number | null) {
  return km == null ? "all" : String(km);
}

export function parseCoord(raw?: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseLatLng(latRaw?: string | null, lngRaw?: string | null): GeoOrigin | null {
  const lat = parseCoord(latRaw);
  const lng = parseCoord(lngRaw);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function resolveOrigin(opts: {
  plz?: string | null;
  lat?: number | null;
  lng?: number | null;
}): GeoOrigin | null {
  if (typeof opts.lat === "number" && typeof opts.lng === "number") {
    if (Math.abs(opts.lat) <= 90 && Math.abs(opts.lng) <= 180) {
      return { lat: opts.lat, lng: opts.lng };
    }
  }
  const plz = normalizePlz(opts.plz);
  const place = plz ? lookupPlz(plz) : undefined;
  return place ? { lat: place.lat, lng: place.lng } : null;
}

export function parseRestaurantRadius(raw?: string | null): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(50, Math.round(n * 10) / 10);
}

export function withinRadius(distanceKm: number, maxKm: number) {
  return distanceKm <= maxKm + 0.05;
}

export function effectiveMaxKm(userKm: number | null, restaurantKm: number | null | undefined) {
  const caps = [userKm, restaurantKm].filter((n): n is number => typeof n === "number" && n > 0);
  if (!caps.length) return null;
  return Math.min(...caps);
}

export function restaurantCoversDistance(
  distanceKm: number | null,
  userKm: number | null,
  restaurantKm: number | null | undefined,
  plz: string | null,
  servesPlz: boolean,
) {
  const cap = effectiveMaxKm(userKm, restaurantKm);
  if (distanceKm != null) {
    if (cap == null) return true;
    return withinRadius(distanceKm, cap);
  }
  if (plz) return servesPlz;
  return true;
}

export function distanceFromOrigin(origin: GeoOrigin | null, lat: number | null, lng: number | null) {
  if (!origin || typeof lat !== "number" || typeof lng !== "number") return null;
  return haversineKm(origin, { lat, lng });
}

export { DEFAULT_RESTAURANT_RADIUS_KM };

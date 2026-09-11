import {
  CITY_COOKIE,
  GEO_SOURCE_COOKIE,
  LAT_COOKIE,
  LNG_COOKIE,
  PLZ_COOKIE,
  STREET_COOKIE,
  isTrustedGeoSource,
} from "@/lib/constants";
import { PLZ_STORAGE_KEY } from "@/lib/geo";
import type { DeliveryPlace } from "@/lib/place";

export type GeoSource = "gps" | "manual";

function setCookie(name: string, value: string) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax${secure}`;
}

export function persistDeliveryPlace(place: DeliveryPlace | null, source: GeoSource = "manual") {
  if (!place) {
    try {
      window.localStorage.removeItem(PLZ_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    clearCookie(PLZ_COOKIE);
    clearCookie(LAT_COOKIE);
    clearCookie(LNG_COOKIE);
    clearCookie(STREET_COOKIE);
    clearCookie(CITY_COOKIE);
    clearCookie(GEO_SOURCE_COOKIE);
    return;
  }
  try {
    window.localStorage.setItem(PLZ_STORAGE_KEY, place.postalCode);
  } catch {
    /* private mode */
  }
  setCookie(PLZ_COOKIE, place.postalCode);
  setCookie(LAT_COOKIE, String(place.lat));
  setCookie(LNG_COOKIE, String(place.lng));
  setCookie(STREET_COOKIE, place.street);
  setCookie(CITY_COOKIE, place.city);
  setCookie(GEO_SOURCE_COOKIE, source);
}

export function marketplaceHrefForPlace(
  place: DeliveryPlace | null,
  q: string,
  cuisine: string,
  km: number | null,
) {
  const params = new URLSearchParams();
  if (place?.postalCode) {
    params.set("plz", place.postalCode);
    params.set("km", km == null ? "all" : String(km));
  }
  if (q) params.set("q", q);
  if (cuisine) params.set("cuisine", cuisine);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function goMarketplace(
  place: DeliveryPlace | null,
  q: string,
  cuisine: string,
  km: number | null,
) {
  window.location.assign(marketplaceHrefForPlace(place, q, cuisine, km));
}

export { isTrustedGeoSource };

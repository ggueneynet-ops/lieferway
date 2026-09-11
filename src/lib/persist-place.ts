import { CITY_COOKIE, LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { GEO_ATTEMPTED_KEY, PLZ_STORAGE_KEY } from "@/lib/geo";
import type { DeliveryPlace } from "@/lib/place";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`;
}

export function markGeoAttempted() {
  try {
    window.localStorage.setItem(GEO_ATTEMPTED_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function geoAlreadyAttempted() {
  try {
    return window.localStorage.getItem(GEO_ATTEMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistDeliveryPlace(place: DeliveryPlace | null) {
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
    return;
  }
  try {
    window.localStorage.setItem(PLZ_STORAGE_KEY, place.postalCode);
  } catch {
    /* private mode */
  }
  markGeoAttempted();
  setCookie(PLZ_COOKIE, place.postalCode);
  setCookie(LAT_COOKIE, String(place.lat));
  setCookie(LNG_COOKIE, String(place.lng));
  setCookie(STREET_COOKIE, place.street);
  setCookie(CITY_COOKIE, place.city);
}

export function marketplaceHrefForPlace(
  place: DeliveryPlace | null,
  q: string,
  cuisine: string,
  km: number | null,
) {
  const params = new URLSearchParams();
  if (place) {
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

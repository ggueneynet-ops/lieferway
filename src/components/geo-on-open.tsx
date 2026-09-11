"use client";

import { useEffect, useRef } from "react";
import { requestDeviceCoords } from "@/lib/browser-geo";
import { STREET_COOKIE } from "@/lib/constants";
import { isFrankfurtServicePlz, isNearFrankfurt } from "@/lib/plz";
import { geoAlreadyAttempted, goMarketplace, markGeoAttempted, persistDeliveryPlace } from "@/lib/persist-place";
import type { DeliveryPlace } from "@/lib/place";
import { waitForSplashIntro } from "@/lib/splash";

let started = false;

function cookieValue(name: string) {
  const prefix = `${name}=`;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  if (!hit) return "";
  try {
    return decodeURIComponent(hit.slice(prefix.length)).trim();
  } catch {
    return hit.slice(prefix.length).trim();
  }
}

function placeIsServiceable(place: DeliveryPlace) {
  if (isFrankfurtServicePlz(place.postalCode)) return true;
  return isNearFrankfurt(place.lat, place.lng);
}

/**
 * One-shot GPS on first marketplace open. Never watches; never overrides a typed street.
 */
export function GeoOnOpen({
  q = "",
  cuisine = "",
  km = 5,
}: {
  q?: string;
  cuisine?: string;
  km?: number | null;
}) {
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (started) return;
    if (geoAlreadyAttempted()) return;
    if (cookieValue(STREET_COOKIE)) {
      markGeoAttempted();
      return;
    }
    started = true;

    void (async () => {
      await waitForSplashIntro(1200);
      if (!alive.current || geoAlreadyAttempted()) return;
      const result = await requestDeviceCoords({ allowWatch: false });
      if (!alive.current) return;
      if (!result.ok) {
        markGeoAttempted();
        return;
      }
      if (geoAlreadyAttempted()) return;
      try {
        const res = await fetch(`/api/geo/plz?lat=${result.lat}&lng=${result.lng}`);
        const data = (await res.json()) as { place?: DeliveryPlace | null };
        if (!alive.current || geoAlreadyAttempted()) return;
        const place = data.place ?? null;
        if (!place || !placeIsServiceable(place)) {
          markGeoAttempted();
          return;
        }
        persistDeliveryPlace(place);
        goMarketplace(place, q, cuisine, km);
      } catch {
        markGeoAttempted();
      }
    })();

    return () => {
      alive.current = false;
    };
  }, [cuisine, km, q]);

  return null;
}

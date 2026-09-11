"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { requestDeviceCoords } from "@/lib/browser-geo";
import {
  CITY_COOKIE,
  GEO_LIVE_COOKIE,
  GEO_SOURCE_COOKIE,
  LAT_COOKIE,
  LNG_COOKIE,
  PLZ_COOKIE,
  STREET_COOKIE,
  isActiveDeliveryLocation,
} from "@/lib/constants";
import { persistDeliveryPlace, type GeoSource } from "@/lib/persist-place";
import type { DeliveryPlace } from "@/lib/place";
import { isStaffArea } from "@/lib/paths";

export type LocationStatus = "locating" | "ready" | "need-pick";

type LocationContextValue = {
  status: LocationStatus;
  place: DeliveryPlace | null;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  applyPlace: (place: DeliveryPlace, source: GeoSource) => void;
  refreshGps: () => void;
  rejectGps: () => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

function cookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  if (!hit) return "";
  try {
    return decodeURIComponent(hit.slice(prefix.length)).trim();
  } catch {
    return hit.slice(prefix.length).trim();
  }
}

function readPlaceFromCookies(): DeliveryPlace | null {
  if (typeof document === "undefined") return null;
  const postalCode = cookieValue(PLZ_COOKIE);
  const city = cookieValue(CITY_COOKIE);
  const lat = Number(cookieValue(LAT_COOKIE));
  const lng = Number(cookieValue(LNG_COOKIE));
  if (!postalCode && !city) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    street: cookieValue(STREET_COOKIE),
    postalCode,
    city,
    lat,
    lng,
  };
}

/** Restore without GPS only for an explicit manual pick, or this-session GPS (`lw_geo_live`). */
function readRestorablePlace(): DeliveryPlace | null {
  if (!isActiveDeliveryLocation(cookieValue(GEO_SOURCE_COOKIE), cookieValue(GEO_LIVE_COOKIE))) {
    return null;
  }
  return readPlaceFromCookies();
}

function shouldAutoLocate(path: string) {
  if (isStaffArea(path)) return false;
  if (path.startsWith("/login") || path.startsWith("/register")) return false;
  if (path.startsWith("/checkout") || path.startsWith("/partner")) return false;
  return true;
}

function stripPlzFromUrl(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("plz")) return;
  url.searchParams.delete("plz");
  const href = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (href !== current) router.replace(href);
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [place, setPlace] = useState<DeliveryPlace | null>(null);
  const [status, setStatus] = useState<LocationStatus>("locating");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const applyPlace = useCallback(
    (next: DeliveryPlace, source: GeoSource) => {
      persistDeliveryPlace(next, source);
      setPlace(next);
      setStatus("ready");
      setSheetOpen(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (next.postalCode) url.searchParams.set("plz", next.postalCode);
        else url.searchParams.delete("plz");
        const href = `${url.pathname}${url.search}${url.hash}`;
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (href !== current) router.replace(href);
      }
      router.refresh();
    },
    [router],
  );

  const rejectGps = useCallback(() => {
    const keepManual = cookieValue(GEO_SOURCE_COOKIE) === "manual";
    if (keepManual) {
      const restored = readPlaceFromCookies();
      if (restored) {
        setPlace(restored);
        setStatus("ready");
        return;
      }
    }
    persistDeliveryPlace(null);
    setPlace(null);
    setStatus("need-pick");
    setSheetOpen(true);
    stripPlzFromUrl(router);
    router.refresh();
  }, [router]);

  const applyCoords = useCallback(
    async (lat: number, lng: number) => {
      const res = await fetch(`/api/geo/plz?lat=${lat}&lng=${lng}`);
      const data = (await res.json()) as { place?: DeliveryPlace | null };
      const next = data.place ?? null;
      if (!next || (!next.postalCode && !next.city)) {
        rejectGps();
        return;
      }
      applyPlace(next, "gps");
    },
    [applyPlace, rejectGps],
  );

  const refreshGps = useCallback(() => {
    setStatus("locating");
    const resultPromise = requestDeviceCoords({ force: true });
    void (async () => {
      const result = await resultPromise;
      if (!result.ok) {
        rejectGps();
        return;
      }
      try {
        await applyCoords(result.lat, result.lng);
      } catch {
        rejectGps();
      }
    })();
  }, [applyCoords, rejectGps]);

  useEffect(() => {
    const restorable = readRestorablePlace();
    setHydrated(true);
    if (restorable) {
      setPlace(restorable);
      setStatus("ready");
      return;
    }
    if (!shouldAutoLocate(path)) {
      setStatus("need-pick");
      return;
    }
    setStatus("locating");
    const resultPromise = requestDeviceCoords();
    void (async () => {
      const result = await resultPromise;
      if (!result.ok) {
        rejectGps();
        return;
      }
      try {
        await applyCoords(result.lat, result.lng);
      } catch {
        rejectGps();
      }
    })();
    // Run once on marketplace mount — not on every client navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      status: hydrated ? status : place ? "ready" : "locating",
      place,
      sheetOpen,
      setSheetOpen,
      applyPlace,
      refreshGps,
      rejectGps,
    }),
    [applyPlace, hydrated, place, refreshGps, rejectGps, sheetOpen, status],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within LocationProvider");
  }
  return ctx;
}

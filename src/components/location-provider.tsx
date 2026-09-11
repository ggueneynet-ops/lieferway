"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { requestDeviceCoords } from "@/lib/browser-geo";
import {
  CITY_COOKIE,
  GEO_SOURCE_COOKIE,
  LAT_COOKIE,
  LNG_COOKIE,
  PLZ_COOKIE,
  STREET_COOKIE,
  isTrustedGeoSource,
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

function readTrustedPlace(): DeliveryPlace | null {
  if (typeof document === "undefined") return null;
  if (!isTrustedGeoSource(cookieValue(GEO_SOURCE_COOKIE))) return null;
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

function shouldAutoLocate(path: string) {
  if (isStaffArea(path)) return false;
  if (path.startsWith("/login") || path.startsWith("/register")) return false;
  if (path.startsWith("/checkout") || path.startsWith("/partner")) return false;
  return true;
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

  const applyCoords = useCallback(
    async (lat: number, lng: number) => {
      const res = await fetch(`/api/geo/plz?lat=${lat}&lng=${lng}`);
      const data = (await res.json()) as { place?: DeliveryPlace | null };
      const next = data.place ?? null;
      if (!next || (!next.postalCode && !next.city)) {
        setStatus("need-pick");
        setSheetOpen(true);
        return;
      }
      applyPlace(next, "gps");
    },
    [applyPlace],
  );

  const refreshGps = useCallback(() => {
    setStatus("locating");
    const resultPromise = requestDeviceCoords({ force: true });
    void (async () => {
      const result = await resultPromise;
      if (!result.ok) {
        setStatus(place ? "ready" : "need-pick");
        if (!place) setSheetOpen(true);
        return;
      }
      try {
        await applyCoords(result.lat, result.lng);
      } catch {
        setStatus(place ? "ready" : "need-pick");
        if (!place) setSheetOpen(true);
      }
    })();
  }, [applyCoords, place]);

  useEffect(() => {
    const trusted = readTrustedPlace();
    setHydrated(true);
    if (trusted) {
      setPlace(trusted);
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
        setStatus("need-pick");
        setSheetOpen(true);
        return;
      }
      try {
        await applyCoords(result.lat, result.lng);
      } catch {
        setStatus("need-pick");
        setSheetOpen(true);
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
    }),
    [applyPlace, hydrated, place, refreshGps, sheetOpen, status],
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

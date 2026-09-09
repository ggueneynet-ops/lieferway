"use client";

import { useI18n } from "@/components/locale-provider";
import { LocationPicker, saveRecentPlace } from "@/components/location-picker";
import { GEO_ATTEMPTED_KEY, PLZ_STORAGE_KEY } from "@/lib/geo";
import { waitForSplashIntro } from "@/lib/splash";
import { lookupPlz, normalizePlz } from "@/lib/plz";
import { formatPlaceLine, type DeliveryPlace } from "@/lib/place";
import { CITY_COOKIE, LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { ChevronDown, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`;
}

function persistPlace(place: DeliveryPlace | null) {
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
  setCookie(PLZ_COOKIE, place.postalCode);
  setCookie(LAT_COOKIE, String(place.lat));
  setCookie(LNG_COOKIE, String(place.lng));
  setCookie(STREET_COOKIE, place.street);
  setCookie(CITY_COOKIE, place.city);
}

function goMarketplace(place: DeliveryPlace | null, q: string, cuisine: string, km: number | null) {
  const params = new URLSearchParams();
  if (place) {
    params.set("plz", place.postalCode);
    params.set("km", km == null ? "all" : String(km));
  }
  if (q) params.set("q", q);
  if (cuisine) params.set("cuisine", cuisine);
  const qs = params.toString();
  window.location.assign(qs ? `/?${qs}` : "/");
}

function coordsFromBrowser(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 5 * 60_000 },
    );
  });
}

export function PlzForm({
  initialPlz,
  initialStreet = "",
  initialCity = "",
  q,
  cuisine,
  km = 5,
  autoDetect = false,
}: {
  initialPlz: string;
  initialStreet?: string;
  initialCity?: string;
  q: string;
  cuisine: string;
  km?: number | null;
  autoDetect?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busyGeo, setBusyGeo] = useState(false);
  const detecting = useRef(false);
  const placeMeta = initialPlz ? lookupPlz(initialPlz) : undefined;

  const applyPlace = useCallback(
    (place: DeliveryPlace) => {
      persistPlace(place);
      saveRecentPlace(place);
      goMarketplace(place, q, cuisine, km);
    },
    [cuisine, km, q],
  );

  useEffect(() => {
    if (initialPlz) {
      try {
        window.localStorage.setItem(PLZ_STORAGE_KEY, initialPlz);
      } catch {
        /* ignore */
      }
    }
  }, [initialPlz]);

  useEffect(() => {
    if (!autoDetect || initialPlz || detecting.current) return;
    detecting.current = true;

    let stored: string | null = null;
    try {
      stored = normalizePlz(window.localStorage.getItem(PLZ_STORAGE_KEY));
    } catch {
      stored = null;
    }
    if (stored) {
      const known = lookupPlz(stored);
      applyPlace({
        street: known?.district ?? "",
        postalCode: stored,
        city: "Frankfurt am Main",
        lat: known?.lat ?? 50.1109,
        lng: known?.lng ?? 8.6821,
      });
      return;
    }

    try {
      if (sessionStorage.getItem(GEO_ATTEMPTED_KEY) === "1") {
        setOpen(true);
        return;
      }
      sessionStorage.setItem(GEO_ATTEMPTED_KEY, "1");
    } catch {
      /* ignore */
    }

    async function run() {
      await waitForSplashIntro();
      setBusyGeo(true);
      try {
        const coords = await coordsFromBrowser();
        if (coords) {
          const res = await fetch(`/api/geo/plz?lat=${coords.lat}&lng=${coords.lng}`);
          const data = (await res.json()) as { place?: DeliveryPlace | null; plz?: string | null };
          if (data.place) {
            applyPlace(data.place);
            return;
          }
        }

        const ipRes = await fetch("/api/geo/ip");
        const ipData = (await ipRes.json()) as { plz?: string | null; city?: string };
        if (ipData.plz) {
          const known = lookupPlz(ipData.plz);
          applyPlace({
            street: known?.district ?? "",
            postalCode: ipData.plz,
            city: ipData.city ?? "Frankfurt am Main",
            lat: known?.lat ?? 50.1109,
            lng: known?.lng ?? 8.6821,
          });
          return;
        }
        setOpen(true);
      } catch {
        setOpen(true);
      } finally {
        setBusyGeo(false);
      }
    }

    void run();
  }, [applyPlace, autoDetect, initialPlz]);

  const summary = busyGeo && !initialPlz
    ? t.geoLocating
    : initialStreet
      ? initialStreet
      : initialPlz
        ? `${initialPlz}${placeMeta ? ` · ${placeMeta.district}` : ""}`
        : t.enterLocation;

  const subtitle = initialStreet
    ? `${initialPlz}${initialCity ? ` ${initialCity}` : ""}`
    : initialPlz
      ? t.deliverTo
      : t.fullAddress;

  return (
    <div id="lieferung">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl bg-bg-muted px-3 py-2.5 text-left"
        aria-haspopup="dialog"
      >
        <MapPin className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            {t.deliverTo}
          </span>
          <span className="block truncate text-sm font-semibold text-ink">{summary}</span>
          {initialStreet ? (
            <span className="block truncate text-[11px] text-text-secondary">{subtitle}</span>
          ) : null}
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary" />
      </button>

      <LocationPicker open={open} onClose={() => setOpen(false)} onPick={applyPlace} />
      <span className="sr-only">{formatPlaceLine({ street: initialStreet, postalCode: initialPlz || "", city: initialCity || "" })}</span>
    </div>
  );
}

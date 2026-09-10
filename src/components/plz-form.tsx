"use client";

import { useI18n } from "@/components/locale-provider";
import { LocationPicker, saveRecentPlace } from "@/components/location-picker";
import { PLZ_STORAGE_KEY } from "@/lib/geo";
import { defaultDemoPlace, lookupPlz, sanitizeDemoPlz } from "@/lib/plz";
import { formatPlaceLine, type DeliveryPlace } from "@/lib/place";
import { CITY_COOKIE, LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, STREET_COOKIE } from "@/lib/constants";
import { ChevronDown, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

export default function PlzForm({
  initialPlz,
  initialStreet = "",
  initialCity = "",
  q,
  cuisine,
  km = 5,
  autoDetect = false,
  compact = false,
}: {
  initialPlz: string;
  initialStreet?: string;
  initialCity?: string;
  q: string;
  cuisine: string;
  km?: number | null;
  autoDetect?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
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
    if (!autoDetect) return;
    const hasStreet = Boolean(initialStreet.trim());
    const next = sanitizeDemoPlz(initialPlz, hasStreet);
    if (next === initialPlz) {
      try {
        window.localStorage.setItem(PLZ_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return;
    }
    const demo = defaultDemoPlace();
    persistPlace({
      street: "",
      postalCode: demo.postalCode,
      city: demo.city,
      lat: demo.lat,
      lng: demo.lng,
    });
    goMarketplace(
      {
        street: "",
        postalCode: demo.postalCode,
        city: demo.city,
        lat: demo.lat,
        lng: demo.lng,
      },
      q,
      cuisine,
      km,
    );
  }, [autoDetect, cuisine, initialPlz, initialStreet, km, q]);

  const summary = initialStreet
    ? initialStreet
    : initialPlz
      ? `${initialPlz}${placeMeta ? ` · ${placeMeta.district}` : ""}`
      : t.enterLocation;

  const subtitle = initialStreet
    ? `${initialPlz}${initialCity ? ` ${initialCity}` : ""}`
    : initialPlz
      ? t.deliverTo
      : t.fullAddress;

  if (compact) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex max-w-[36vw] items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left text-sm text-ink hover:bg-muted sm:max-w-[16rem] sm:px-2"
          aria-haspopup="dialog"
        >
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate font-medium">{summary}</span>
        </button>
        <LocationPicker open={open} onClose={() => setOpen(false)} onPick={applyPlace} />
      </div>
    );
  }

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

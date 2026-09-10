"use client";

import { MapPin } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { LocationPicker, saveRecentPlace } from "@/components/location-picker";
import { PLZ_STORAGE_KEY } from "@/lib/geo";
import { lookupPlz } from "@/lib/plz";
import { CITY_COOKIE, LAT_COOKIE, LNG_COOKIE, PLZ_COOKIE, STREET_COOKIE } from "@/lib/constants";
import type { DeliveryPlace } from "@/lib/place";
import { useCallback, useState } from "react";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function persistPlace(place: DeliveryPlace) {
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

export function HeroSearch({
  initialPlz,
  initialStreet = "",
  q,
  cuisine,
  km = 5,
}: {
  initialPlz: string;
  initialStreet?: string;
  q?: string;
  cuisine?: string;
  km?: number | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const meta = initialPlz ? lookupPlz(initialPlz) : undefined;
  const label = initialStreet
    ? initialStreet
    : initialPlz
      ? `${initialPlz}${meta ? ` · ${meta.district}` : ""}`
      : t.addressPlaceholder;

  const go = useCallback(
    (place: DeliveryPlace) => {
      persistPlace(place);
      saveRecentPlace(place);
      const params = new URLSearchParams();
      params.set("plz", place.postalCode);
      params.set("km", km == null ? "all" : String(km));
      if (q) params.set("q", q);
      if (cuisine) params.set("cuisine", cuisine);
      window.location.assign(`/?${params.toString()}#restaurants`);
    },
    [cuisine, km, q],
  );

  function find() {
    if (initialPlz) {
      document.getElementById("restaurants")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setOpen(true);
  }

  return (
    <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-white px-4 text-left text-[15px] text-ink shadow-none"
      >
        <MapPin className="size-5 shrink-0 text-primary" />
        <span className={`truncate ${initialPlz ? "font-medium" : "text-text-secondary"}`}>{label}</span>
      </button>
      <button
        type="button"
        onClick={find}
        className="h-14 shrink-0 rounded-2xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-pressed"
      >
        {t.findRestaurants}
      </button>
      <LocationPicker open={open} onClose={() => setOpen(false)} onPick={go} />
    </div>
  );
}

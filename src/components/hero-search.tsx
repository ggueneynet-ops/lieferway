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
    <div className="w-full max-w-xl">
      <p className="text-[13px] font-semibold text-[#111827]">{t.heroWhere}</p>
      <p className="mt-0.5 text-[12px] text-[#6B7280]">{t.heroAddressLabel}</p>
      <div className="mt-3 w-full rounded-[22px] border border-black/[0.06] bg-white p-2 shadow-[0_16px_40px_rgba(17,24,39,0.08)] sm:flex sm:items-stretch sm:gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-[16px] bg-[#FAFAFA] px-4 text-left text-[15px] text-[#111827] sm:h-[3.65rem] sm:px-5"
      >
        <MapPin className="size-5 shrink-0 text-[#B72E57]" strokeWidth={1.75} />
        <span className={`truncate ${initialPlz ? "font-semibold" : "text-[#9CA3AF]"}`}>{label}</span>
      </button>
      <button
        type="button"
        onClick={find}
        className="mt-2 h-14 w-full shrink-0 rounded-[16px] bg-[#B72E57] px-7 text-sm font-semibold text-white hover:bg-[#922546] sm:mt-0 sm:h-[3.65rem] sm:w-auto"
      >
        {t.findRestaurants}
      </button>
      <LocationPicker open={open} onClose={() => setOpen(false)} onPick={go} />
      </div>
    </div>
  );
}

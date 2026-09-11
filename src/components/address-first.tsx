"use client";

import { MapPin } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { LocationPicker, saveRecentPlace } from "@/components/location-picker";
import { persistDeliveryPlace } from "@/lib/persist-place";
import { DEMO_PLZ_CHIPS, lookupPlz } from "@/lib/plz";
import { markSplashShown } from "@/lib/splash";
import type { DeliveryPlace } from "@/lib/place";
import { useCallback, useState } from "react";

export function AddressFirst({
  q,
  cuisine,
  km = 5,
}: {
  q?: string;
  cuisine?: string;
  km?: number | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const go = useCallback(
    (place: DeliveryPlace) => {
      markSplashShown();
      persistDeliveryPlace(place);
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

  function pickChip(plz: string) {
    const meta = lookupPlz(plz);
    if (!meta) return;
    go({
      street: "",
      postalCode: meta.plz,
      city: "Frankfurt am Main",
      lat: meta.lat,
      lng: meta.lng,
    });
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#E8E8EC] bg-white px-5 py-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FCE4EC] text-[#E91E63]">
        <MapPin className="size-5" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-[#0F172A]">{t.addressFirstTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{t.addressFirstLead}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#E91E63] px-5 text-sm font-semibold text-white hover:bg-[#C2185B]"
      >
        {t.enterLocation}
      </button>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {DEMO_PLZ_CHIPS.slice(0, 3).map((chip) => (
          <button
            key={chip.plz}
            type="button"
            onClick={() => pickChip(chip.plz)}
            className="rounded-full border border-[#E8E8EC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0F172A] hover:border-[#E91E63] hover:text-[#E91E63]"
          >
            {chip.label}
          </button>
        ))}
      </div>
      <LocationPicker open={open} onClose={() => setOpen(false)} onPick={go} />
    </div>
  );
}

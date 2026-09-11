"use client";

import { useI18n } from "@/components/locale-provider";
import { LocationPicker, saveRecentPlace } from "@/components/location-picker";
import { lookupPlz } from "@/lib/plz";
import { markSplashShown } from "@/lib/splash";
import { formatLocationChip, formatPlaceLine, type DeliveryPlace } from "@/lib/place";
import { goMarketplace, persistDeliveryPlace } from "@/lib/persist-place";
import { ChevronDown, MapPin } from "lucide-react";
import { useCallback, useState } from "react";

export default function PlzForm({
  initialPlz,
  initialStreet = "",
  initialCity = "",
  q,
  cuisine,
  km = 5,
  compact = false,
}: {
  initialPlz: string;
  initialStreet?: string;
  initialCity?: string;
  q: string;
  cuisine: string;
  km?: number | null;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const placeMeta = initialPlz ? lookupPlz(initialPlz) : undefined;

  const applyPlace = useCallback(
    (place: DeliveryPlace) => {
      markSplashShown();
      persistDeliveryPlace(place);
      saveRecentPlace(place);
      goMarketplace(place, q, cuisine, km);
    },
    [cuisine, km, q],
  );

  const summary =
    formatLocationChip({
      postalCode: initialPlz,
      city: initialCity || "Frankfurt am Main",
      district: placeMeta?.district,
      street: initialStreet,
    }) || t.enterLocation;

  if (compact) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 max-w-full items-center gap-1 py-1 text-left text-[#0F172A]"
          aria-haspopup="dialog"
        >
          <MapPin className="size-4 shrink-0 text-[#E91E63]" strokeWidth={2.25} />
          <span className="min-w-0 truncate text-[15px] font-bold tracking-tight">{summary}</span>
          <ChevronDown className="size-4 shrink-0 text-[#94A3B8]" strokeWidth={2} />
        </button>
        <LocationPicker variant="sheet" open={open} onClose={() => setOpen(false)} onPick={applyPlace} />
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
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary" />
      </button>

      <LocationPicker open={open} onClose={() => setOpen(false)} onPick={applyPlace} />
      <span className="sr-only">
        {formatPlaceLine({ street: initialStreet, postalCode: initialPlz || "", city: initialCity || "" })}
      </span>
    </div>
  );
}

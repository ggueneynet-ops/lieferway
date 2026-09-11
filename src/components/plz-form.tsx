"use client";

import { useI18n } from "@/components/locale-provider";
import { LocationPicker, saveRecentPlace } from "@/components/location-picker";
import { useLocation } from "@/components/location-provider";
import { lookupPlz } from "@/lib/plz";
import { markSplashShown } from "@/lib/splash";
import { formatLocationChip, formatPlaceLine, type DeliveryPlace } from "@/lib/place";
import { type GeoSource } from "@/lib/persist-place";
import { ChevronDown, MapPin } from "lucide-react";
import { useCallback } from "react";

export default function PlzForm({
  initialPlz,
  initialStreet = "",
  initialCity = "",
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
  const loc = useLocation();
  const placeMeta = initialPlz ? lookupPlz(initialPlz) : undefined;

  const applyPlace = useCallback(
    (place: DeliveryPlace, source: GeoSource = "manual") => {
      markSplashShown();
      saveRecentPlace(place);
      loc.applyPlace(place, source);
    },
    [loc],
  );

  const live = loc.place;
  const summary =
    loc.status === "locating"
      ? t.geoLocating
      : loc.status === "need-pick" || !live
        ? t.chooseLocation
        : formatLocationChip({
            postalCode: live.postalCode,
            city: live.city,
          }) || t.chooseLocation;

  if (compact) {
    return (
      <div>
        <button
          type="button"
          onClick={() => loc.setSheetOpen(true)}
          className="inline-flex min-h-11 max-w-full items-center gap-1 py-1 text-left text-[#0F172A]"
          aria-haspopup="dialog"
        >
          <MapPin className="size-4 shrink-0 text-[#E91E63]" strokeWidth={2.25} />
          <span className="min-w-0 truncate text-[15px] font-bold tracking-tight">{summary}</span>
          <ChevronDown className="size-4 shrink-0 text-[#94A3B8]" strokeWidth={2} />
        </button>
        <LocationPicker
          variant="sheet"
          open={loc.sheetOpen}
          onClose={() => loc.setSheetOpen(false)}
          onPick={applyPlace}
        />
      </div>
    );
  }

  const fallback = formatLocationChip({
    postalCode: initialPlz,
    city: initialCity,
    district: placeMeta?.district,
    street: initialStreet,
  });

  return (
    <div id="lieferung">
      <button
        type="button"
        onClick={() => loc.setSheetOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl bg-bg-muted px-3 py-2.5 text-left"
        aria-haspopup="dialog"
      >
        <MapPin className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            {t.deliverTo}
          </span>
          <span className="block truncate text-sm font-semibold text-ink">
            {summary || (loc.status === "ready" ? fallback : "") || t.chooseLocation}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-secondary" />
      </button>

      <LocationPicker open={loc.sheetOpen} onClose={() => loc.setSheetOpen(false)} onPick={applyPlace} />
      <span className="sr-only">
        {formatPlaceLine({
          street: live?.street ?? initialStreet,
          postalCode: live?.postalCode || initialPlz || "",
          city: live?.city || initialCity || "",
        })}
      </span>
    </div>
  );
}

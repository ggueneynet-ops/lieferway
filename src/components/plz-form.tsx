"use client";

import { useI18n } from "@/components/locale-provider";
import { DEMO_PLZ_CHIPS, nearestPlz, normalizePlz } from "@/lib/plz";
import { MapPin, Navigation } from "lucide-react";
import { useState } from "react";

export function PlzForm({
  initialPlz,
  q,
  cuisine,
}: {
  initialPlz: string;
  q: string;
  cuisine: string;
}) {
  const { t } = useI18n();
  const [geoError, setGeoError] = useState("");
  const [busyGeo, setBusyGeo] = useState(false);

  function hiddenFilters() {
    return (
      <>
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
      </>
    );
  }

  function useLocation() {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError(t.geoDenied);
      return;
    }
    setBusyGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const place = nearestPlz(pos.coords.latitude, pos.coords.longitude);
        const form = document.getElementById("plz-form") as HTMLFormElement | null;
        const input = form?.elements.namedItem("plz") as HTMLInputElement | null;
        if (input) input.value = place.plz;
        form?.requestSubmit();
        setBusyGeo(false);
      },
      () => {
        setGeoError(t.geoDenied);
        setBusyGeo(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <div id="lieferung" className="mt-6 rounded-2xl border border-border bg-white/90 p-3 shadow-sm sm:p-4">
      <form id="plz-form" action="/plz" method="post" className="space-y-3">
        {hiddenFilters()}
        <label htmlFor="plz" className="text-sm font-medium text-ink">
          {t.deliveryAddressPlz}
        </label>
        <div className="mt-1.5 flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <input
              id="plz"
              name="plz"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              defaultValue={initialPlz}
              placeholder={t.plzPlaceholder}
              className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base tracking-wide"
              onInput={(e) => {
                const el = e.currentTarget;
                el.value = (normalizePlz(el.value) ?? el.value.replace(/\D/g, "")).slice(0, 5);
              }}
            />
          </div>
          <button
            type="submit"
            className="h-12 shrink-0 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
          >
            {t.showRestaurants}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t.plzHint}</p>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DEMO_PLZ_CHIPS.map((chip) => (
          <form key={chip.plz} action="/plz" method="post">
            {hiddenFilters()}
            <button
              type="submit"
              name="plz"
              value={chip.plz}
              className={`rounded-full border px-3 py-1 text-xs ${
                initialPlz === chip.plz
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white hover:bg-muted"
              }`}
            >
              {chip.label}
            </button>
          </form>
        ))}
        {initialPlz ? (
          <form action="/plz" method="post">
            {hiddenFilters()}
            <button
              type="submit"
              name="clear"
              value="1"
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
            >
              {t.allPlz}
            </button>
          </form>
        ) : null}
      </div>
      <button
        type="button"
        onClick={useLocation}
        disabled={busyGeo}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-60"
      >
        <Navigation className="size-3.5" />
        {busyGeo ? t.processing : t.nearMe}
      </button>
      {geoError ? <p className="mt-1 text-xs text-danger">{geoError}</p> : null}
    </div>
  );
}

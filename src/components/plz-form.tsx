"use client";

import { useI18n } from "@/components/locale-provider";
import { DEMO_PLZ_CHIPS, lookupPlz, nearestPlz, normalizePlz } from "@/lib/plz";
import { ChevronDown, MapPin, Navigation } from "lucide-react";
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
  const [open, setOpen] = useState(!initialPlz);
  const [geoError, setGeoError] = useState("");
  const [busyGeo, setBusyGeo] = useState(false);
  const place = initialPlz ? lookupPlz(initialPlz) : undefined;

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
        const next = nearestPlz(pos.coords.latitude, pos.coords.longitude);
        const form = document.getElementById("plz-form") as HTMLFormElement | null;
        const input = form?.elements.namedItem("plz") as HTMLInputElement | null;
        if (input) input.value = next.plz;
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
    <div id="lieferung" className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl bg-bg-muted px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <MapPin className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            {t.deliverTo}
          </span>
          <span className="block truncate text-sm font-semibold text-ink">
            {initialPlz
              ? `${initialPlz}${place ? ` · ${place.district}` : ""}`
              : t.enterPlz}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-text-secondary transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="rounded-xl border border-border bg-white p-2.5">
          <form id="plz-form" action="/plz" method="post">
            {hiddenFilters()}
            <label htmlFor="plz" className="sr-only">
              {t.deliveryAddressPlz}
            </label>
            <div className="flex gap-2">
              <input
                id="plz"
                name="plz"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                defaultValue={initialPlz}
                placeholder={t.plzPlaceholder}
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base tracking-wide"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.value = (normalizePlz(el.value) ?? el.value.replace(/\D/g, "")).slice(0, 5);
                }}
              />
              <button
                type="submit"
                className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
              >
                {t.showRestaurants}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t.plzHint}</p>
          </form>
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {DEMO_PLZ_CHIPS.map((chip) => (
              <form key={chip.plz} action="/plz" method="post" className="shrink-0">
                {hiddenFilters()}
                <button
                  type="submit"
                  name="plz"
                  value={chip.plz}
                  className={`rounded-full px-3 py-1 text-xs ${
                    initialPlz === chip.plz
                      ? "bg-primary text-primary-foreground"
                      : "bg-bg-muted text-ink hover:bg-primary-soft"
                  }`}
                >
                  {chip.label}
                </button>
              </form>
            ))}
            {initialPlz ? (
              <form action="/plz" method="post" className="shrink-0">
                {hiddenFilters()}
                <button
                  type="submit"
                  name="clear"
                  value="1"
                  className="rounded-full bg-bg-muted px-3 py-1 text-xs hover:bg-primary-soft"
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
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary disabled:opacity-60"
          >
            <Navigation className="size-3.5" />
            {busyGeo ? t.processing : t.nearMe}
          </button>
          {geoError ? <p className="mt-1 text-xs text-danger">{geoError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

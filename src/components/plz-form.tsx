"use client";

import { useI18n } from "@/components/locale-provider";
import { GEO_ATTEMPTED_KEY, PLZ_STORAGE_KEY } from "@/lib/geo";
import { waitForSplashIntro } from "@/lib/splash";
import { DEMO_PLZ_CHIPS, lookupPlz, normalizePlz } from "@/lib/plz";
import { ChevronDown, MapPin, Navigation } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

function persistPlz(plz: string) {
  try {
    window.localStorage.setItem(PLZ_STORAGE_KEY, plz);
  } catch {
    /* private mode */
  }
  document.cookie = `lw_plz=${plz};path=/;max-age=31536000;SameSite=Lax`;
}

function rememberPlz(plz: string, q: string, cuisine: string) {
  persistPlz(plz);
  const params = new URLSearchParams();
  params.set("plz", plz);
  if (q) params.set("q", q);
  if (cuisine) params.set("cuisine", cuisine);
  window.location.assign(`/?${params.toString()}`);
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
  q,
  cuisine,
  autoDetect = false,
}: {
  initialPlz: string;
  q: string;
  cuisine: string;
  autoDetect?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [geoHint, setGeoHint] = useState("");
  const [busyGeo, setBusyGeo] = useState(false);
  const detecting = useRef(false);
  const place = initialPlz ? lookupPlz(initialPlz) : undefined;

  const applyPlz = useCallback(
    (plz: string) => {
      const n = normalizePlz(plz);
      if (!n || n === initialPlz) return;
      rememberPlz(n, q, cuisine);
    },
    [cuisine, initialPlz, q],
  );

  useEffect(() => {
    if (initialPlz) persistPlz(initialPlz);
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
      applyPlz(stored);
      return;
    }

    try {
      if (sessionStorage.getItem(GEO_ATTEMPTED_KEY) === "1") return;
      sessionStorage.setItem(GEO_ATTEMPTED_KEY, "1");
    } catch {
      /* ignore */
    }

    async function run() {
      await waitForSplashIntro();
      setBusyGeo(true);
      setGeoError("");
      setGeoHint(t.geoPermission);
      try {
        const coords = await coordsFromBrowser();
        if (coords) {
          const res = await fetch(`/api/geo/plz?lat=${coords.lat}&lng=${coords.lng}`);
          const data = (await res.json()) as { plz?: string | null };
          if (data.plz) {
            applyPlz(data.plz);
            return;
          }
        }

        const ipRes = await fetch("/api/geo/ip");
        const ipData = (await ipRes.json()) as { plz?: string | null };
        if (ipData.plz) {
          setGeoHint(t.geoIpFallback);
          applyPlz(ipData.plz);
          return;
        }
        setGeoError(t.geoFailed);
        setOpen(true);
      } catch {
        setGeoError(t.geoFailed);
        setOpen(true);
      } finally {
        setBusyGeo(false);
        setGeoHint("");
      }
    }

    void run();
  }, [applyPlz, autoDetect, initialPlz, t.geoFailed, t.geoIpFallback, t.geoPermission]);

  function hiddenFilters() {
    return (
      <>
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
      </>
    );
  }

  function storeFromForm(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    if (String(data.get("clear") ?? "") === "1") {
      try {
        localStorage.removeItem(PLZ_STORAGE_KEY);
        sessionStorage.setItem(GEO_ATTEMPTED_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    const n = normalizePlz(String(data.get("plz") ?? ""));
    if (n) persistPlz(n);
  }

  async function useLocation() {
    setGeoError("");
    setBusyGeo(true);
    try {
      const coords = await coordsFromBrowser();
      if (!coords) {
        setGeoError(t.geoDenied);
        const ipRes = await fetch("/api/geo/ip");
        const ipData = (await ipRes.json()) as { plz?: string | null };
        if (ipData.plz) applyPlz(ipData.plz);
        return;
      }
      const res = await fetch(`/api/geo/plz?lat=${coords.lat}&lng=${coords.lng}`);
      const data = (await res.json()) as { plz?: string | null };
      if (data.plz) applyPlz(data.plz);
      else setGeoError(t.geoFailed);
    } catch {
      setGeoError(t.geoFailed);
    } finally {
      setBusyGeo(false);
    }
  }

  const summary = busyGeo && !initialPlz ? t.geoLocating : initialPlz ? `${initialPlz}${place ? ` · ${place.district}` : ""}` : t.enterPlz;

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
          <span className="block truncate text-sm font-semibold text-ink">{summary}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-text-secondary transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="rounded-xl border border-border bg-white p-2.5">
          <form id="plz-form" action="/plz" method="post" onSubmit={storeFromForm}>
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
              <form key={chip.plz} action="/plz" method="post" className="shrink-0" onSubmit={storeFromForm}>
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
              <form action="/plz" method="post" className="shrink-0" onSubmit={storeFromForm}>
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
            {busyGeo ? t.geoLocating : t.nearMe}
          </button>
          {geoHint && !geoError ? <p className="mt-1 text-xs text-muted-foreground">{geoHint}</p> : null}
          {geoError ? <p className="mt-1 text-xs text-danger">{geoError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

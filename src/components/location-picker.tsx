"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, MapPin, Navigation, Search, X } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { formatDistanceShort, haversineKm, lookupPlz, DEMO_PLZ_CHIPS } from "@/lib/plz";
import { formatLocationChip, formatPlaceLine, placeKey, type DeliveryPlace } from "@/lib/place";
import { useLocation } from "@/components/location-provider";
import { geoErrorMessage, requestDeviceCoords } from "@/lib/browser-geo";
import type { GeoSource } from "@/lib/persist-place";

const RECENT_KEY = "lw_recent_places";

type SavedAddress = DeliveryPlace & { id: string; label?: string };

function loadRecent(): DeliveryPlace[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeliveryPlace[];
    return Array.isArray(parsed) ? parsed.filter((p) => p.postalCode && p.street) : [];
  } catch {
    return [];
  }
}

export function saveRecentPlace(place: DeliveryPlace) {
  try {
    const prev = loadRecent().filter((p) => placeKey(p) !== placeKey(place));
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([place, ...prev].slice(0, 8)));
  } catch {
    /* private mode */
  }
}

export function LocationPicker({
  open,
  onClose,
  onPick,
  variant = "full",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (place: DeliveryPlace, source?: GeoSource) => void;
  variant?: "full" | "sheet";
}) {
  const { t, locale } = useI18n();
  const loc = useLocation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<DeliveryPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [recent, setRecent] = useState<DeliveryPlace[]>([]);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [editingRecent, setEditingRecent] = useState(false);
  const [here, setHere] = useState<DeliveryPlace | null>(null);
  const [hereBusy, setHereBusy] = useState(false);
  const [hereError, setHereError] = useState("");
  const [hereHint, setHereHint] = useState("");
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsLock = useRef(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      document.body.style.overflow = "";
      return;
    }
    const justOpened = !wasOpen.current;
    wasOpen.current = true;
    if (justOpened) {
      setQ("");
      setHits([]);
      setEditingRecent(false);
      setRecent(loadRecent());
      setHereError("");
      setHereHint("");
      setHere(null);
      setHereBusy(false);
      gpsLock.current = false;
      gpsRef.current = null;
    }
    const tId = window.setTimeout(() => {
      if (variant !== "sheet") inputRef.current?.focus();
    }, 50);
    document.body.style.overflow = "hidden";

    if (justOpened && variant !== "sheet") {
      void (async () => {
        const res = await fetch("/api/addresses");
        if (res.ok) {
          const data = (await res.json()) as { addresses?: SavedAddress[] };
          setSaved(
            (data.addresses ?? []).filter((a) => a.lat != null && a.lng != null) as SavedAddress[],
          );
        }
      })();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(tId);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as { places?: DeliveryPlace[] };
        setHits(data.places ?? []);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [q, open]);

  const origin = here ?? (gpsRef.current ? { ...gpsRef.current, street: "", postalCode: "", city: "" } : null);

  function distBadge(place: { lat?: number | null; lng?: number | null }) {
    if (!origin || place.lat == null || place.lng == null) return null;
    const km = haversineKm({ lat: origin.lat, lng: origin.lng }, { lat: place.lat, lng: place.lng });
    if (!Number.isFinite(km)) return null;
    return formatDistanceShort(km, locale);
  }

  function pick(place: DeliveryPlace, source: GeoSource = "manual") {
    saveRecentPlace(place);
    onPick(place, source);
  }

  async function applyCoords(lat: number, lng: number, apply: boolean) {
    gpsRef.current = { lat, lng };
    const res = await fetch(`/api/geo/plz?lat=${lat}&lng=${lng}`);
    const data = (await res.json()) as { place?: DeliveryPlace | null };
    if (!data.place || (!data.place.postalCode && !data.place.city)) {
      setHereError(t.geoFailed);
      loc.rejectGps();
      return false;
    }
    setHere(data.place);
    setHereError("");
    setHereHint("");
    if (apply) pick(data.place, "gps");
    return true;
  }

  function onCurrentLocationClick(e?: { stopPropagation?: () => void; preventDefault?: () => void }) {
    e?.stopPropagation?.();
    if (gpsLock.current) return;
    gpsLock.current = true;
    // Start GPS in this user-gesture turn (Safari). Do not await first.
    const resultPromise = requestDeviceCoords({ force: true });
    setHereBusy(true);
    setHereError("");
    setHereHint("");
    setHere(null);
    gpsRef.current = null;
    void (async () => {
      try {
        const result = await resultPromise;
        if (result.ok) {
          await applyCoords(result.lat, result.lng, true);
          return;
        }
        setHereError(geoErrorMessage(result.error, t));
        loc.rejectGps();
      } catch {
        setHereError(t.geoFailed);
        loc.rejectGps();
      } finally {
        gpsLock.current = false;
        setHereBusy(false);
      }
    })();
  }

  function removeRecent(place: DeliveryPlace) {
    const next = recent.filter((p) => placeKey(p) !== placeKey(place));
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function clearRecent() {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
    setEditingRecent(false);
  }

  const visibleSaved = showAllSaved ? saved : saved.slice(0, 3);
  const typing = q.trim().length >= 2;

  const list = useMemo(() => hits, [hits]);

  if (!open) return null;

  const hereSubtitle = hereBusy
    ? t.geoLocating
    : here
      ? `${formatPlaceLine(here)}${hereHint ? ` · ${hereHint}` : ""}`
      : hereError || t.geoTapHint;

  const sheet = variant === "sheet";

  function rowTitle(p: DeliveryPlace) {
    if (p.street.trim()) return p.street;
    const city = p.city.trim();
    if (city && p.postalCode) return `${city}, ${p.postalCode}`;
    return (
      formatLocationChip({
        postalCode: p.postalCode,
        city: p.city,
        district: lookupPlz(p.postalCode)?.district,
      }) || p.postalCode
    );
  }

  const gpsButton = (
    <button
      type="button"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        onCurrentLocationClick(e);
      }}
      onClick={onCurrentLocationClick}
      aria-busy={hereBusy}
      className="relative z-10 flex w-full cursor-pointer items-start gap-3 py-3 text-left touch-manipulation"
    >
      <Navigation className="mt-0.5 size-5 shrink-0 text-ink" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{t.currentLocation}</span>
        <span className="block text-sm text-text-secondary">{hereSubtitle}</span>
      </span>
    </button>
  );

  const searchField = (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={sheet ? t.plzOrAddress : t.fullAddress}
        autoComplete="street-address"
        enterKeyHint="search"
        className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-base outline-none ring-primary focus:border-primary focus:ring-2"
      />
      {q ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-secondary hover:bg-bg-muted"
          onClick={() => setQ("")}
          aria-label={t.cancel}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </label>
  );

  const ui = (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lw-loc-title"
        className={`flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl ${
          sheet
            ? "max-h-[min(70dvh,520px)]"
            : "max-h-[100dvh] sm:max-h-[min(720px,92vh)]"
        }`}
      >
        <header className="relative flex items-center justify-center px-4 py-3">
          <h2 id="lw-loc-title" className="text-base font-semibold text-ink">
            {sheet ? t.locationTitle : t.enterLocation}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-bg-muted px-3 py-1.5 text-sm font-medium text-ink hover:bg-primary-soft"
          >
            {t.cancel}
          </button>
        </header>

        {sheet ? (
          <>
            <div className="px-4">{gpsButton}</div>
            <div className="px-4 pb-2">{searchField}</div>
          </>
        ) : (
          <div className="px-4 pb-2">{searchField}</div>
        )}

        <div
          className={`overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
            sheet ? "" : "min-h-0 flex-1"
          }`}
        >
          {typing ? (
            <div className="mt-1">
              {searching ? <p className="py-3 text-sm text-muted-foreground">{t.geoLocating}</p> : null}
              {!searching && list.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">{t.noAddressResults}</p>
              ) : (
                <ul>
                  {list.map((p) => (
                    <PlaceRow
                      key={placeKey(p)}
                      title={rowTitle(p)}
                      subtitle={`${p.postalCode} ${p.city}`}
                      badge={distBadge(p)}
                      onClick={() => pick(p)}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : sheet ? (
            <div className="mt-1 flex flex-wrap gap-2 pb-2">
              {DEMO_PLZ_CHIPS.map((chip) => (
                <button
                  key={chip.plz}
                  type="button"
                  onClick={() => {
                    const meta = lookupPlz(chip.plz);
                    if (!meta) return;
                    pick({
                      street: "",
                      postalCode: meta.plz,
                      city: "Frankfurt am Main",
                      lat: meta.lat,
                      lng: meta.lng,
                    });
                  }}
                  className="rounded-full border border-[#E8E8EC] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0F172A]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              {gpsButton}

              {saved.length > 0 ? (
                <section className="mt-2">
                  <h3 className="text-sm font-semibold text-ink">{t.yourAddresses}</h3>
                  <ul>
                    {visibleSaved.map((a, i) => (
                      <PlaceRow
                        key={a.id}
                        title={a.street}
                        subtitle={`${a.postalCode}, ${a.city}`}
                        badge={distBadge(a)}
                        pinFilled={i === 0}
                        onClick={() => pick(a)}
                      />
                    ))}
                  </ul>
                  {saved.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllSaved((v) => !v)}
                      className="mt-1 inline-flex items-center gap-1 text-sm text-text-secondary"
                    >
                      {showAllSaved ? t.cancel : t.showAllAddresses}
                    </button>
                  ) : null}
                </section>
              ) : null}

              <section className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">{t.recentSearches}</h3>
                  {recent.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => (editingRecent ? clearRecent() : setEditingRecent(true))}
                      className="text-sm text-text-secondary"
                    >
                      {editingRecent ? t.clearRecent : t.edit}
                    </button>
                  ) : null}
                </div>
                {recent.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">{t.noRecentSearches}</p>
                ) : (
                  <ul>
                    {recent.map((p) => (
                      <li key={placeKey(p)} className="flex items-center gap-1">
                        <PlaceRow
                          title={rowTitle(p)}
                          subtitle={`${p.postalCode} ${p.city}`}
                          badge={distBadge(p)}
                          icon="clock"
                          onClick={() => pick(p)}
                          className="flex-1"
                        />
                        {editingRecent ? (
                          <button
                            type="button"
                            className="rounded-full p-2 text-text-secondary hover:bg-bg-muted"
                            onClick={() => removeRecent(p)}
                            aria-label={t.delete}
                          >
                            <X className="size-4" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}

function PlaceRow({
  title,
  subtitle,
  badge,
  onClick,
  pinFilled,
  icon = "pin",
  className = "",
}: {
  title: string;
  subtitle: string;
  badge?: string | null;
  onClick: () => void;
  pinFilled?: boolean;
  icon?: "pin" | "clock";
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-start gap-3 py-3 text-left ${className}`}>
      {icon === "clock" ? (
        <Clock className="mt-0.5 size-5 shrink-0 text-text-secondary" />
      ) : (
        <MapPin className={`mt-0.5 size-5 shrink-0 ${pinFilled ? "fill-primary text-primary" : "text-text-secondary"}`} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block truncate text-sm text-text-secondary">{subtitle}</span>
      </span>
      {badge ? (
        <span className="shrink-0 rounded-md bg-bg-muted px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

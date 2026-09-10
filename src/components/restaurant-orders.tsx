"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { interpolate, type Locale } from "@/lib/i18n";
import { formatBerlinDateTime } from "@/lib/datetime";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import type { KitchenOrder } from "@/lib/restaurant-live";
import { parsePrepMinutes, PREP_CHIPS } from "@/lib/prep";
import { PrintBonButton } from "@/components/print-bon-button";
import { playKitchenBell, startKeepAlive, stopKeepAlive, unlockKitchenBell } from "@/lib/kitchen-gong";
import { isPickup } from "@/lib/fulfillment";

const MUTE_KEY = "lw_kitchen_mute";
const ALERT_MS = 1150;

type Snapshot = {
  orders: KitchenOrder[];
  incoming: number;
  restaurant?: { isOpen: boolean; name: string };
};

function orderTime(iso: string, locale: Locale) {
  return formatBerlinDateTime(iso, locale);
}

export function RestaurantOrders({
  initial,
  isOpen,
  restaurantId,
  restaurantName,
}: {
  initial: KitchenOrder[];
  isOpen: boolean;
  restaurantId: string;
  restaurantName: string;
}) {
  const [orders, setOrders] = useState(initial);
  const [open, setOpen] = useState(isOpen);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MUTE_KEY) === "1";
  });
  const [flash, setFlash] = useState(false);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const incomingKeyRef = useRef("");
  const { t, locale } = useI18n();
  const baseTitle = `${restaurantName} · ${t.restaurantOrders}`;

  const applySnapshot = useCallback((data: Snapshot) => {
    const next = data.orders ?? [];
    if (data.restaurant?.isOpen != null) setOpen(data.restaurant.isOpen);
    const ids = next.map((o) => o.id);
    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
    } else {
      const fresh = next.filter((o) => o.status === "PLACED" && !seenRef.current!.has(o.id));
      if (fresh.length > 0) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 2800);
        setHighlight(new Set(fresh.map((o) => o.id)));
        window.setTimeout(() => setHighlight(new Set()), 8000);
      }
      ids.forEach((id) => seenRef.current!.add(id));
    }
    setOrders(next);
  }, []);

  useEffect(() => {
    const incoming = orders.filter((o) => o.status === "PLACED").length;
    document.title = incoming > 0 ? `(${incoming}) ${baseTitle}` : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [orders, baseTitle]);

  const incomingKey = orders
    .filter((o) => o.status === "PLACED")
    .map((o) => o.id)
    .sort()
    .join(",");
  incomingKeyRef.current = incomingKey;

  useEffect(() => {
    if (!incomingKey || muted) stopKeepAlive();
  }, [incomingKey, muted]);

  // One scheduler for the kitchen page lifetime. Snapshot polls must not clear it
  // (that was stopping the alert after ~2 hits). Keep-alive holds AudioContext open.
  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;

    const strikeIfNeeded = () => {
      if (stopped) return;
      if (!mutedRef.current && incomingKeyRef.current) {
        unlockKitchenBell();
        startKeepAlive();
        playKitchenBell();
      } else {
        stopKeepAlive();
      }
    };

    const loop = () => {
      if (stopped) return;
      strikeIfNeeded();
      const wait = !mutedRef.current && incomingKeyRef.current ? ALERT_MS : 500;
      timer = window.setTimeout(loop, wait);
    };

    strikeIfNeeded();
    timer = window.setTimeout(loop, !mutedRef.current && incomingKeyRef.current ? ALERT_MS : 500);

    return () => {
      stopped = true;
      if (timer != null) window.clearTimeout(timer);
      stopKeepAlive();
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    let pollId: number | undefined;
    const url = `/api/restaurant/orders/stream?restaurantId=${encodeURIComponent(restaurantId)}`;

    const poll = async () => {
      const res = await fetch(`/api/restaurant/orders?restaurantId=${encodeURIComponent(restaurantId)}`);
      if (!res.ok || stopped) return;
      const data = (await res.json()) as Snapshot;
      applySnapshot(data);
    };

    const startPoll = () => {
      if (pollId != null) return;
      void poll();
      pollId = window.setInterval(() => {
        void poll();
      }, 2500);
    };

    let es: EventSource | null = null;
    let gotMessage = false;
    const watchdog = window.setTimeout(() => {
      if (!stopped && !gotMessage) startPoll();
    }, 4000);

    try {
      es = new EventSource(url);
      es.onopen = () => {
        if (!stopped) setLive(true);
      };
      es.onmessage = (ev) => {
        if (stopped) return;
        gotMessage = true;
        setLive(true);
        try {
          applySnapshot(JSON.parse(ev.data) as Snapshot);
        } catch {
          /* ignore malformed frames */
        }
      };
      es.onerror = () => {
        setLive(false);
        startPoll();
      };
    } catch {
      startPoll();
    }

    return () => {
      stopped = true;
      es?.close();
      if (pollId != null) window.clearInterval(pollId);
      window.clearTimeout(watchdog);
    };
  }, [restaurantId, applySnapshot]);

  useEffect(() => {
    const unlock = () => {
      unlockKitchenBell();
      startKeepAlive();
      if (incomingKeyRef.current && !mutedRef.current) playKitchenBell();
    };
    unlockKitchenBell();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  async function act(id: string, action: string, prepMinutes?: number) {
    if (pending.has(id)) return;
    const nextStatus: Record<string, KitchenOrder["status"]> = {
      accept: "PREPARING",
      reject: "REJECTED",
      preparing: "PREPARING",
      ready: "READY",
      out: "OUT_FOR_DELIVERY",
      deliver: "DELIVERED",
    };
    setActionError(null);
    setPending((cur) => new Set(cur).add(id));
    try {
      const isAccept = action === "accept" || action === "preparing";
      const res = isAccept
        ? await fetch("/api/restaurant/orders/accept", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ orderId: id, prepMinutes }),
          })
        : await fetch(`/api/orders/${id}`, {
            method: "PATCH",
            credentials: "include",
            cache: "no-store",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ action, prepMinutes }),
          });
      const raw = await res.text();
      let data: { error?: string; message?: string; order?: KitchenOrder } | null = null;
      try {
        data = raw ? (JSON.parse(raw) as { error?: string; message?: string; order?: KitchenOrder }) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        const msg = apiErrorMessage(res, data, t.acceptFailed);
        setActionError(msg);
        toast.error(msg);
        return;
      }
      const status = data?.order?.status ?? nextStatus[action];
      setPicking(null);
      setOrders((list) =>
        list.map((o) =>
          o.id === id
            ? {
                ...o,
                ...(data?.order ?? {}),
                status,
                prepMinutes: data?.order?.prepMinutes ?? prepMinutes ?? o.prepMinutes,
              }
            : o,
        ),
      );
      setHighlight((cur) => {
        const n = new Set(cur);
        n.delete(id);
        return n;
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? `${t.acceptFailed} ${err.message}` : t.acceptFailed;
      setActionError(msg);
      toast.error(msg);
    } finally {
      setPending((cur) => {
        const n = new Set(cur);
        n.delete(id);
        return n;
      });
    }
  }

  async function toggleOpen() {
    const res = await fetch("/api/restaurant/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !open }),
    });
    if (res.ok) setOpen(!open);
  }

  function toggleMute() {
    unlockKitchenBell();
    const next = !muted;
    setMuted(next);
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    if (next) {
      stopKeepAlive();
    } else {
      startKeepAlive();
      if (incomingKeyRef.current) playKitchenBell();
    }
  }

  const incoming = orders
    .filter((o) => o.status === "PLACED")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const active = orders.filter((o) => ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status));

  return (
    <div className={flash ? "lw-kitchen-flash -mx-3 rounded-xl px-3 py-1 md:-mx-5 md:px-5" : ""}>
      {flash ? (
        <p className="mb-2 rounded-xl bg-primary px-3 py-3 text-center text-lg font-semibold text-primary-foreground">
          {t.newOrderAlert}
        </p>
      ) : null}
      <div className="sticky top-0 z-20 mb-3 space-y-2 bg-bg-muted/95 py-1 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink ${live ? "" : "opacity-50"}`}>
            <span className="lw-live-dot" aria-hidden />
            {t.liveLabel}
          </span>
          {incoming.length > 0 ? (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[12px] font-semibold text-primary-foreground">
              {interpolate(t.newOrderCount, { count: String(incoming.length) })}
            </span>
          ) : null}
          <p className="min-w-0 flex-1 text-[13px] text-text-secondary">
            {interpolate(t.kitchenVenueHint, { name: restaurantName })}
          </p>
          <Button variant="outline" size="sm" className="h-10" onClick={toggleOpen}>
            {open ? t.closeNow : t.openNow}
            <span className="ml-1 font-normal text-text-secondary">· {open ? t.open : t.closed}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-10" onClick={toggleMute}>
            {muted ? t.soundOff : t.soundOn}
          </Button>
        </div>
      </div>

      <section className="mb-4">
        <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">
          {t.rpNewOrder}
          {incoming.length > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold normal-case text-white">
              {incoming.length}
            </span>
          ) : null}
        </h2>
        {incoming.length === 0 ? (
          <p className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-[14px] text-[#6B7280]">
            {t.noIncoming}
            <span className="mt-1 block text-[13px]">{interpolate(t.kitchenVenueHint, { name: restaurantName })}</span>
          </p>
        ) : (
          <div className="space-y-3">
            {incoming.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                locale={locale}
                noteLabel={t.note}
                deliveryLabel={t.deliveryTo}
                pickupLabel={t.pickupAtCounter}
                phoneLabel={t.phoneNumber}
                nameLabel={t.fullName}
                highlight={highlight.has(o.id)}
              kicker={t.rpNewOrder}
            >
                {picking === o.id ? (
                  <PrepTimePicker
                    id={`prep-${o.id}`}
                    disabled={pending.has(o.id)}
                    error={actionError}
                    onPick={(min) => act(o.id, "accept", min)}
                    onBack={() => {
                      setPicking(null);
                      setActionError(null);
                    }}
                    t={t}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={pending.has(o.id)}
                      onClick={() => setPicking(o.id)}
                      className="h-12 min-w-32 flex-1 touch-manipulation rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                    >
                      {t.accept}
                    </button>
                    <button
                      type="button"
                      disabled={pending.has(o.id)}
                      onClick={() => act(o.id, "reject")}
                      className="h-12 flex-1 rounded-xl border border-[#E5E7EB] bg-white px-6 text-base font-medium text-[#111827] disabled:opacity-50"
                    >
                      {t.reject}
                    </button>
                  </>
                )}
              </OrderCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">{t.kitchen}</h2>
        <div className="space-y-3">
          {active.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              locale={locale}
              noteLabel={t.note}
              deliveryLabel={t.deliveryTo}
              pickupLabel={t.pickupAtCounter}
              phoneLabel={t.phoneNumber}
              nameLabel={t.fullName}
              kicker={
                o.status === "PREPARING"
                  ? t.rpInPrep
                  : o.status === "READY"
                    ? isPickup(o.fulfillmentType)
                      ? t.rpReadyPickup
                      : t.rpReadyCta
                    : o.status === "OUT_FOR_DELIVERY"
                      ? t.rpOnTheWay
                      : t.accepted
              }
            >
              {o.prepMinutes ? (
                <p className="w-full text-sm text-[#6B7280]">{interpolate(t.prepEta, { min: String(o.prepMinutes) })}</p>
              ) : null}
              {o.status === "ACCEPTED" && (
                <PrepTimePicker
                  id={`prep-${o.id}`}
                  disabled={pending.has(o.id)}
                  error={actionError}
                  onPick={(min) => act(o.id, "preparing", min)}
                  t={t}
                />
              )}
              {o.status === "PREPARING" && (
                <button
                  type="button"
                  disabled={pending.has(o.id)}
                  onClick={() => act(o.id, "ready")}
                  className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                >
                  {isPickup(o.fulfillmentType) ? t.rpReadyPickup : t.rpReadyCta}
                </button>
              )}
              {o.status === "READY" && isPickup(o.fulfillmentType) && (
                <button
                  type="button"
                  disabled={pending.has(o.id)}
                  onClick={() => act(o.id, "deliver")}
                  className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                >
                  {t.rpMarkPickedUp}
                </button>
              )}
              {o.status === "READY" && !isPickup(o.fulfillmentType) && (
                <button
                  type="button"
                  disabled={pending.has(o.id)}
                  onClick={() => act(o.id, "out")}
                  className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                >
                  {t.rpOnTheWay}
                </button>
              )}
              {o.status === "OUT_FOR_DELIVERY" && (
                <button
                  type="button"
                  disabled={pending.has(o.id)}
                  onClick={() => act(o.id, "deliver")}
                  className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                >
                  {t.markDelivered}
                </button>
              )}
            </OrderCard>
          ))}
          {active.length === 0 && (
            <p className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-[14px] text-[#6B7280]">
              {t.nothingCooking}
            </p>
          )}
        </div>
      </section>
      <p className="mt-4 text-sm text-[#6B7280]">
        <Link href="/restaurant/orders" className="font-medium text-primary">
          {t.ordersCount}
        </Link>
        {" · "}
        {t.ordersHistoryHint}
      </p>
    </div>
  );
}

function OrderCard({
  order,
  children,
  locale,
  noteLabel,
  deliveryLabel,
  pickupLabel,
  phoneLabel,
  nameLabel,
  highlight,
  kicker,
}: {
  order: KitchenOrder;
  children?: React.ReactNode;
  locale: Locale;
  noteLabel: string;
  deliveryLabel: string;
  pickupLabel: string;
  phoneLabel: string;
  nameLabel: string;
  highlight?: boolean;
  kicker?: string;
}) {
  const pickup = isPickup(order.fulfillmentType);
  return (
    <article
      className={`rounded-2xl border bg-white p-4 ${highlight ? "lw-new-ticket shadow-[0_8px_24px_rgba(233,30,99,0.12)]" : "border-[#E5E7EB]"}`}
    >
      {kicker ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{kicker}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            {order.shortCode} · {order.customer.name}
            <span className="ml-2 font-normal text-text-secondary">{orderTime(order.createdAt, locale)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {order.paymentMethod} · {formatEUR(order.totalCents, locale)}
          </p>
          <p className="text-sm font-medium text-ink">
            {nameLabel}: {order.customer.name}
          </p>
          <p className="text-sm font-medium text-ink">
            {phoneLabel}:{" "}
            {order.customer.phone ? (
              <a className="underline-offset-2 hover:underline" href={`tel:${order.customer.phone}`}>
                {order.customer.phone}
              </a>
            ) : (
              "—"
            )}
          </p>
          <p className={`text-sm font-medium ${pickup ? "text-[#C2185B]" : "text-text-secondary"}`}>
            {pickup
              ? pickupLabel
              : `${deliveryLabel}: ${order.street}, ${order.postalCode} ${order.city}`}
          </p>
        </div>
        <StatusBadge status={order.status} locale={locale} fulfillmentType={order.fulfillmentType} />
      </div>
      <ul className="mt-2 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            {i.quantity}× {i.name}
          </li>
        ))}
      </ul>
      {order.notes ? (
        <p className="mt-2 text-sm text-amber-800">
          {noteLabel}: {order.notes}
        </p>
      ) : null}
      <div className="mt-4 flex w-full flex-wrap gap-2">
        {children}
        <PrintBonButton orderId={order.id} />
      </div>
    </article>
  );
}

function apiErrorMessage(
  res: Response,
  data: { error?: string; message?: string } | null,
  fallback: string,
) {
  const fromApi = data?.error?.trim() || data?.message?.trim();
  if (fromApi) return fromApi;
  if (res.status === 401) return "Bitte anmelden.";
  if (res.status === 403) return "Keine Berechtigung.";
  if (res.status >= 500) return `Serverfehler (HTTP ${res.status})`;
  return `${fallback} (HTTP ${res.status})`;
}

function PrepTimePicker({
  id,
  disabled,
  onPick,
  onBack,
  error,
  t,
}: {
  id: string;
  disabled: boolean;
  onPick: (mins: number) => void;
  onBack?: () => void;
  error?: string | null;
  t: {
    rpPrepTime: string;
    rpManual: string;
    rpPrepPlaceholder: string;
    accept: string;
    prepMinutesInvalid: string;
  };
}) {
  const [custom, setCustom] = useState("");

  function submitCustom() {
    const mins = parsePrepMinutes(custom);
    if (mins == null) {
      toast.error(t.prepMinutesInvalid);
      return;
    }
    onPick(mins);
  }

  return (
    <div className="w-full space-y-2">
      <p className="text-sm font-medium text-[#111827]">{t.rpPrepTime}</p>
      <div className="flex flex-wrap gap-2">
        {PREP_CHIPS.map((min) => (
          <button
            key={min}
            type="button"
            disabled={disabled}
            onClick={() => onPick(min)}
            className="h-12 min-w-[3.25rem] flex-1 touch-manipulation rounded-xl bg-primary px-2 text-sm font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
          >
            {min}
          </button>
        ))}
      </div>
      <label className="block text-sm font-medium text-[#111827]" htmlFor={id}>
        {t.rpManual}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
          placeholder={t.rpPrepPlaceholder}
          aria-label={t.rpManual}
          className="h-12 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] px-3 text-base tabular-nums"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={submitCustom}
          className="h-12 shrink-0 touch-manipulation rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.accept}
        </button>
      </div>
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {onBack ? (
        <button type="button" className="text-sm text-[#6B7280]" onClick={onBack}>
          ←
        </button>
      ) : null}
    </div>
  );
}

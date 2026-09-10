"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { interpolate, type Locale } from "@/lib/i18n";
import { formatBerlinDateTime } from "@/lib/datetime";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import type { KitchenOrder } from "@/lib/restaurant-live";

const MUTE_KEY = "lw_kitchen_mute";

type Snapshot = {
  orders: KitchenOrder[];
  incoming: number;
  restaurant?: { isOpen: boolean; name: string };
};

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function unlockKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  return ctx.state === "running" || ctx.state === "suspended";
}

function playKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume();
  const now = ctx.currentTime;
  const ding = (freq: number, start: number, dur: number, gain = 0.2) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(start);
    o.stop(start + dur + 0.03);
  };
  ding(880, now, 0.16, 0.22);
  ding(1174.7, now + 0.13, 0.32, 0.18);
}

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
  const [muted, setMuted] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState<string | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const { t, locale } = useI18n();
  const baseTitle = `${restaurantName} · ${t.restaurantOrders}`;

  useEffect(() => {
    setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
  }, []);

  const applySnapshot = useCallback((data: Snapshot) => {
    const next = data.orders ?? [];
    if (data.restaurant?.isOpen != null) setOpen(data.restaurant.isOpen);
    const ids = next.map((o) => o.id);
    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
    } else {
      const fresh = next.filter((o) => o.status === "PLACED" && !seenRef.current!.has(o.id));
      if (fresh.length > 0) {
        if (!mutedRef.current) playKitchenBell();
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

    const unlock = () => {
      unlockKitchenBell();
      setSoundReady(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true });

    return () => {
      stopped = true;
      es?.close();
      if (pollId != null) window.clearInterval(pollId);
      window.clearTimeout(watchdog);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [restaurantId, applySnapshot]);

  async function act(id: string, action: string, prepMinutes?: number) {
    if (pending.has(id)) return;
    const nextStatus: Record<string, KitchenOrder["status"]> = {
      accept: prepMinutes ? "PREPARING" : "ACCEPTED",
      reject: "REJECTED",
      preparing: "PREPARING",
      ready: "READY",
      out: "OUT_FOR_DELIVERY",
      deliver: "DELIVERED",
    };
    const optimistic = nextStatus[action];
    const prev = orders;
    if (optimistic) {
      setOrders((list) =>
        list.map((o) =>
          o.id === id ? { ...o, status: optimistic, prepMinutes: prepMinutes ?? o.prepMinutes } : o,
        ),
      );
      setHighlight((cur) => {
        const n = new Set(cur);
        n.delete(id);
        return n;
      });
    }
    setPending((cur) => new Set(cur).add(id));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, prepMinutes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrders(prev);
        toast.error(data.error);
        return;
      }
      setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: data.order.status } : o)));
    } catch {
      setOrders(prev);
      toast.error(t.error);
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
    setSoundReady(true);
    const next = !muted;
    setMuted(next);
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    if (!next) playKitchenBell();
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
        {!soundReady && !muted ? (
          <button
            type="button"
            onClick={() => {
              unlockKitchenBell();
              setSoundReady(true);
              playKitchenBell();
            }}
            className="w-full rounded-xl bg-primary px-3 py-2.5 text-left text-sm font-medium text-primary-foreground"
          >
            {t.tapForSound}
          </button>
        ) : null}
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
                phoneLabel={t.phoneNumber}
                nameLabel={t.fullName}
                highlight={highlight.has(o.id)}
                kicker={t.rpNewOrder}
              >
                {picking === o.id ? (
                  <div className="w-full space-y-2">
                    <p className="text-sm font-medium text-[#111827]">{t.rpPrepTime}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 20, 30, 45].map((min) => (
                        <button
                          key={min}
                          type="button"
                          disabled={pending.has(o.id)}
                          onClick={() => act(o.id, "accept", min)}
                          className="h-12 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                        >
                          {min} {t.rpMin}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-sm text-[#6B7280]"
                      onClick={() => setPicking(null)}
                    >
                      ←
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={pending.has(o.id)}
                      onClick={() => setPicking(o.id)}
                      className="h-12 min-w-32 flex-1 rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
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
              phoneLabel={t.phoneNumber}
              nameLabel={t.fullName}
              kicker={
                o.status === "PREPARING"
                  ? t.rpInPrep
                  : o.status === "READY"
                    ? t.rpReadyCta
                    : o.status === "OUT_FOR_DELIVERY"
                      ? t.rpOnTheWay
                      : t.accepted
              }
            >
              {o.prepMinutes ? (
                <p className="w-full text-sm text-[#6B7280]">{interpolate(t.prepEta, { min: String(o.prepMinutes) })}</p>
              ) : null}
              {o.status === "ACCEPTED" && (
                <div className="grid w-full grid-cols-4 gap-2">
                      {[10, 20, 30, 45].map((min) => (
                        <button
                          key={min}
                          type="button"
                          disabled={pending.has(o.id)}
                          onClick={() => act(o.id, "preparing", min)}
                          className="h-12 rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {min}
                        </button>
                      ))}
                </div>
              )}
              {o.status === "PREPARING" && (
                <button
                  type="button"
                  disabled={pending.has(o.id)}
                  onClick={() => act(o.id, "ready")}
                  className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-pressed disabled:opacity-50"
                >
                  {t.rpReadyCta}
                </button>
              )}
              {o.status === "READY" && (
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
    </div>
  );
}

function OrderCard({
  order,
  children,
  locale,
  noteLabel,
  deliveryLabel,
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
  phoneLabel: string;
  nameLabel: string;
  highlight?: boolean;
  kicker?: string;
}) {
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
          <p className="text-xs text-text-secondary">
            {deliveryLabel}: {order.street}, {order.postalCode} {order.city}
          </p>
        </div>
        <StatusBadge status={order.status} locale={locale} />
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
      <div className="mt-4 flex w-full flex-wrap gap-2">{children}</div>
    </article>
  );
}

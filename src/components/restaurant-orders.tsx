"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { interpolate, type Locale } from "@/lib/i18n";
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
  const tag = locale === "de" ? "de-DE" : locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(iso).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" });
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

  async function act(id: string, action: string) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: data.order.status } : o)));
    setHighlight((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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

  const incoming = orders.filter((o) => o.status === "PLACED");
  const active = orders.filter((o) => ["ACCEPTED", "PREPARING", "READY"].includes(o.status));

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
            {t.kitchenLiveHint}
          </p>
          <Button variant="outline" size="sm" className="h-10" onClick={toggleOpen}>
            {open ? t.closeNow : t.openNow}
            <span className="ml-1 font-normal text-text-secondary">· {open ? t.open : t.closed}</span>
          </Button>
          <Button variant={muted ? "outline" : "default"} size="sm" className="h-10" onClick={toggleMute}>
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
        <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {t.newIncoming}
          {incoming.length > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold normal-case text-primary-foreground">
              {incoming.length}
            </span>
          ) : null}
        </h2>
        {incoming.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-3 text-[13px] text-text-secondary">{t.noIncoming}</p>
        ) : (
          <div className="space-y-2">
            {incoming.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                locale={locale}
                noteLabel={t.note}
                deliveryLabel={t.deliveryTo}
                phoneLabel={t.phoneNumber}
                highlight={highlight.has(o.id)}
              >
                <Button className="h-11 min-w-28 px-5 text-base" onClick={() => act(o.id, "accept")}>
                  {t.accept}
                </Button>
                <Button className="h-11 px-5 text-base" variant="outline" onClick={() => act(o.id, "reject")}>
                  {t.reject}
                </Button>
              </OrderCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">{t.kitchen}</h2>
        <div className="space-y-2">
          {active.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              locale={locale}
              noteLabel={t.note}
              deliveryLabel={t.deliveryTo}
              phoneLabel={t.phoneNumber}
            >
              {o.status === "ACCEPTED" && (
                <Button className="h-11 px-5 text-base" onClick={() => act(o.id, "preparing")}>
                  {t.startPrep}
                </Button>
              )}
              {o.status === "PREPARING" && (
                <Button className="h-11 px-5 text-base" onClick={() => act(o.id, "ready")}>
                  {t.readyForCourier}
                </Button>
              )}
            </OrderCard>
          ))}
          {active.length === 0 && (
            <p className="rounded-lg border border-border bg-surface p-3 text-[13px] text-text-secondary">
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
  highlight,
}: {
  order: KitchenOrder;
  children?: React.ReactNode;
  locale: Locale;
  noteLabel: string;
  deliveryLabel: string;
  phoneLabel: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border bg-surface p-3 ${highlight ? "lw-new-ticket" : "border-border"}`}
    >
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
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

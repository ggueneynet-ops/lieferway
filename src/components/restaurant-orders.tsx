"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";

type Order = {
  id: string;
  shortCode: string;
  status: string;
  paymentMethod: string;
  totalCents: number;
  foodSubtotalCents: number;
  notes: string | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number }[];
  customer: { name: string; phone: string | null };
};

export function RestaurantOrders({ initial, isOpen }: { initial: Order[]; isOpen: boolean }) {
  const [orders, setOrders] = useState(initial);
  const [open, setOpen] = useState(isOpen);
  const router = useRouter();
  const { t, locale } = useI18n();

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders);
    }, 4000);
    return () => clearInterval(t);
  }, []);

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
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data.order } : o)));
    router.refresh();
  }

  async function toggleOpen() {
    const res = await fetch("/api/restaurant/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !open }),
    });
    if (res.ok) setOpen(!open);
  }

  const incoming = orders.filter((o) => o.status === "PLACED");
  const active = orders.filter((o) => ["ACCEPTED", "PREPARING", "READY"].includes(o.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
        <p className="text-[13px]">
          Status: <strong>{open ? t.open : t.closed}</strong>
        </p>
        <Button variant="outline" size="sm" onClick={toggleOpen}>
          {open ? t.closeNow : t.openNow}
        </Button>
      </div>
      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {t.newIncoming}
        </h2>
        {incoming.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-3 text-[13px] text-text-secondary">
            {t.noIncoming}
          </p>
        ) : (
          <div className="space-y-2">
            {incoming.map((o) => (
              <OrderCard key={o.id} order={o} onAct={act} locale={locale} noteLabel={t.note}>
                <Button className="h-11 px-5 text-base" onClick={() => act(o.id, "accept")}>
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
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
          {t.kitchen}
        </h2>
        <div className="space-y-2">
          {active.map((o) => (
            <OrderCard key={o.id} order={o} onAct={act} locale={locale} noteLabel={t.note}>
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
}: {
  order: Order;
  onAct: (id: string, action: string) => void;
  children?: React.ReactNode;
  locale: Locale;
  noteLabel: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {order.shortCode} · {order.customer.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {order.paymentMethod} · {formatEUR(order.totalCents, locale)} · {order.customer.phone}
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
      {order.notes && <p className="mt-2 text-sm text-amber-800">{noteLabel}: {order.notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

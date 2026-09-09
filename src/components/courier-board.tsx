"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

type Order = {
  id: string;
  shortCode: string;
  status: string;
  courierId: string | null;
  paymentMethod: string;
  totalCents: number;
  street: string;
  postalCode: string;
  city: string;
  items: { id: string; name: string; quantity: number }[];
  restaurant: { name: string; address: string; postalCode: string; city: string };
  customer: { name: string; phone: string | null };
};

export function CourierBoard({ initial, courierId }: { initial: Order[]; courierId: string }) {
  const [orders, setOrders] = useState(initial);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch("/api/courier/orders");
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
    if (!res.ok) return toast.error(data.error);
    setOrders((prev) =>
      prev
        .map((o) => (o.id === id ? { ...o, ...data.order } : o))
        .filter((o) => o.status === "READY" || o.status === "OUT_FOR_DELIVERY"),
    );
    toast.success("Aktualisiert");
  }

  const available = orders.filter((o) => o.status === "READY" && !o.courierId);
  const mine = orders.filter((o) => o.courierId === courierId || o.status === "OUT_FOR_DELIVERY");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 font-semibold">Bereit zur Abholung</h2>
        <div className="space-y-3">
          {available.map((o) => (
            <Card key={o.id} order={o}>
              <Button size="sm" onClick={() => act(o.id, "claim")}>
                Tour übernehmen
              </Button>
            </Card>
          ))}
          {available.length === 0 && (
            <p className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground">
              Keine freien Aufträge.
            </p>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Meine Tour</h2>
        <div className="space-y-3">
          {mine.map((o) => (
            <Card key={o.id} order={o}>
              {o.status === "READY" && (
                <Button size="sm" onClick={() => act(o.id, "out")}>
                  Unterwegs
                </Button>
              )}
              {o.status === "OUT_FOR_DELIVERY" && (
                <Button size="sm" onClick={() => act(o.id, "deliver")}>
                  Zugestellt
                </Button>
              )}
            </Card>
          ))}
          {mine.length === 0 && (
            <p className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground">Keine aktive Tour.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({ order, children }: { order: Order; children?: React.ReactNode }) {
  return (
    <article className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {order.shortCode} · {order.restaurant.name}
        </p>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
        <p className="inline-flex items-center gap-1 font-medium">
          <MapPin className="size-3.5" /> Karte (Stub)
        </p>
        <p className="mt-1 text-muted-foreground">
          Abholung: {order.restaurant.address}, {order.restaurant.postalCode} {order.restaurant.city}
        </p>
        <p className="text-muted-foreground">
          Zustellung: {order.street}, {order.postalCode} {order.city}
        </p>
        <div className="mt-2 h-24 rounded-lg bg-primary-soft" />
      </div>
      <p className="mt-2 text-sm">
        {order.customer.name} · {order.paymentMethod === "CASH" ? "Bar" : "Bezahlt"} · {formatEUR(order.totalCents)}
      </p>
      <ul className="text-sm text-muted-foreground">
        {order.items.map((i) => (
          <li key={i.id}>
            {i.quantity}× {i.name}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">{children}</div>
    </article>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type C = {
  id: string;
  code: string;
  description: string;
  discountPercent: number | null;
  discountCents: number | null;
  type?: string;
  isActive: boolean;
  funding?: string;
  restaurantId?: string | null;
  restaurant?: { id: string; name: string; slug: string } | null;
};

export function AdminCoupons({ initial }: { initial: C[] }) {
  const [rows, setRows] = useState(initial);

  async function toggle(c: C) {
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Fehler");
      return;
    }
    setRows((rs) => rs.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)));
  }

  return (
    <ul className="divide-y rounded-2xl border bg-white">
      {rows.length === 0 ? (
        <li className="p-4 text-sm text-muted-foreground">Keine Restaurant-Gutscheine.</li>
      ) : (
        rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                {c.code}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {c.restaurant?.name ?? (c.restaurantId ? c.restaurantId : "— Plattform (deaktiviert)")}
                </span>
              </p>
              <p className="text-muted-foreground">{c.description}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {c.type ?? (c.discountPercent ? "PERCENT" : "FIXED")}
                {c.discountPercent != null ? ` · ${c.discountPercent}%` : ""}
                {c.discountCents != null ? ` · ${(c.discountCents / 100).toFixed(2)} €` : ""}
                {c.funding ? ` · ${c.funding}` : ""}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void toggle(c)}>
              {c.isActive ? "Aktiv" : "Aus"}
            </Button>
          </li>
        ))
      )}
    </ul>
  );
}

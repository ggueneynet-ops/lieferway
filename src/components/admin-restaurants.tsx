"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

type R = {
  id: string;
  name: string;
  cuisine: string;
  commissionPercent: number;
  isActive: boolean;
  isOpen: boolean;
  deliveryFeeCents: number;
  owner: { name: string; email: string };
  _count: { orders: number };
};

export function AdminRestaurants({ initial }: { initial: R[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.id, String(r.commissionPercent)])),
  );

  async function save(id: string) {
    const res = await fetch("/api/admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, commissionPercent: Number(draft[id]) }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, commissionPercent: data.restaurant.commissionPercent } : r)));
    toast.success("Provision gespeichert");
  }

  async function toggle(id: string, field: "isActive" | "isOpen", value: boolean) {
    const res = await fetch("/api/admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...data.restaurant } : r)));
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Restaurant</th>
            <th className="px-4 py-3">Inhaber</th>
            <th className="px-4 py-3">Provision %</th>
            <th className="px-4 py-3">Lieferung</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.cuisine} · {r._count.orders} Bestellungen
                </p>
              </td>
              <td className="px-4 py-3 text-xs">
                {r.owner.name}
                <br />
                {r.owner.email}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-20"
                    value={draft[r.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" onClick={() => save(r.id)}>
                    Speichern
                  </Button>
                </div>
              </td>
              <td className="px-4 py-3">{formatEUR(r.deliveryFeeCents)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <button className="text-left text-xs underline" onClick={() => toggle(r.id, "isActive", !r.isActive)}>
                    {r.isActive ? "Aktiv" : "Deaktiviert"}
                  </button>
                  <button className="text-left text-xs underline" onClick={() => toggle(r.id, "isOpen", !r.isOpen)}>
                    {r.isOpen ? "Geöffnet" : "Geschlossen"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

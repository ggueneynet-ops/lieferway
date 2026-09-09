"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

type P = {
  id: string;
  weekStart: string;
  weekEnd: string;
  foodTotalCents: number;
  commissionCents: number;
  cardPayoutCents: number;
  cashCommissionDueCents: number;
  netPayoutCents: number;
  status: string;
  restaurant: { name: string };
};

export function AdminPayouts({ initial }: { initial: P[] }) {
  const [rows, setRows] = useState(initial);
  const router = useRouter();

  async function regenerate() {
    const res = await fetch("/api/admin/payouts", { method: "POST" });
    if (!res.ok) return toast.error("Fehler");
    toast.success("Ledger aktualisiert");
    router.refresh();
  }

  async function markPaid(id: string) {
    const res = await fetch("/api/admin/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "PAID" } : r)));
  }

  return (
    <div>
      <Button className="mb-4" variant="outline" onClick={regenerate}>
        Ledger neu berechnen
      </Button>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Woche</th>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Speisen</th>
              <th className="px-4 py-3">Provision</th>
              <th className="px-4 py-3">Karten-Auszahlung</th>
              <th className="px-4 py-3">Bar-Provision</th>
              <th className="px-4 py-3">Netto</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-xs">
                  {new Date(p.weekStart).toLocaleDateString("de-DE")}
                  <br />– {new Date(p.weekEnd).toLocaleDateString("de-DE")}
                </td>
                <td className="px-4 py-3 font-medium">{p.restaurant.name}</td>
                <td className="px-4 py-3">{formatEUR(p.foodTotalCents)}</td>
                <td className="px-4 py-3">{formatEUR(p.commissionCents)}</td>
                <td className="px-4 py-3">{formatEUR(p.cardPayoutCents)}</td>
                <td className="px-4 py-3">{formatEUR(p.cashCommissionDueCents)}</td>
                <td className="px-4 py-3 font-semibold">{formatEUR(p.netPayoutCents)}</td>
                <td className="px-4 py-3">
                  {p.status === "PAID" ? (
                    <span className="text-emerald-700">Ausgezahlt</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => markPaid(p.id)}>
                      Als gezahlt
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

type P = {
  id: string;
  weekStart: string;
  netPayoutCents: number;
  status: string;
  restaurant: { name: string };
};

export function AdminPayouts({ initial }: { initial: P[] }) {
  const [rows, setRows] = useState(initial);

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

  if (rows.length === 0) {
    return <p className="text-text-secondary">Noch keine Auszahlungen.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[480px] text-left text-base">
        <thead className="border-b border-border bg-bg-muted text-sm text-text-secondary">
          <tr>
            <th className="px-4 py-3 font-medium">Woche</th>
            <th className="px-4 py-3 font-medium">Restaurant</th>
            <th className="px-4 py-3 font-medium">Netto</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-4">
                {new Date(p.weekStart).toLocaleDateString("de-DE")}
              </td>
              <td className="px-4 py-4 font-medium">{p.restaurant.name}</td>
              <td className="px-4 py-4 font-semibold">{formatEUR(p.netPayoutCents)}</td>
              <td className="px-4 py-4 text-right">
                {p.status === "PAID" ? (
                  <span className="text-success">Gezahlt</span>
                ) : (
                  <Button className="h-12 px-5 text-base" onClick={() => markPaid(p.id)}>
                    Als gezahlt
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

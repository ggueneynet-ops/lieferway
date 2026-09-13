"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/money";
import type { PayoutSummaryRow } from "@/lib/settlement";
import { toast } from "sonner";

type Props = {
  initial: PayoutSummaryRow[];
  labels: {
    week: string;
    restaurant: string;
    food: string;
    commission: string;
    refunds: string;
    coupon: string;
    wpRestaurant: string;
    wpPlatform: string;
    net: string;
    generate: string;
    generated: string;
    exportCsv: string;
    paid: string;
    markPaid: string;
    empty: string;
    period: string;
  };
};

export function AdminPayouts({ initial, labels }: Props) {
  const [rows, setRows] = useState(initial);
  const [week, setWeek] = useState("");
  const [busy, setBusy] = useState(false);

  const csvHref = useMemo(() => {
    const params = new URLSearchParams({ format: "csv" });
    if (week) params.set("week", week);
    return `/api/admin/payouts?${params.toString()}`;
  }, [week]);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(week ? { weekStart: week } : {}),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error);
      if (Array.isArray(data.summaries)) setRows(data.summaries);
      toast.success(labels.generated);
    } finally {
      setBusy(false);
    }
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-text-secondary">
          {labels.period}
          <input
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="mt-1 block h-11 rounded-xl border border-border bg-white px-3 text-sm"
          />
        </label>
        <Button className="h-11 px-4" disabled={busy} onClick={generate}>
          {labels.generate}
        </Button>
        <a
          href={csvHref}
          className="inline-flex h-11 items-center rounded-xl border border-border bg-white px-4 text-sm font-semibold"
        >
          {labels.exportCsv}
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-text-secondary">{labels.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-bg-muted text-text-secondary">
              <tr>
                <th className="px-3 py-3 font-medium">{labels.week}</th>
                <th className="px-3 py-3 font-medium">{labels.restaurant}</th>
                <th className="px-3 py-3 font-medium">{labels.food}</th>
                <th className="px-3 py-3 font-medium">{labels.commission}</th>
                <th className="px-3 py-3 font-medium">{labels.refunds}</th>
                <th className="px-3 py-3 font-medium">{labels.coupon}</th>
                <th className="px-3 py-3 font-medium">{labels.wpRestaurant}</th>
                <th className="px-3 py-3 font-medium">{labels.wpPlatform}</th>
                <th className="px-3 py-3 font-medium">{labels.net}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={`${p.restaurantId}-${p.weekStart}`} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {new Date(p.weekStart).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                  </td>
                  <td className="px-3 py-3 font-medium">{p.restaurantName}</td>
                  <td className="px-3 py-3 tabular-nums">{formatEUR(p.totals.foodCents)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatEUR(p.totals.commissionCents)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatEUR(p.totals.refundedCents)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatEUR(p.totals.couponDiscountCents)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatEUR(p.totals.wayPointsRestaurantCents)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatEUR(p.totals.wayPointsLieferwayCents)}</td>
                  <td className="px-3 py-3 font-semibold tabular-nums">{formatEUR(p.totals.netPayableCents)}</td>
                  <td className="px-3 py-3 text-right">
                    {p.status === "PAID" ? (
                      <span className="text-success">{labels.paid}</span>
                    ) : p.id ? (
                      <Button className="h-11 px-4 text-sm" onClick={() => markPaid(p.id!)}>
                        {labels.markPaid}
                      </Button>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

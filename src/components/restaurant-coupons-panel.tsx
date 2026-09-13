"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

type CouponRow = {
  id: string;
  code: string;
  description: string;
  type: string;
  discountPercent: number | null;
  discountCents: number | null;
  maxDiscountCents: number | null;
  minSubtotalCents: number | null;
  validFrom: string | null;
  validTo: string | null;
  maxTotalUses: number | null;
  usesPerCustomer: number | null;
  usageCount: number;
  isActive: boolean;
  scope: string;
  funding: string;
};

function discountLabel(c: CouponRow, locale: string) {
  if (c.type === "FIXED" || c.discountCents) {
    return formatEUR(c.discountCents ?? 0, locale);
  }
  const pct = `${c.discountPercent ?? 0} %`;
  if (c.maxDiscountCents != null) {
    return `${pct} (max. ${formatEUR(c.maxDiscountCents, locale)})`;
  }
  return pct;
}

export function RestaurantCouponsPanel({ initial }: { initial: CouponRow[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [percent, setPercent] = useState("10");
  const [discountEuro, setDiscountEuro] = useState("5");
  const [maxDiscountEuro, setMaxDiscountEuro] = useState("");
  const [minSubtotalEuro, setMinSubtotalEuro] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [maxTotalUses, setMaxTotalUses] = useState("");
  const [usesPerCustomer, setUsesPerCustomer] = useState("1");
  const [scope, setScope] = useState<"BOTH" | "DELIVERY" | "PICKUP">("BOTH");

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          description,
          type,
          discountPercent: type === "PERCENT" ? Number(percent) || undefined : undefined,
          discountEuro: type === "FIXED" ? discountEuro : undefined,
          maxDiscountEuro: type === "PERCENT" && maxDiscountEuro ? maxDiscountEuro : undefined,
          minSubtotalEuro: minSubtotalEuro || undefined,
          validFrom: validFrom || null,
          validTo: validTo || null,
          maxTotalUses: maxTotalUses ? Number(maxTotalUses) : null,
          usesPerCustomer: usesPerCustomer ? Number(usesPerCustomer) : null,
          scope,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      setRows((r) => [data.coupon, ...r]);
      setCode("");
      setDescription("");
      toast.success(t.rgCreated);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: CouponRow) {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      setRows((rs) => rs.map((x) => (x.id === c.id ? { ...x, isActive: data.coupon.isActive } : x)));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">{t.rgHint}</p>
      <ul className="divide-y divide-[#F3F4F6] overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm text-[#6B7280]">{t.rgEmpty}</li>
        ) : (
          rows.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-[#111827]">{c.code}</p>
                <p className="text-[#6B7280]">{c.description}</p>
                <p className="mt-1 tabular-nums text-[12px] text-[#64748B]">
                  {discountLabel(c, locale)}
                  {c.minSubtotalCents ? ` · ab ${formatEUR(c.minSubtotalCents, locale)}` : ""}
                  {` · ${c.scope}`}
                  {` · ${c.usageCount}${c.maxTotalUses != null ? `/${c.maxTotalUses}` : ""}×`}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle(c)}>
                {c.isActive ? t.rgActive : t.rgInactive}
              </Button>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-3 rounded-2xl border border-[#E8E8EC] bg-white p-4">
        <h2 className="font-semibold text-[#111827]">{t.rgNew}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t.rgCode}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE10" />
          </div>
          <div>
            <Label>{t.rgDescription}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>{t.rgType}</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}
            >
              <option value="PERCENT">{t.rgTypePercent}</option>
              <option value="FIXED">{t.rgTypeFixed}</option>
            </select>
          </div>
          <div>
            <Label>{t.rgScope}</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-2 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as "BOTH" | "DELIVERY" | "PICKUP")}
            >
              <option value="BOTH">{t.rgScopeBoth}</option>
              <option value="DELIVERY">{t.rgScopeDelivery}</option>
              <option value="PICKUP">{t.rgScopePickup}</option>
            </select>
          </div>
          {type === "PERCENT" ? (
            <>
              <div>
                <Label>{t.rgPercent}</Label>
                <Input value={percent} onChange={(e) => setPercent(e.target.value)} />
              </div>
              <div>
                <Label>{t.rgMaxDiscount}</Label>
                <Input
                  value={maxDiscountEuro}
                  onChange={(e) => setMaxDiscountEuro(e.target.value)}
                  placeholder="optional €"
                />
              </div>
            </>
          ) : (
            <div>
              <Label>{t.rgFixed}</Label>
              <Input value={discountEuro} onChange={(e) => setDiscountEuro(e.target.value)} />
            </div>
          )}
          <div>
            <Label>{t.rgMinSubtotal}</Label>
            <Input value={minSubtotalEuro} onChange={(e) => setMinSubtotalEuro(e.target.value)} placeholder="€" />
          </div>
          <div>
            <Label>{t.rgUsesPerCustomer}</Label>
            <Input value={usesPerCustomer} onChange={(e) => setUsesPerCustomer(e.target.value)} />
          </div>
          <div>
            <Label>{t.rgMaxTotalUses}</Label>
            <Input value={maxTotalUses} onChange={(e) => setMaxTotalUses(e.target.value)} placeholder="optional" />
          </div>
          <div>
            <Label>{t.rgValidFrom}</Label>
            <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div>
            <Label>{t.rgValidTo}</Label>
            <Input type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
        </div>
        <Button className="w-full" disabled={busy || !code.trim()} onClick={() => void create()}>
          {t.rgCreate}
        </Button>
        <p className="text-[11px] leading-relaxed text-[#64748B]">{t.rgFundingNote}</p>
      </div>
    </div>
  );
}

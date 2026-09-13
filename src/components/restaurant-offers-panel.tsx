"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";

type Offer = {
  id: string;
  title: string;
  description: string;
  type: string;
  discountPercent: number | null;
  discountCents: number | null;
  minOrderCents: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  scope: string;
  funding: string;
};

export function RestaurantOffersPanel({ initial }: { initial: Offer[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"INFO" | "PERCENT" | "FIXED">("INFO");
  const [percent, setPercent] = useState("10");
  const [discountEuro, setDiscountEuro] = useState("5");
  const [minSubtotalEuro, setMinSubtotalEuro] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [scope, setScope] = useState<"BOTH" | "DELIVERY" | "PICKUP">("BOTH");

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          discountPercent: type === "PERCENT" ? Number(percent) || undefined : undefined,
          discountEuro: type === "FIXED" ? discountEuro : undefined,
          minSubtotalEuro: minSubtotalEuro || undefined,
          validFrom: validFrom || null,
          validTo: validTo || null,
          scope,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      setRows((r) => [data.offer, ...r]);
      setTitle("");
      setDescription("");
      toast.success(t.offerCreated);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(o: Offer) {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id, isActive: !o.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      setRows((rs) => rs.map((x) => (x.id === o.id ? { ...x, isActive: data.offer.isActive } : x)));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  function offerValue(o: Offer) {
    if (o.type === "PERCENT") return `${o.discountPercent ?? 0} %`;
    if (o.type === "FIXED") return formatEUR(o.discountCents ?? 0, locale);
    return t.offerTypeInfo;
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">{t.offerHint}</p>
      <p className="rounded-xl bg-[#FFF7FA] px-3 py-2 text-[12px] text-[#C2185B]">{t.offerFundingNote}</p>
      <ul className="divide-y divide-[#F3F4F6] overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm text-[#6B7280]">{t.offerEmpty}</li>
        ) : (
          rows.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#0F172A]">{o.title}</p>
                <p className="text-sm text-[#6B7280]">{offerValue(o)} · {o.scope}</p>
                {o.description ? <p className="mt-1 text-sm text-[#64748B]">{o.description}</p> : null}
              </div>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void toggle(o)}>
                {o.isActive ? t.rgActive : t.rgInactive}
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="space-y-3 rounded-2xl border border-[#E8E8EC] bg-white p-4">
        <h3 className="font-semibold">{t.offerNew}</h3>
        <div>
          <Label>{t.name}</Label>
          <Input className="mt-1 h-11" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>{t.rgDescription}</Label>
          <Input className="mt-1 h-11" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>{t.rgType}</Label>
          <select className="mt-1 h-11 w-full rounded-md border px-3" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="INFO">{t.offerTypeInfo}</option>
            <option value="PERCENT">{t.rgTypePercent}</option>
            <option value="FIXED">{t.rgTypeFixed}</option>
          </select>
        </div>
        {type === "PERCENT" ? (
          <div>
            <Label>{t.rgPercent}</Label>
            <Input className="mt-1 h-11" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
        ) : null}
        {type === "FIXED" ? (
          <div>
            <Label>{t.rgFixed}</Label>
            <Input className="mt-1 h-11" value={discountEuro} onChange={(e) => setDiscountEuro(e.target.value)} />
          </div>
        ) : null}
        <div>
          <Label>{t.rgMinSubtotal}</Label>
          <Input className="mt-1 h-11" value={minSubtotalEuro} onChange={(e) => setMinSubtotalEuro(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t.rgValidFrom}</Label>
            <Input type="datetime-local" className="mt-1 h-11" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div>
            <Label>{t.rgValidTo}</Label>
            <Input type="datetime-local" className="mt-1 h-11" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>{t.rgScope}</Label>
          <select className="mt-1 h-11 w-full rounded-md border px-3" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="BOTH">{t.rgScopeBoth}</option>
            <option value="DELIVERY">{t.rgScopeDelivery}</option>
            <option value="PICKUP">{t.rgScopePickup}</option>
          </select>
        </div>
        <Button className="h-11 w-full" disabled={busy || title.trim().length < 2} onClick={() => void create()}>
          {t.offerCreate}
        </Button>
      </div>
    </div>
  );
}

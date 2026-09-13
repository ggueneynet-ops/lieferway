"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

type Reward = {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  type: string;
  percentOff: number | null;
  discountCents: number | null;
  freeMenuItemId: string | null;
  freeMenuItem?: { id: string; name: string; priceCents: number } | null;
  minOrderCents: number | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  isActive: boolean;
  fundedBy: string;
  restaurantShareBps: number;
  lieferwayShareBps: number;
};

type MenuItem = { id: string; name: string; priceCents: number; isAvailable: boolean };

export function RestaurantWayPointsPanel({
  enabled,
  locked,
  rewards: initial,
  menuItems,
}: {
  enabled: boolean;
  locked: boolean;
  rewards: Reward[];
  menuItems: MenuItem[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [budgetEuro, setBudgetEuro] = useState("");
  const [on, setOn] = useState(enabled);
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("1000");
  const [type, setType] = useState("FIXED");
  const [percentOff, setPercentOff] = useState("10");
  const [discountEuro, setDiscountEuro] = useState("5");
  const [freeMenuItemId, setFreeMenuItemId] = useState(menuItems[0]?.id ?? "");
  const [minOrderEuro, setMinOrderEuro] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perCustomerLimit, setPerCustomerLimit] = useState("1");
  const [fundedBy, setFundedBy] = useState("RESTAURANT");
  const [restaurantShare, setRestaurantShare] = useState("50");
  const [lieferwayShare, setLieferwayShare] = useState("50");

  async function toggle(next: boolean) {
    if (locked) return toast.error(t.wpAdminLocked);
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/waypoints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wayPointsEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOn(Boolean(data.restaurant?.wayPointsEnabled));
      if (data.restaurant?.wayPointsBudgetCents != null) {
        setBudgetEuro(String(data.restaurant.wayPointsBudgetCents / 100));
      } else if (data.restaurant) {
        setBudgetEuro("");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function saveBudget() {
    const cents = budgetEuro.trim() === "" ? null : Math.round(Number(budgetEuro.replace(",", ".")) * 100);
    if (cents != null && (!Number.isFinite(cents) || cents < 0)) return toast.error(t.wpBudgetLabel);
    const res = await fetch("/api/restaurant/waypoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wayPointsBudgetCents: cents }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success(t.wpBudgetSaved);
  }

  async function createReward() {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/waypoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          pointsCost: Number(pointsCost),
          type,
          percentOff: type === "PERCENT" ? Number(percentOff) : undefined,
          discountCents: type === "FIXED" ? Math.round(Number(discountEuro.replace(",", ".")) * 100) : undefined,
          freeMenuItemId: type === "FREE_ITEM" ? freeMenuItemId : undefined,
          minOrderCents: minOrderEuro ? Math.round(Number(minOrderEuro.replace(",", ".")) * 100) : undefined,
          validFrom: validFrom || undefined,
          validUntil: validUntil || undefined,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : 1,
          fundedBy,
          restaurantSharePercent: fundedBy === "SHARED" ? Number(restaurantShare) : undefined,
          lieferwaySharePercent: fundedBy === "SHARED" ? Number(lieferwayShare) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows((r) => [data.reward, ...r]);
      setTitle("");
      setDescription("");
      toast.success(t.save);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function toggleReward(reward: Reward) {
    const res = await fetch("/api/restaurant/waypoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: reward.id,
        title: reward.title,
        description: reward.description,
        pointsCost: reward.pointsCost,
        type: reward.type,
        percentOff: reward.percentOff,
        discountCents: reward.discountCents,
        freeMenuItemId: reward.freeMenuItemId,
        minOrderCents: reward.minOrderCents,
        isActive: !reward.isActive,
        fundedBy: reward.fundedBy,
        restaurantSharePercent: reward.restaurantShareBps / 100,
        lieferwaySharePercent: reward.lieferwayShareBps / 100,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => rs.map((x) => (x.id === reward.id ? { ...x, isActive: data.reward.isActive } : x)));
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold tracking-tight">{t.wpMarketingTitle}</h1>
      <section className="rounded-2xl border border-[#E8E8EC] bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-[#0F172A]">{t.wpOptInLabel}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{t.wpOptInHelp}</p>
            {locked ? <p className="mt-2 text-[12px] font-medium text-[#DC2626]">{t.wpAdminLocked}</p> : null}
          </div>
          <button
            type="button"
            disabled={busy || locked}
            onClick={() => void toggle(!on)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              on ? "bg-[#E91E63]" : "bg-[#E5E7EB]"
            }`}
            aria-pressed={on}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${
                on ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {on ? (
        <>
          <section className="rounded-2xl border border-[#E8E8EC] bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            <h2 className="font-semibold">{t.wpNewReward}</h2>
            <div className="mt-3 grid gap-3">
              <div>
                <Label>{t.wpRewardTitle}</Label>
                <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>{t.wpRewardDesc}</Label>
                <Textarea className="mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label>{t.wpPointsNeeded}</Label>
                <Input className="mt-1" inputMode="numeric" value={pointsCost} onChange={(e) => setPointsCost(e.target.value)} />
              </div>
              <div>
                <Label>{t.wpRewardType}</Label>
                <select
                  className="mt-1 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="PERCENT">{t.wpTypePercent}</option>
                  <option value="FIXED">{t.wpTypeFixed}</option>
                  <option value="FREE_ITEM">{t.wpTypeFree}</option>
                </select>
              </div>
              {type === "PERCENT" ? (
                <div>
                  <Label>%</Label>
                  <Input className="mt-1" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
                </div>
              ) : null}
              {type === "FIXED" ? (
                <div>
                  <Label>€</Label>
                  <Input className="mt-1" value={discountEuro} onChange={(e) => setDiscountEuro(e.target.value)} />
                </div>
              ) : null}
              {type === "FREE_ITEM" ? (
                <div>
                  <Label>{t.wpFreeItem}</Label>
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                    value={freeMenuItemId}
                    onChange={(e) => setFreeMenuItemId(e.target.value)}
                  >
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {formatEUR(item.priceCents, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t.wpMinOrder}</Label>
                  <Input className="mt-1" value={minOrderEuro} onChange={(e) => setMinOrderEuro(e.target.value)} placeholder="€" />
                </div>
                <div>
                  <Label>{t.wpPerCustomer}</Label>
                  <Input className="mt-1" value={perCustomerLimit} onChange={(e) => setPerCustomerLimit(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t.wpValidFrom}</Label>
                  <Input className="mt-1" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div>
                  <Label>{t.wpValidUntil}</Label>
                  <Input className="mt-1" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t.wpUsageLimit}</Label>
                <Input className="mt-1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
              </div>
              <div>
                <Label>{t.wpFundedBy}</Label>
                <select
                  className="mt-1 h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={fundedBy}
                  onChange={(e) => setFundedBy(e.target.value)}
                >
                  <option value="RESTAURANT">{t.wpFundRestaurant}</option>
                  <option value="LIEFERWAY">{t.wpFundLieferway}</option>
                  <option value="SHARED">{t.wpFundShared}</option>
                </select>
              </div>
              {fundedBy === "SHARED" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.wpShareRestaurant}</Label>
                    <Input className="mt-1" value={restaurantShare} onChange={(e) => setRestaurantShare(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t.wpShareLieferway}</Label>
                    <Input className="mt-1" value={lieferwayShare} onChange={(e) => setLieferwayShare(e.target.value)} />
                  </div>
                </div>
              ) : null}
              <Button disabled={busy || !title.trim()} onClick={() => void createReward()}>
                {t.wpCreateReward}
              </Button>
            </div>
          </section>

          <ul className="overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white">
            {rows.length === 0 ? (
              <li className="p-4 text-sm text-[#64748B]">{t.wpNoRewards}</li>
            ) : (
              rows.map((reward) => (
                <li key={reward.id} className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] p-4 last:border-0">
                  <div>
                    <p className="font-medium">{reward.title}</p>
                    <p className="text-[12px] text-[#64748B]">
                      {reward.pointsCost} WP · {reward.type}
                      {reward.isActive ? "" : ` · ${t.wpInactive}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void toggleReward(reward)}>
                    {reward.isActive ? t.wpInactive : t.wpActive}
                  </Button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : null}
    </div>
  );
}

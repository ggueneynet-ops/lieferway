"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { formatEUR } from "@/lib/money";
import { toast } from "sonner";

type Overview = {
  settings: { pointsPerEuro: number };
  stats: {
    participating: number;
    locked: number;
    pointsEarned: number;
    pointsRedeemed: number;
    activeRewards: number;
    activeCampaigns: number;
    restaurantFundedCents: number;
    lieferwayFundedCents: number;
    discountCents: number;
  };
  restaurants: {
    id: string;
    name: string;
    slug: string;
    wayPointsEnabled: boolean;
    wayPointsDisabledByAdmin: boolean;
  }[];
  campaigns: {
    id: string;
    title: string;
    type: string;
    isActive: boolean;
    multiplier: number | null;
    bonusPoints: number | null;
    bonusDiscountCents: number | null;
  }[];
};

export function AdminWayPoints({
  initial,
  restaurants,
}: {
  initial: Overview;
  restaurants: Overview["restaurants"];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [rate, setRate] = useState(String(initial.settings.pointsPerEuro));
  const [title, setTitle] = useState("2x Punkte-Woche");
  const [type, setType] = useState("MULTIPLIER");
  const [multiplier, setMultiplier] = useState("2");
  const [bonusPoints, setBonusPoints] = useState("500");
  const [bonusEuro, setBonusEuro] = useState("5");
  const [adjustEmail, setAdjustEmail] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("100");
  const [adjustReason, setAdjustReason] = useState("Korrektur");
  const [campaigns, setCampaigns] = useState(initial.campaigns);
  const [rows, setRows] = useState(restaurants);

  async function saveRate() {
    const res = await fetch("/api/admin/waypoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pointsPerEuro: Number(rate) }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success(t.wpRateSaved);
    router.refresh();
  }

  async function createCampaign() {
    const res = await fetch("/api/admin/waypoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        multiplier: type === "MULTIPLIER" ? Number(multiplier) : undefined,
        bonusPoints: type === "FIRST_ORDER_BONUS" || type === "BONUS_POINTS" ? Number(bonusPoints) : undefined,
        bonusDiscountCents: type === "BONUS_VOUCHER" ? Math.round(Number(bonusEuro.replace(",", ".")) * 100) : undefined,
        fundedBy: "LIEFERWAY",
        firstOrderOnly: type === "FIRST_ORDER_BONUS",
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setCampaigns((c) => [data.campaign, ...c]);
    toast.success(t.save);
    router.refresh();
  }

  async function toggleCampaign(c: Overview["campaigns"][number]) {
    const res = await fetch("/api/admin/waypoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, title: c.title, type: c.type, isActive: !c.isActive }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setCampaigns((rs) => rs.map((x) => (x.id === c.id ? { ...x, isActive: data.campaign.isActive } : x)));
  }

  async function lockRestaurant(r: Overview["restaurants"][number], lock: boolean) {
    const res = await fetch("/api/admin/waypoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: r.id, wayPointsDisabledByAdmin: lock }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...data.restaurant } : x)));
  }

  async function postAdjust() {
    const res = await fetch("/api/admin/waypoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adjust: {
          userEmail: adjustEmail,
          delta: Number(adjustDelta),
          reason: adjustReason,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success(t.wpAdjustOk);
    setAdjustEmail("");
    router.refresh();
  }

  const s = initial.stats;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">{t.wpAdjustTitle}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <Label>{t.wpAdjustEmail}</Label>
            <Input className="mt-1" value={adjustEmail} onChange={(e) => setAdjustEmail(e.target.value)} />
          </div>
          <div>
            <Label>{t.wpAdjustDelta}</Label>
            <Input className="mt-1" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} />
          </div>
          <div>
            <Label>{t.wpAdjustReason}</Label>
            <Input className="mt-1" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={postAdjust}>{t.wpAdjustSubmit}</Button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t.wpParticipating, value: String(s.participating) },
          { label: t.wpPointsEarned, value: String(s.pointsEarned) },
          { label: t.wpPointsRedeemed, value: String(s.pointsRedeemed) },
          { label: t.wpActiveRewards, value: String(s.activeRewards) },
          { label: t.wpActiveCampaigns, value: String(s.activeCampaigns) },
          { label: t.wpRestaurantFunded, value: formatEUR(s.restaurantFundedCents, locale) },
          { label: t.wpLieferwayFunded, value: formatEUR(s.lieferwayFundedCents, locale) },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-text-secondary">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">{t.wpEarnRate}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t.wpEarnRateHint}</p>
        <div className="mt-3 flex gap-2">
          <Input value={rate} onChange={(e) => setRate(e.target.value)} className="max-w-[8rem]" />
          <Button onClick={() => void saveRate()}>{t.save}</Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <ul className="divide-y rounded-2xl border bg-white">
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-muted-foreground">{c.type}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void toggleCampaign(c)}>
                {c.isActive ? t.wpActive : t.wpInactive}
              </Button>
            </li>
          ))}
          {campaigns.length === 0 ? <li className="p-4 text-sm text-muted-foreground">{t.wpNoCampaigns}</li> : null}
        </ul>
        <div className="h-fit space-y-3 rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">{t.wpNewCampaign}</h2>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <select
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="MULTIPLIER">{t.wpCampaignMultiplier}</option>
            <option value="FIRST_ORDER_BONUS">{t.wpCampaignFirst}</option>
            <option value="BONUS_POINTS">{t.wpCampaignBonus}</option>
            <option value="BONUS_VOUCHER">{t.wpCampaignVoucher}</option>
          </select>
          {type === "MULTIPLIER" ? (
            <div>
              <Label>x</Label>
              <Input className="mt-1" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
            </div>
          ) : null}
          {type === "FIRST_ORDER_BONUS" || type === "BONUS_POINTS" ? (
            <div>
              <Label>WP</Label>
              <Input className="mt-1" value={bonusPoints} onChange={(e) => setBonusPoints(e.target.value)} />
            </div>
          ) : null}
          {type === "BONUS_VOUCHER" ? (
            <div>
              <Label>€</Label>
              <Input className="mt-1" value={bonusEuro} onChange={(e) => setBonusEuro(e.target.value)} />
            </div>
          ) : null}
          <Button className="w-full" onClick={() => void createCampaign()}>
            {t.wpCreateCampaign}
          </Button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b bg-bg-muted text-text-secondary">
            <tr>
              <th className="px-4 py-2 font-medium">{t.restaurants}</th>
              <th className="px-4 py-2 font-medium">{t.status}</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">
                  {r.wayPointsDisabledByAdmin
                    ? t.wpAdminLocked
                    : r.wayPointsEnabled
                      ? t.wpParticipatingOne
                      : t.wpNotParticipating}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => void lockRestaurant(r, !r.wayPointsDisabledByAdmin)}>
                    {r.wayPointsDisabledByAdmin ? t.adminUnfreeze : t.wpForceDisable}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

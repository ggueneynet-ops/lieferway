"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";

const DAY_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

type Settings = {
  preorderEnabled: boolean;
  preorderMaxDaysAhead: number;
  preorderMinLeadMinutes: number;
  preorderWeekdays: number[];
  preorderHours: { open: string; close: string };
  preorderDelivery: boolean;
  preorderPickup: boolean;
  preorderMaxConcurrent: number | null;
};

export function RestaurantPreorderPanel({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dayLabels = [t.weekdayMon, t.weekdayTue, t.weekdayWed, t.weekdayThu, t.weekdayFri, t.weekdaySat, t.weekdaySun];

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/preorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      setS(data.settings);
      toast.success(t.preorderSaved);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  function toggleDay(d: number) {
    setS((prev) => {
      const has = prev.preorderWeekdays.includes(d);
      const next = has ? prev.preorderWeekdays.filter((x) => x !== d) : [...prev.preorderWeekdays, d].sort();
      return { ...prev, preorderWeekdays: next.length ? next : prev.preorderWeekdays };
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">{t.preorderPanelHint}</p>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E8EC] bg-white px-4 py-4">
        <span>
          <span className="block text-[15px] font-semibold text-[#0F172A]">{t.preorderToggle}</span>
          <span className="block text-[12px] text-[#64748B]">{t.preorderToggleHint}</span>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-[#E91E63]"
          checked={s.preorderEnabled}
          onChange={(e) => setS((p) => ({ ...p, preorderEnabled: e.target.checked }))}
        />
      </label>
      <div className="grid gap-4 rounded-2xl border border-[#E8E8EC] bg-white p-4 sm:grid-cols-2">
        <div>
          <Label>{t.preorderMaxDays}</Label>
          <Input
            type="number"
            min={1}
            max={30}
            className="mt-1 h-11"
            value={s.preorderMaxDaysAhead}
            onChange={(e) => setS((p) => ({ ...p, preorderMaxDaysAhead: Number(e.target.value) || 1 }))}
          />
        </div>
        <div>
          <Label>{t.preorderMinLead}</Label>
          <Input
            type="number"
            min={0}
            className="mt-1 h-11"
            value={s.preorderMinLeadMinutes}
            onChange={(e) => setS((p) => ({ ...p, preorderMinLeadMinutes: Number(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <Label>{t.preorderOpen}</Label>
          <Input
            type="time"
            className="mt-1 h-11"
            value={s.preorderHours.open}
            onChange={(e) => setS((p) => ({ ...p, preorderHours: { ...p.preorderHours, open: e.target.value } }))}
          />
        </div>
        <div>
          <Label>{t.preorderClose}</Label>
          <Input
            type="time"
            className="mt-1 h-11"
            value={s.preorderHours.close}
            onChange={(e) => setS((p) => ({ ...p, preorderHours: { ...p.preorderHours, close: e.target.value } }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>{t.preorderMaxConcurrent}</Label>
          <Input
            type="number"
            min={1}
            className="mt-1 h-11"
            placeholder={t.preorderMaxConcurrentHint}
            value={s.preorderMaxConcurrent ?? ""}
            onChange={(e) =>
              setS((p) => ({
                ...p,
                preorderMaxConcurrent: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-[#E91E63]"
            checked={s.preorderDelivery}
            onChange={(e) => setS((p) => ({ ...p, preorderDelivery: e.target.checked }))}
          />
          {t.fulfillmentDelivery}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-[#E91E63]"
            checked={s.preorderPickup}
            onChange={(e) => setS((p) => ({ ...p, preorderPickup: e.target.checked }))}
          />
          {t.fulfillmentPickup}
        </label>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">{t.preorderWeekdays}</p>
          <div className="flex flex-wrap gap-2">
            {DAY_KEYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`h-9 rounded-full px-3 text-xs font-semibold ${
                  s.preorderWeekdays.includes(d)
                    ? "bg-[#E91E63] text-white"
                    : "border border-[#E5E7EB] bg-white text-[#111827]"
                }`}
              >
                {dayLabels[i]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button className="h-12 w-full" disabled={busy} onClick={() => void save()}>
        {busy ? t.processing : t.save}
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import type { FulfillmentType } from "@/lib/constants";

type Settings = {
  maxDaysAhead: number;
  minLeadMinutes: number;
  weekdays: number[];
  hours: { open: string; close: string };
  delivery: boolean;
  pickup: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function berlinYmd(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function weekdayMon1(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun
  return js === 0 ? 7 : js;
}

function slotTimes(open: string, close: string, step = 15) {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  let start = oh * 60 + om;
  let end = ch * 60 + cm;
  const out: string[] = [];
  if (end <= start) end += 24 * 60;
  for (let m = start; m <= end; m += step) {
    const mm = m % (24 * 60);
    out.push(`${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`);
  }
  return out;
}

export function CheckoutPreorder({
  restaurantSlug,
  fulfillmentType,
  value,
  onChange,
}: {
  restaurantSlug: string;
  fulfillmentType: FulfillmentType;
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<"asap" | "later">("asap");
  const [date, setDate] = useState(berlinYmd());
  const [time, setTime] = useState("12:00");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/restaurants/${encodeURIComponent(restaurantSlug)}/preorder`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setSettings(data.settings ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setSettings(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantSlug]);

  const allowedForFulfillment = useMemo(() => {
    if (!settings) return false;
    if (fulfillmentType === "PICKUP") return settings.pickup;
    return settings.delivery;
  }, [settings, fulfillmentType]);

  const dateOptions = useMemo(() => {
    if (!settings) return [] as string[];
    const start = berlinYmd();
    const days: string[] = [];
    for (let i = 0; i <= settings.maxDaysAhead; i++) {
      const ymd = addDaysYmd(start, i);
      if (settings.weekdays.includes(weekdayMon1(ymd))) days.push(ymd);
    }
    return days;
  }, [settings]);

  const times = useMemo(() => {
    if (!settings) return [] as string[];
    return slotTimes(settings.hours.open, settings.hours.close);
  }, [settings]);

  useEffect(() => {
    if (!enabled || !allowedForFulfillment) {
      onChange(null);
      setMode("asap");
      return;
    }
    if (mode === "asap") {
      onChange(null);
      return;
    }
    if (!dateOptions.includes(date) && dateOptions[0]) setDate(dateOptions[0]);
    if (!times.includes(time) && times[0]) setTime(times[0]);
    onChange(`${date}T${time}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, allowedForFulfillment, mode, date, time, dateOptions, times]);

  if (!enabled || !settings || !allowedForFulfillment) return null;

  return (
    <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">{t.preorderTitle}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{t.preorderHint}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`h-10 rounded-full px-4 text-sm font-semibold ${
            mode === "asap" ? "bg-[#E91E63] text-white" : "border border-[#E5E7EB] bg-white text-[#111827]"
          }`}
          onClick={() => setMode("asap")}
        >
          {t.preorderAsap}
        </button>
        <button
          type="button"
          className={`h-10 rounded-full px-4 text-sm font-semibold ${
            mode === "later" ? "bg-[#E91E63] text-white" : "border border-[#E5E7EB] bg-white text-[#111827]"
          }`}
          onClick={() => setMode("later")}
        >
          {t.preorderLater}
        </button>
      </div>
      {mode === "later" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="preorder-date">{t.preorderDate}</Label>
            <select
              id="preorder-date"
              className="mt-1 h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              {dateOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="preorder-time">{t.preorderTime}</Label>
            <select
              id="preorder-time"
              className="mt-1 h-11 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              {times.map((tm) => (
                <option key={tm} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </div>
          {value ? (
            <p className="sm:col-span-2 text-xs text-[#6B7280]">
              {t.preorderSelected}: {value.replace("T", " · ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/locale-provider";

type Banner = {
  bannerText: string | null;
  bannerActive: boolean;
  bannerStartsAt: string | null;
  bannerEndsAt: string | null;
  live?: boolean;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RestaurantBannerPanel({ initial }: { initial: Banner }) {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState(initial.bannerText ?? "");
  const [active, setActive] = useState(initial.bannerActive);
  const [starts, setStarts] = useState(toLocalInput(initial.bannerStartsAt));
  const [ends, setEnds] = useState(toLocalInput(initial.bannerEndsAt));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/restaurant/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bannerText: text,
          bannerActive: active,
          bannerStartsAt: starts || null,
          bannerEndsAt: ends || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      toast.success(t.bannerSaved);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[#6B7280]">{t.bannerHint}</p>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E8EC] bg-white px-4 py-4">
        <span className="text-[15px] font-semibold">{t.bannerActive}</span>
        <input type="checkbox" className="size-5 accent-[#E91E63]" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </label>
      <div className="rounded-2xl border border-[#E8E8EC] bg-white p-4 space-y-3">
        <div>
          <Label>{t.bannerText}</Label>
          <Textarea className="mt-1" maxLength={280} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-1 text-xs text-[#9CA3AF]">{text.length}/280</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t.bannerStarts}</Label>
            <Input type="datetime-local" className="mt-1 h-11" value={starts} onChange={(e) => setStarts(e.target.value)} />
          </div>
          <div>
            <Label>{t.bannerEnds}</Label>
            <Input type="datetime-local" className="mt-1 h-11" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </div>
        </div>
      </div>
      <Button className="h-12 w-full" disabled={busy} onClick={() => void save()}>
        {busy ? t.processing : t.save}
      </Button>
    </div>
  );
}

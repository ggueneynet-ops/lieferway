"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { RADIUS_COOKIE } from "@/lib/constants";
import { marketplaceHref } from "@/lib/marketplace";
import { markSplashShown } from "@/lib/splash";

export function RadiusFilter({
  plz,
  q,
  cuisine,
  km,
}: {
  plz: string;
  q?: string;
  cuisine?: string;
  km: number | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(km ?? 5);
  const label = km == null ? t.radiusCity : `${km} km`;

  function apply(next: number) {
    markSplashShown();
    document.cookie = `${RADIUS_COOKIE}=${encodeURIComponent(String(next))};path=/;max-age=31536000;SameSite=Lax`;
    router.replace(marketplaceHref({ plz, q, cuisine, km: next }), { scroll: false });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(km ?? 5);
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-[#E8E8EC] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
        aria-expanded={open}
      >
        {t.radiusLabel} · {label}
        <ChevronDown className="size-3.5 text-[#94A3B8]" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[#E8E8EC] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between text-[12px] font-semibold text-[#0F172A]">
            <span>{t.radiusLabel}</span>
            <span className="tabular-nums text-[#922A49]">{draft} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
            className="mt-3 w-full accent-[#922A49]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8]">
            <span>1 km</span>
            <span>15 km</span>
          </div>
          <button
            type="button"
            onClick={() => apply(draft)}
            className="mt-3 h-9 w-full rounded-xl bg-[#922A49] text-[13px] font-semibold text-white hover:bg-[#7A2340]"
          >
            {draft} km
          </button>
        </div>
      ) : null}
    </div>
  );
}

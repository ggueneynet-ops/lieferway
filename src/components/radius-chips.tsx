"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { RADIUS_COOKIE, RADIUS_PRESETS } from "@/lib/constants";
import { marketplaceHref } from "@/lib/marketplace";

export function RadiusChips({
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
  const options: { value: string; label: string; active: boolean }[] = [
    ...RADIUS_PRESETS.map((n) => ({
      value: String(n),
      label: `${n} km`,
      active: km === n,
    })),
    { value: "all", label: t.radiusCity, active: km == null },
  ];

  function select(value: string) {
    document.cookie = `${RADIUS_COOKIE}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
    const nextKm = value === "all" ? null : Number(value);
    router.replace(marketplaceHref({ plz, q, cuisine, km: nextKm }), { scroll: false });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.eta}
      className="inline-flex h-9 items-center rounded-full bg-white p-0.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ring-1 ring-[#E5E7EB]"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.active}
          onClick={() => select(opt.value)}
          className={`h-8 rounded-full px-3 text-[13px] font-medium whitespace-nowrap sm:px-4 ${
            opt.active ? "bg-[#E91E63] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

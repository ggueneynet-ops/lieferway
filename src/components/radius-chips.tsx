"use client";

import { useI18n } from "@/components/locale-provider";
import { RADIUS_COOKIE, RADIUS_PRESETS } from "@/lib/constants";

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
    const params = new URLSearchParams();
    params.set("plz", plz);
    params.set("km", value);
    if (q) params.set("q", q);
    if (cuisine) params.set("cuisine", cuisine);
    window.location.assign(`/?${params.toString()}`);
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.eta}
      className="inline-flex h-8 items-center rounded-full bg-[#F3F4F6] p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.active}
          onClick={() => select(opt.value)}
          className={`h-7 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap sm:px-3.5 ${
            opt.active ? "bg-[#E91E63] text-white" : "text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

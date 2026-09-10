"use client";

import { useI18n } from "@/components/locale-provider";
import { RADIUS_PRESETS } from "@/lib/constants";

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

  return (
    <div
      role="group"
      aria-label={t.maxDeliveryRadius}
      className="inline-flex h-10 max-w-full items-stretch overflow-x-auto rounded-full bg-[#F3F4F6] p-1"
    >
      {options.map((opt) => (
        <form key={opt.value} action="/radius" method="post" className="flex">
          {plz ? <input type="hidden" name="plz" value={plz} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
          <input type="hidden" name="km" value={opt.value} />
          <button
            type="submit"
            className={`h-full min-w-[3.75rem] rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap sm:min-w-[4.5rem] sm:px-5 ${
              opt.active ? "bg-[#E91E63] text-white" : "bg-transparent text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            {opt.label}
          </button>
        </form>
      ))}
    </div>
  );
}

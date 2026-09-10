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
    <div className="inline-flex rounded-full border border-border bg-white p-0.5">
      {options.map((opt) => (
        <form key={opt.value} action="/radius" method="post">
          {plz ? <input type="hidden" name="plz" value={plz} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
          <input type="hidden" name="km" value={opt.value} />
          <button
            type="submit"
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium sm:px-4 ${
              opt.active ? "bg-primary text-white" : "text-text-secondary hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        </form>
      ))}
    </div>
  );
}

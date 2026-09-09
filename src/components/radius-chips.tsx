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
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
        {t.radiusLabel}
      </span>
      <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
        {options.map((opt) => (
          <form key={opt.value} action="/radius" method="post" className="shrink-0">
            {plz ? <input type="hidden" name="plz" value={plz} /> : null}
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {cuisine ? <input type="hidden" name="cuisine" value={cuisine} /> : null}
            <input type="hidden" name="km" value={opt.value} />
            <button
              type="submit"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                opt.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-bg-muted text-ink hover:bg-primary-soft"
              }`}
            >
              {opt.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

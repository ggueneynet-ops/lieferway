"use client";

import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/components/locale-provider";

export function HomeSectionTitle({
  count,
  plz,
  km,
}: {
  count: number;
  plz?: string | null;
  km?: number | null;
}) {
  const { t } = useI18n();
  const n = String(count);
  const sub = !plz
    ? `${n} ${t.restaurants} · ${t.city}`
    : km == null
      ? interpolate(t.resultsSubCity, { count: n, plz })
      : interpolate(t.resultsSub, { count: n, plz, km: String(km) });

  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t.nearbyTitle}</h2>
      <p className="mt-1 text-sm text-text-secondary">{sub}</p>
    </div>
  );
}

export function TrustStrip() {
  const { t } = useI18n();
  return (
    <section className="border-y border-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <p className="text-[13px] font-semibold tracking-tight text-ink">{t.whyLieferway}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{t.trustStrip}</p>
      </div>
    </section>
  );
}

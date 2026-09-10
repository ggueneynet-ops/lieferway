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
    <div>
      <h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-[#111827] sm:text-3xl">
        {t.nearbyTitle}
      </h2>
      <p className="mt-2 text-sm text-[#6B7280]">{sub}</p>
    </div>
  );
}

export function TrustStrip() {
  const { t } = useI18n();
  return (
    <section className="pt-12 pb-2">
      <div className="lw-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">{t.whyLieferway}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B7280]">{t.trustStrip}</p>
      </div>
    </section>
  );
}

export function DemoModeChip() {
  const { t } = useI18n();
  return (
    <span
      title={t.demoMarketplaceNotice}
      className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[12px] font-medium text-[#6B7280]"
    >
      <span className="size-1.5 rounded-full bg-[#E91E63]" aria-hidden />
      {t.demoMode}
    </span>
  );
}

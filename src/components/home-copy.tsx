"use client";

import { useI18n } from "@/components/locale-provider";

export function HomeHeroCopy() {
  const { t } = useI18n();
  return (
    <>
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-primary">{t.city}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-pretty text-ink sm:text-5xl">
        {t.heroTitle}
        <span className="mt-1 block text-primary">{t.tagline}</span>
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{t.heroSubtitle}</p>
    </>
  );
}

export function HomeSectionTitle({
  kind,
  count,
  plz,
  km,
  nearby,
}: {
  kind: "cuisines" | "restaurants" | "empty";
  count?: number;
  plz?: string | null;
  km?: number | null;
  nearby?: boolean;
}) {
  const { t } = useI18n();
  if (kind === "cuisines") return <h2 className="font-display text-lg font-semibold text-ink">{t.cuisines}</h2>;
  if (kind === "empty") {
    return (
      <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted-foreground">{t.noResults}</p>
    );
  }
  const n = String(count ?? 0);
  const title = plz
    ? km == null
      ? t.restaurantsInCity.replace("{count}", n).replace("{plz}", plz)
      : t.restaurantsInRadius.replace("{count}", n).replace("{plz}", plz).replace("{km}", String(km))
    : `${n} ${t.restaurants} · ${t.city}`;
  return (
    <h2 className="mb-3 font-display text-base font-semibold tracking-tight text-ink sm:text-[17px]">
      {title}
      {nearby ? <span className="ml-2 text-xs font-normal text-muted-foreground">{t.sortedNearby}</span> : null}
    </h2>
  );
}

export function TrustStrip() {
  const { t } = useI18n();
  return (
    <section className="border-b border-primary/10 bg-primary-soft/70">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5">
        <p className="font-display text-[13px] font-semibold tracking-tight text-ink sm:text-sm">{t.whyLieferway}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary sm:text-sm">{t.trustStrip}</p>
      </div>
    </section>
  );
}

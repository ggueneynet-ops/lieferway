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
  nearby,
}: {
  kind: "cuisines" | "restaurants" | "empty";
  count?: number;
  plz?: string | null;
  nearby?: boolean;
}) {
  const { t } = useI18n();
  if (kind === "cuisines") return <h2 className="font-display text-lg font-semibold text-ink">{t.cuisines}</h2>;
  if (kind === "empty") {
    return (
      <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted-foreground">{t.noResults}</p>
    );
  }
  const title = plz
    ? t.restaurantsInPlz.replace("{count}", String(count ?? 0)).replace("{plz}", plz)
    : `${count} ${t.restaurants} · ${t.city}`;
  return (
    <h2 className="mb-1 font-display text-[15px] font-semibold text-ink">
      {title}
      {nearby ? <span className="ml-2 text-xs font-normal text-muted-foreground">{t.sortedNearby}</span> : null}
    </h2>
  );
}

export function AllLabel() {
  const { t } = useI18n();
  return t.all;
}

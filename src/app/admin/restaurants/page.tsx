import Link from "next/link";
import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { CUISINES, DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";
import { restaurantPhoto } from "@/lib/media";
import { RestaurantLogo } from "@/components/restaurant-logo";
import { getCopy } from "@/lib/get-locale";
import { cuisineName, interpolate } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { restaurantSnapshotMap } from "@/lib/restaurant-reports";
import { RestaurantLogoForm } from "@/components/restaurant-logo-form";
import { updateSlugAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; name?: string; email?: string }>;
}) {
  const q = await searchParams;
  const { t, locale } = await getCopy();
  const [restaurants, snapshots] = await Promise.all([
    prisma.restaurant.findMany({
      include: { owner: { select: { email: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    restaurantSnapshotMap(),
  ]);

  return (
    <PanelShell roles={["ADMIN"]} title={t.restaurants}>
      <div className="mx-auto max-w-2xl space-y-8">
        {q.error ? (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-base text-danger">{q.error}</p>
        ) : null}
        {q.ok === "1" ? (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">
            {interpolate(t.createdOk, { name: q.name ?? "" })}
            <br />
            Login: {q.email} / lieferway
          </p>
        ) : null}
        {q.ok === "provision" ? (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">{t.provisionSaved}</p>
        ) : null}
        {q.ok === "slug" ? (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-base text-success">{t.adminSlugSaved}</p>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">{t.newRestaurant}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.restaurantFormHint}</p>
          <form action="/admin/restaurants/create" method="post" className="mt-4 space-y-4">
            <div>
              <label htmlFor="name" className="text-base font-medium">
                {t.name}
              </label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                placeholder="z. B. Café Main"
              />
            </div>
            <div>
              <label htmlFor="cuisine" className="text-base font-medium">
                {t.cuisine}
              </label>
              <select
                id="cuisine"
                name="cuisine"
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                defaultValue={CUISINES[0]}
              >
                {CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {cuisineName(locale, c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ownerName" className="text-base font-medium">
                {t.ownerName}
              </label>
              <input id="ownerName" name="ownerName" required minLength={2} className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base" />
            </div>
            <div>
              <label htmlFor="ownerEmail" className="text-base font-medium">
                {t.ownerEmail}
              </label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                required
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                placeholder="lokal@lieferway.de"
              />
            </div>
            <div>
              <label htmlFor="commissionPercent" className="text-base font-medium">
                {t.commission}
              </label>
              <input
                id="commissionPercent"
                name="commissionPercent"
                inputMode="decimal"
                defaultValue={String(DEFAULT_COMMISSION_PERCENT)}
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
              />
              <p className="mt-1 text-sm text-text-secondary">
                {interpolate(t.commissionDefault, { percent: String(DEFAULT_COMMISSION_PERCENT) })}
              </p>
            </div>
            <div>
              <label htmlFor="logoUrl" className="text-base font-medium">
                {t.shopLogo}
              </label>
              <input
                id="logoUrl"
                name="logoUrl"
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
                placeholder={t.logoUrlPlaceholder}
              />
              <p className="mt-1 text-sm text-text-secondary">{t.shopLogoHint}</p>
            </div>
            <button type="submit" className="h-14 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed">
              {t.createRestaurant}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            {t.list} ({restaurants.length})
          </h2>
          {restaurants.map((r) => {
            const snap = snapshots.get(r.id);
            return (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={restaurantPhoto(r.imageUrl, r.cuisine, r.slug)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-base font-medium text-ink">
                    <RestaurantLogo name={r.name} logoUrl={r.logoUrl} slug={r.slug} size={28} />
                    {r.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {cuisineName(locale, r.cuisine)} · {r.owner.email}
                    {!r.isActive ? ` · ${t.adminFrozen}` : ""}
                  </p>
                </div>
                <Link
                  href={`/admin/restaurants/${r.id}`}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm text-ink hover:bg-bg-muted"
                >
                  {t.reports}
                </Link>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-bg-muted px-2 py-2">
                  <dt className="text-[11px] text-text-secondary">{t.ordersCount}</dt>
                  <dd className="text-sm font-semibold text-ink">{snap?.orderCount ?? 0}</dd>
                </div>
                <div className="rounded-xl bg-bg-muted px-2 py-2">
                  <dt className="text-[11px] text-text-secondary">{t.revenueFood}</dt>
                  <dd className="text-sm font-semibold text-ink">
                    {formatEUR(snap?.foodCents ?? 0, locale)}
                  </dd>
                </div>
                <div className="rounded-xl bg-bg-muted px-2 py-2">
                  <dt className="text-[11px] text-text-secondary">{t.platformCommission}</dt>
                  <dd className="text-sm font-semibold text-ink">
                    {formatEUR(snap?.commissionCents ?? 0, locale)}
                  </dd>
                </div>
              </dl>
              <p className="mt-1 text-center text-[11px] text-text-secondary">{t.snapshotHint}</p>
              <RestaurantLogoForm
                restaurantId={r.id}
                name={r.name}
                slug={r.slug}
                logoUrl={r.logoUrl}
                action="/admin/restaurants/logo"
                labels={{
                  shopLogo: t.shopLogo,
                  shopLogoHint: t.shopLogoHint,
                  save: t.save,
                  photoOptional: t.logoUrlPlaceholder,
                }}
              />
              <form action="/admin/restaurants/commission" method="post" className="mt-3 space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`c-${r.id}`}>
                    {t.commission} {r.name}
                  </label>
                  <input
                    id={`c-${r.id}`}
                    name="commissionPercent"
                    defaultValue={String(r.commissionPercent)}
                    inputMode="decimal"
                    className="h-12 w-24 rounded-lg border border-border bg-background px-3 text-base"
                  />
                  <span className="text-sm text-text-secondary">%</span>
                  <span className="text-xs text-text-secondary">5 / 7 / …</span>
                  <label className="sr-only" htmlFor={`r-${r.id}`}>
                    {t.maxDeliveryRadius} {r.name}
                  </label>
                  <input
                    id={`r-${r.id}`}
                    name="maxDeliveryKm"
                    inputMode="decimal"
                    placeholder={t.unlimitedRadius}
                    defaultValue={r.maxDeliveryKm != null ? String(r.maxDeliveryKm) : ""}
                    className="h-12 w-24 rounded-lg border border-border bg-background px-3 text-base"
                  />
                  <span className="text-sm text-text-secondary">km</span>
                  <button type="submit" className="h-12 flex-1 rounded-xl bg-primary text-base font-medium text-primary-foreground hover:bg-primary-pressed">
                    {t.save}
                  </button>
                </div>
                <p className="text-xs text-text-secondary">{t.maxDeliveryRadiusHint}</p>
              </form>
              <form action={updateSlugAction} className="mt-3 space-y-2 border-t border-border pt-3">
                <input type="hidden" name="id" value={r.id} />
                <label className="text-sm font-medium text-ink" htmlFor={`slug-${r.id}`}>
                  {t.adminSlug}
                </label>
                <p className="text-xs text-text-secondary">{t.adminSlugHint}</p>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-text-secondary">/</span>
                  <input
                    id={`slug-${r.id}`}
                    name="slug"
                    defaultValue={r.slug}
                    required
                    className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base"
                  />
                  <button type="submit" className="h-12 shrink-0 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
                    {t.save}
                  </button>
                </div>
                <p className="break-all text-xs text-primary">
                  /{r.slug}
                </p>
              </form>
            </div>
            );
          })}
        </section>
      </div>
    </PanelShell>
  );
}

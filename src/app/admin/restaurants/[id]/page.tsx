import Link from "next/link";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/panel-shell";
import { RestaurantLogo } from "@/components/restaurant-logo";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { cuisineName, type Locale } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { formatBerlinDateTime } from "@/lib/datetime";
import {
  parseReportPreset,
  resolveReportRange,
  restaurantReportTotals,
  type ReportPreset,
} from "@/lib/restaurant-reports";
import { updateSlugAction } from "../actions";

export const dynamic = "force-dynamic";

function formatWhen(date: Date, locale: Locale) {
  return formatBerlinDateTime(date, locale);
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

const PRESET_KEYS: { id: ReportPreset; label: keyof import("@/lib/i18n").Dictionary }[] = [
  { id: "today", label: "periodToday" },
  { id: "7d", label: "period7d" },
  { id: "30d", label: "period30d" },
  { id: "month", label: "periodMonth" },
  { id: "all", label: "periodAll" },
  { id: "custom", label: "periodCustom" },
];

export default async function AdminRestaurantReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const { t, locale } = await getCopy();
  const preset = parseReportPreset(q.period);
  const range = resolveReportRange(preset, q.from, q.to);

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { owner: { select: { email: true, name: true } } },
  });
  if (!restaurant) notFound();

  const [totals, today, week, month, recent, betterRated] = await Promise.all([
    restaurantReportTotals(id, range),
    restaurantReportTotals(id, resolveReportRange("today")),
    restaurantReportTotals(id, resolveReportRange("7d")),
    restaurantReportTotals(id, resolveReportRange("month")),
    prisma.order.findMany({
      where: {
        restaurantId: id,
        ...(range.from || range.to
          ? {
              createdAt: {
                ...(range.from ? { gte: range.from } : {}),
                ...(range.to ? { lt: range.to } : {}),
              },
            }
          : {}),
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.restaurant.count({ where: { rating: { gt: restaurant.rating } } }),
  ]);
  const rank = betterRated + 1;

  const periodHref = (next: ReportPreset) => {
    const sp = new URLSearchParams();
    sp.set("period", next);
    if (next === "custom") {
      if (range.fromYmd) sp.set("from", range.fromYmd);
      if (range.toYmd) sp.set("to", range.toYmd);
    }
    return `/admin/restaurants/${id}?${sp.toString()}`;
  };

  return (
    <PanelShell roles={["ADMIN"]} title={`${restaurant.name} · ${t.reports}`}>
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/admin/restaurants" className="text-sm text-primary hover:underline">
          ← {t.backToRestaurants}
        </Link>

        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurantPhoto(restaurant.imageUrl, restaurant.cuisine, restaurant.slug)}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold text-ink">
              <RestaurantLogo name={restaurant.name} logoUrl={restaurant.logoUrl} slug={restaurant.slug} size={28} />
              {restaurant.name}
            </p>
            <p className="text-sm text-text-secondary">
              {cuisineName(locale, restaurant.cuisine)} · {restaurant.owner.email}
            </p>
            {!restaurant.isActive ? (
              <p className="mt-1 text-sm font-medium text-danger">{t.adminFrozen}</p>
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                {t.adminRanking} #{rank} · {restaurant.rating.toFixed(1)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action="/admin/restaurants/freeze" method="post">
            <input type="hidden" name="id" value={restaurant.id} />
            <input type="hidden" name="freeze" value={restaurant.isActive ? "1" : "0"} />
            <button
              type="submit"
              className="h-11 rounded-xl border border-border bg-white px-4 text-sm font-medium"
            >
              {restaurant.isActive ? t.adminFreeze : t.adminUnfreeze}
            </button>
          </form>
        </div>

        <form action={updateSlugAction} className="rounded-2xl border bg-white p-4 space-y-2">
          <input type="hidden" name="id" value={restaurant.id} />
          <h2 className="font-semibold">{t.adminSlug}</h2>
          <p className="text-sm text-text-secondary">{t.adminSlugHint}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">/</span>
            <input
              name="slug"
              defaultValue={restaurant.slug}
              required
              className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base"
            />
            <button type="submit" className="h-12 rounded-xl bg-primary px-4 text-sm font-medium text-white">
              {t.save}
            </button>
          </div>
          <p className="break-all text-sm text-primary">/{restaurant.slug}</p>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="font-semibold">{t.adminRefunds}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t.adminRefundsStub}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="font-semibold">{t.adminComplaints}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t.adminComplaintsStub}</p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-ink">{t.period}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_KEYS.map((p) => {
              const active = preset === p.id;
              return (
                <Link
                  key={p.id}
                  href={periodHref(p.id)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-ink hover:bg-bg-muted"
                  }`}
                >
                  {t[p.label]}
                </Link>
              );
            })}
          </div>
          <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="period" value="custom" />
            <div>
              <label htmlFor="from" className="text-sm text-text-secondary">
                {t.periodFrom}
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={range.fromYmd ?? ""}
                className="mt-1 h-11 rounded-lg border border-border bg-background px-3 text-base"
              />
            </div>
            <div>
              <label htmlFor="to" className="text-sm text-text-secondary">
                {t.periodTo}
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={range.toYmd ?? ""}
                className="mt-1 h-11 rounded-lg border border-border bg-background px-3 text-base"
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-pressed"
            >
              {t.periodApply}
            </button>
          </form>
          {range.fromYmd && range.toYmd ? (
            <p className="mt-2 text-sm text-text-secondary">
              {range.fromYmd} – {range.toYmd}
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">{t.periodAll}</p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label={t.ordersCount}
            value={String(totals.orderCount)}
            hint={
              totals.cancelledCount
                ? `${t.cancelledOrders}: ${totals.cancelledCount}`
                : undefined
            }
          />
          <Kpi label={t.revenueFood} value={formatEUR(totals.foodCents, locale)} />
          <Kpi label={t.giroGmv} value={formatEUR(totals.gmvCents, locale)} />
          <Kpi label={t.platformCommission} value={formatEUR(totals.commissionCents, locale)} />
        </section>
        <p className="text-xs text-text-secondary">{t.reportNote}</p>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi
            label={t.periodToday}
            value={`${today.orderCount}`}
            hint={`${formatEUR(today.foodCents, locale)} · ${formatEUR(today.commissionCents, locale)} ${t.platformCommission}`}
          />
          <Kpi
            label={t.period7d}
            value={`${week.orderCount}`}
            hint={`${formatEUR(week.foodCents, locale)} · ${formatEUR(week.commissionCents, locale)} ${t.platformCommission}`}
          />
          <Kpi
            label={t.periodMonth}
            value={`${month.orderCount}`}
            hint={`${formatEUR(month.foodCents, locale)} · ${formatEUR(month.commissionCents, locale)} ${t.platformCommission}`}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">{t.recentOrders}</h2>
          {recent.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-text-secondary">
              {t.noOrdersInPeriod}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[520px] text-left text-base">
                <thead className="border-b border-border bg-bg-muted text-sm text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t.nr}</th>
                    <th className="px-4 py-3 font-medium">{t.period}</th>
                    <th className="px-4 py-3 font-medium">{t.status}</th>
                    <th className="px-4 py-3 font-medium">{t.revenueFood}</th>
                    <th className="px-4 py-3 font-medium">{t.platformCommission}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {o.shortCode}
                        <span className="block text-sm font-normal text-text-secondary">
                          {o.customer.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatWhen(o.createdAt, locale)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} locale={locale} />
                      </td>
                      <td className="px-4 py-3">{formatEUR(o.foodSubtotalCents, locale)}</td>
                      <td className="px-4 py-3">{formatEUR(o.commissionCents, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  );
}

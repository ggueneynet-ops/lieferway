import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/money";
import Link from "next/link";
import { getCopy } from "@/lib/get-locale";
import { interpolate } from "@/lib/i18n";
import { StatusBadge } from "@/components/status-badge";
import { resolveReportRange } from "@/lib/restaurant-reports";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { t, locale } = await getCopy();
  const today = resolveReportRange("today");
  const createdToday = today.from && today.to ? { gte: today.from, lt: today.to } : undefined;

  const [
    todayOrders,
    todayAgg,
    allAgg,
    activeRestaurants,
    pendingApps,
    liveOrders,
  ] = await Promise.all([
    prisma.order.count({ where: createdToday ? { createdAt: createdToday } : {} }),
    prisma.order.aggregate({
      where: {
        status: { notIn: ["REJECTED", "CANCELLED", "PENDING_PAYMENT"] },
        ...(createdToday ? { createdAt: createdToday } : {}),
      },
      _sum: { totalCents: true, commissionCents: true },
    }),
    prisma.order.aggregate({
      where: { status: { notIn: ["REJECTED", "CANCELLED", "PENDING_PAYMENT"] } },
      _sum: { totalCents: true, commissionCents: true },
    }),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({
      where: { status: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } },
      include: { restaurant: { select: { name: true } }, customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const kpis = [
    { label: t.adminTodayOrders, value: String(todayOrders) },
    { label: t.adminGmv, value: formatEUR(todayAgg._sum.totalCents ?? 0, locale), hint: t.periodToday },
    { label: t.adminCommissionEarned, value: formatEUR(todayAgg._sum.commissionCents ?? 0, locale), hint: t.periodToday },
    { label: t.adminActiveRestaurants, value: String(activeRestaurants) },
    { label: t.adminPendingApps, value: String(pendingApps) },
    { label: `${t.adminGmv} · ${t.rpAllTime}`, value: formatEUR(allAgg._sum.totalCents ?? 0, locale) },
  ];

  return (
    <PanelShell roles={["ADMIN"]} title={t.adminDashboard}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-white p-4">
              <p className="text-sm text-text-secondary">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{k.value}</p>
              {"hint" in k && k.hint ? <p className="mt-1 text-xs text-text-secondary">{k.hint}</p> : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/applications"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
          >
            {t.partnerApplications}
            {pendingApps > 0 ? ` · ${interpolate(t.pendingCount, { count: String(pendingApps) })}` : ""}
          </Link>
          <Link href="/admin/live" className="inline-flex h-11 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium">
            {t.adminLiveOrders}
          </Link>
          <Link href="/admin/restaurants" className="inline-flex h-11 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium">
            {t.restaurants}
          </Link>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">{t.adminLiveOrders}</h2>
            <Link href="/admin/live" className="text-sm text-primary">
              {t.adminLive}
            </Link>
          </div>
          {liveOrders.length === 0 ? (
            <p className="rounded-2xl border border-border bg-white p-4 text-sm text-text-secondary">{t.nothingCooking}</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b bg-bg-muted text-text-secondary">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t.nr}</th>
                    <th className="px-4 py-2 font-medium">{t.restaurants}</th>
                    <th className="px-4 py-2 font-medium">{t.status}</th>
                    <th className="px-4 py-2 font-medium">{t.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {liveOrders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                          {o.shortCode}
                        </Link>
                        <span className="block text-xs text-text-secondary">{o.customer.name}</span>
                      </td>
                      <td className="px-4 py-3">{o.restaurant.name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} locale={locale} />
                      </td>
                      <td className="px-4 py-3">{formatEUR(o.totalCents, locale)}</td>
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

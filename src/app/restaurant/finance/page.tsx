import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { interpolate, dateLocale } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { nextPayoutMonday } from "@/lib/hours";
import { restaurantReportTotals, resolveReportRange, berlinYmd, addDaysYmd } from "@/lib/restaurant-reports";
import { isBerlinMonthOpen, recentMonthKeys } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { remainingOrderTotals } from "@/lib/stripe-money";

export const dynamic = "force-dynamic";

export default async function RestaurantFinancePage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t, locale } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpFinance}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  const next = nextPayoutMonday();
  const weekFrom = addDaysYmd(next.ymd, next.isToday ? 0 : -7);
  const [week, month, all] = await Promise.all([
    restaurantReportTotals(restaurant.id, resolveReportRange("custom", weekFrom, berlinYmd())),
    restaurantReportTotals(restaurant.id, resolveReportRange("month")),
    restaurantReportTotals(restaurant.id, resolveReportRange("all")),
  ]);
  const mondayLabel = new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(next.date);
  const percent = restaurant.commissionPercent;
  const months = recentMonthKeys(4);
  const [paidOrders, payouts] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: { notIn: ["PENDING_PAYMENT", "CANCELLED", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.payout.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { weekStart: "desc" },
      take: 12,
    }),
  ]);
  const pendingNet = paidOrders
    .filter((o) => o.paymentMethod !== "CASH" && (o.payoutStatus === "PENDING" || o.payoutStatus === "UNPAID"))
    .reduce((s, o) => s + remainingOrderTotals(o).remainingRestaurantNetCents, 0);
  const paidOutNet = paidOrders
    .filter((o) => o.payoutStatus === "PAID")
    .reduce((s, o) => s + remainingOrderTotals(o).remainingRestaurantNetCents, 0);

  function Block({
    title,
    food,
    commission,
  }: {
    title: string;
    food: number;
    commission: number;
  }) {
    const payout = food - commission;
    return (
      <section className="rounded-[20px] border border-[#E8E8EC] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{title}</h2>
        <p className="mt-3 font-display text-[1.85rem] font-semibold tabular-nums tracking-tight text-[#E91E63]">
          {formatEUR(payout, locale)}
        </p>
        <p className="mt-1 text-sm font-medium text-[#0F172A]">{t.rpPayoutToRestaurant}</p>
        <dl className="mt-4 space-y-2 text-[14px]">
          <div className="flex justify-between gap-3 text-[#64748B]">
            <dt>{t.revenueFood}</dt>
            <dd className="tabular-nums text-[#0F172A]">{formatEUR(food, locale)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-[#64748B]">
            <dt>{interpolate(t.rpLieferwayProvision, { percent: String(percent) })}</dt>
            <dd className="tabular-nums">−{formatEUR(commission, locale)}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <RestaurantAppShell title={t.rpFinance} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-1 font-display text-xl font-semibold tracking-tight">{t.rpFinance}</h1>
      <p className="mb-4 text-sm text-[#6B7280]">{t.rpFinanceHint}</p>
      <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#111827]">
        {t.eInvoiceComing}
        <span className="mt-1 block text-[#6B7280]">{t.eInvoiceComingHint}</span>
      </p>
      <section className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#111827]">{t.commissionInvoice}</h2>
        <p className="mt-1 text-sm text-[#6B7280]">{t.commissionInvoiceHint}</p>
        <ul className="mt-3 space-y-2">
          {months.map((key) => {
            const open = isBerlinMonthOpen(key);
            return (
              <li key={key} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium text-[#111827]">{key}</span>
                  <span className="mt-0.5 block text-[#6B7280]">
                    {open ? t.commissionInvoiceDraft : t.commissionInvoice}
                  </span>
                </span>
                <a
                  href={`/api/invoices/commission?month=${key}`}
                  className="inline-flex h-11 shrink-0 items-center rounded-xl bg-[#E91E63] px-4 text-sm font-semibold text-white hover:bg-[#C2185B]"
                >
                  {t.downloadPdf}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="mb-4 rounded-2xl border border-[#F8BBD0] bg-[#FCE4EC]/70 px-4 py-3 text-sm">
        <span className="font-semibold text-[#111827]">{t.rpNextPayout}: </span>
        {next.isToday ? t.rpPayoutMonday : mondayLabel}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Block title={t.rpThisWeek} food={week.foodCents} commission={week.commissionCents} />
        <Block title={t.rpThisMonth} food={month.foodCents} commission={month.commissionCents} />
        <Block title={t.rpAllTime} food={all.foodCents} commission={all.commissionCents} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section className="rounded-[20px] border border-[#E8E8EC] bg-white p-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{t.financePending}</h2>
          <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-[#0F172A]">
            {formatEUR(pendingNet, locale)}
          </p>
        </section>
        <section className="rounded-[20px] border border-[#E8E8EC] bg-white p-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{t.financePaidOut}</h2>
          <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-[#0F172A]">
            {formatEUR(paidOutNet, locale)}
          </p>
        </section>
      </div>
      <section className="mt-4 overflow-x-auto rounded-[20px] border border-[#E8E8EC] bg-white">
        <h2 className="px-5 pt-4 text-sm font-semibold">{t.financePayments}</h2>
        {paidOrders.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[#6B7280]">{t.noOrders}</p>
        ) : (
          <table className="mt-2 w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-[#F3F4F6] text-[#64748B]">
              <tr>
                <th className="px-5 py-2 font-medium">{t.nr}</th>
                <th className="px-3 py-2 font-medium">{t.financeGross}</th>
                <th className="px-3 py-2 font-medium">{t.wpDiscountLine}</th>
                <th className="px-3 py-2 font-medium">{t.platformNetCommission}</th>
                <th className="px-3 py-2 font-medium">{t.stripeFee}</th>
                <th className="px-3 py-2 font-medium">{t.restaurantNet}</th>
                <th className="px-5 py-2 font-medium">{t.payoutStatus}</th>
              </tr>
            </thead>
            <tbody>
              {paidOrders.map((o) => {
                const left = remainingOrderTotals(o);
                return (
                  <tr key={o.id} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="px-5 py-3 font-medium">{o.shortCode}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(o.totalCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {o.wayPointsDiscountCents > 0 ? (
                        <span>
                          −{formatEUR(o.wayPointsDiscountCents, locale)}
                          <span className="mt-0.5 block text-[11px] text-[#64748B]">
                            {o.wayPointsFundedBy === "LIEFERWAY"
                              ? t.wpFundLieferway
                              : o.wayPointsFundedBy === "SHARED"
                                ? t.wpFundShared
                                : t.wpFundRestaurant}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(o.platformNetCommissionCents || left.remainingCommissionCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(o.stripeFeeActualCents || o.stripeFeeCents || left.remainingStripeFeeCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(o.restaurantTransferCents || left.remainingRestaurantNetCents, locale)}</td>
                    <td className="px-5 py-3 text-[#64748B]">
                      {o.payoutStatus === "PAID"
                        ? t.payoutPaid
                        : o.payoutStatus === "FAILED"
                          ? t.payoutFailed
                          : o.payoutStatus === "PENDING" || o.payoutStatus === "UNPAID"
                            ? t.payoutPending
                            : t.payoutNone}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <section className="mt-4 rounded-[20px] border border-[#E8E8EC] bg-white p-5">
        <h2 className="text-sm font-semibold">{t.financePayoutHistory}</h2>
        {payouts.length === 0 ? (
          <p className="mt-2 text-sm text-[#6B7280]">{t.noOrders}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span>
                  {p.weekStart.toISOString().slice(0, 10)}
                  <span className="ml-2 text-[#64748B]">
                    {p.status === "PAID" ? t.payoutPaid : p.status === "FAILED" ? t.payoutFailed : t.payoutPending}
                  </span>
                </span>
                <span className="tabular-nums font-medium">{formatEUR(p.netPayoutCents, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </RestaurantAppShell>
  );
}

import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { SettlementBreakdown } from "@/components/settlement-breakdown";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { dateLocale } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { nextPayoutMonday } from "@/lib/hours";
import {
  parseReportPreset,
  resolveReportRange,
  berlinYmd,
  addDaysYmd,
} from "@/lib/restaurant-reports";
import { isBerlinMonthOpen, recentMonthKeys } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { remainingOrderTotals } from "@/lib/stripe-money";
import {
  bucketOrdersByWeek,
  loadSettlementOrders,
  parseWeekStartParam,
  summarizeOrders,
  toYmdBerlin,
  weekEnd,
} from "@/lib/payouts";

export const dynamic = "force-dynamic";

export default async function RestaurantFinancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { restaurant } = await requireOwnedRestaurant();
  const { t, locale } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpFinance}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  const params = (await searchParams) ?? {};
  const raw = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const week = parseWeekStartParam(raw("week"));
  const preset = parseReportPreset(raw("preset") ?? (week ? "custom" : "7d"));
  const range = week
    ? {
        from: week,
        to: new Date(weekEnd(week).getTime() + 1),
        fromYmd: toYmdBerlin(week),
        toYmd: toYmdBerlin(weekEnd(week)),
      }
    : resolveReportRange(preset, raw("from"), raw("to"));

  const next = nextPayoutMonday();
  const weekFrom = addDaysYmd(next.ymd, next.isToday ? 0 : -7);
  const thisWeekRange = resolveReportRange("custom", weekFrom, berlinYmd());
  const monthRange = resolveReportRange("month");
  const allRange = resolveReportRange("all");

  const [periodOrders, weekOrders, monthOrders, allOrders, paidOrders, payouts] = await Promise.all([
    loadSettlementOrders({ restaurantId: restaurant.id, from: range.from, to: range.to }),
    loadSettlementOrders({ restaurantId: restaurant.id, from: thisWeekRange.from, to: thisWeekRange.to }),
    loadSettlementOrders({ restaurantId: restaurant.id, from: monthRange.from, to: monthRange.to }),
    loadSettlementOrders({ restaurantId: restaurant.id, from: allRange.from, to: allRange.to }),
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

  const periodTotals = summarizeOrders(periodOrders);
  const weekTotals = summarizeOrders(weekOrders);
  const monthTotals = summarizeOrders(monthOrders);
  const allTotals = summarizeOrders(allOrders);
  const weekly = bucketOrdersByWeek(periodOrders);
  const payoutByWeek = new Map(payouts.map((p) => [p.weekStart.toISOString(), p]));

  const mondayLabel = new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(next.date);
  const percent = restaurant.commissionPercent;
  const months = recentMonthKeys(4);
  const pendingNet = paidOrders
    .filter((o) => o.paymentMethod !== "CASH" && (o.payoutStatus === "PENDING" || o.payoutStatus === "UNPAID"))
    .reduce((s, o) => s + remainingOrderTotals(o).remainingRestaurantNetCents, 0);
  const paidOutNet = paidOrders
    .filter((o) => o.payoutStatus === "PAID")
    .reduce((s, o) => s + remainingOrderTotals(o).remainingRestaurantNetCents, 0);

  const csvWeekly = `/api/restaurant/finance?format=csv&kind=weekly&preset=${encodeURIComponent(preset)}${
    range.fromYmd ? `&from=${range.fromYmd}` : ""
  }${range.toYmd ? `&to=${range.toYmd}` : ""}${week ? `&week=${toYmdBerlin(week)}` : ""}`;
  const csvOrders = csvWeekly.replace("kind=weekly", "kind=orders");

  const breakdownCopy = {
    settleGross: t.settleGross,
    revenueFood: t.revenueFood,
    rpLieferwayProvision: t.rpLieferwayProvision,
    settleRefunds: t.settleRefunds,
    settleCoupon: t.settleCoupon,
    settleWayPointsRestaurant: t.settleWayPointsRestaurant,
    settleWayPointsPlatform: t.settleWayPointsPlatform,
    settleCashCommission: t.settleCashCommission,
    settleCardPayout: t.settleCardPayout,
    settleNetPayable: t.settleNetPayable,
    settleOrders: t.settleOrders,
    settleCancelled: t.settleCancelled,
  };

  return (
    <RestaurantAppShell title={t.rpFinance} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-1 font-display text-xl font-semibold tracking-tight">{t.rpFinance}</h1>
      <p className="mb-4 text-sm text-[#6B7280]">{t.rpFinanceHint}</p>
      <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#111827]">
        {t.eInvoiceComing}
        <span className="mt-1 block text-[#6B7280]">{t.eInvoiceComingHint}</span>
      </p>
      <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#111827]">
        {t.settleTaxTodo}
        <span className="mt-1 block text-[#6B7280]">{t.settleTaxTodoHint}</span>
      </p>

      <section className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#111827]">{t.period}</h2>
        <form className="mt-3 flex flex-wrap items-end gap-2" action="/restaurant/finance" method="get">
          <label className="text-xs text-[#6B7280]">
            {t.period}
            <select
              name="preset"
              defaultValue={week ? "custom" : preset}
              className="mt-1 block h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
            >
              <option value="today">{t.periodToday}</option>
              <option value="7d">{t.period7d}</option>
              <option value="30d">{t.period30d}</option>
              <option value="month">{t.periodMonth}</option>
              <option value="all">{t.periodAll}</option>
              <option value="custom">{t.periodCustom}</option>
            </select>
          </label>
          <label className="text-xs text-[#6B7280]">
            {t.periodFrom}
            <input
              type="date"
              name="from"
              defaultValue={range.fromYmd ?? ""}
              className="mt-1 block h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
            />
          </label>
          <label className="text-xs text-[#6B7280]">
            {t.periodTo}
            <input
              type="date"
              name="to"
              defaultValue={range.toYmd ?? ""}
              className="mt-1 block h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl bg-[#E91E63] px-4 text-sm font-semibold text-white"
          >
            {t.periodApply}
          </button>
          <a
            href={csvWeekly}
            className="inline-flex h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold"
          >
            {t.settleExportCsv}
          </a>
          <a
            href={csvOrders}
            className="inline-flex h-11 items-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold"
          >
            {t.settleExportOrdersCsv}
          </a>
        </form>
        <p className="mt-3 text-xs text-[#6B7280]">
          {range.fromYmd && range.toYmd ? `${range.fromYmd} – ${range.toYmd}` : t.periodAll}
          {" · "}
          {t.settleFormulaText}
        </p>
      </section>

      <section className="mb-4 rounded-[20px] border border-[#E8E8EC] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          {t.settlePeriodSummary}
        </h2>
        <div className="mt-3">
          <SettlementBreakdown totals={periodTotals} percent={percent} locale={locale} t={breakdownCopy} />
        </div>
      </section>

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
        {[
          { title: t.rpThisWeek, totals: weekTotals },
          { title: t.rpThisMonth, totals: monthTotals },
          { title: t.rpAllTime, totals: allTotals },
        ].map((block) => (
          <section
            key={block.title}
            className="rounded-[20px] border border-[#E8E8EC] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
          >
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{block.title}</h2>
            <SettlementBreakdown totals={block.totals} percent={percent} locale={locale} t={breakdownCopy} />
          </section>
        ))}
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
          <table className="mt-2 w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-[#F3F4F6] text-[#64748B]">
              <tr>
                <th className="px-5 py-2 font-medium">{t.nr}</th>
                <th className="px-3 py-2 font-medium">{t.financeGross}</th>
                <th className="px-3 py-2 font-medium">{t.settleCoupon}</th>
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
                const couponCents = Math.max(0, o.discountCents - o.wayPointsDiscountCents);
                return (
                  <tr key={o.id} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="px-5 py-3 font-medium">{o.shortCode}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(o.totalCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {couponCents > 0 ? (
                        <span>
                          −{formatEUR(couponCents, locale)}
                          <span className="mt-0.5 block text-[11px] text-[#64748B]">{t.settleCouponHint}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
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
                    <td className="px-3 py-3 tabular-nums">
                      {formatEUR(o.platformNetCommissionCents || left.remainingCommissionCents, locale)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatEUR(o.stripeFeeActualCents || o.stripeFeeCents || left.remainingStripeFeeCents, locale)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatEUR(o.restaurantTransferCents || left.remainingRestaurantNetCents, locale)}
                    </td>
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
      <section className="mt-4 overflow-x-auto rounded-[20px] border border-[#E8E8EC] bg-white p-5">
        <h2 className="text-sm font-semibold">{t.financePayoutHistory}</h2>
        {weekly.length === 0 && payouts.length === 0 ? (
          <p className="mt-2 text-sm text-[#6B7280]">{t.noOrders}</p>
        ) : (
          <table className="mt-3 w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-[#F3F4F6] text-[#64748B]">
              <tr>
                <th className="py-2 font-medium">{t.settleWeek}</th>
                <th className="px-3 py-2 font-medium">{t.revenueFood}</th>
                <th className="px-3 py-2 font-medium">{t.platformCommission}</th>
                <th className="px-3 py-2 font-medium">{t.settleRefunds}</th>
                <th className="px-3 py-2 font-medium">{t.settleNetPayable}</th>
                <th className="px-3 py-2 font-medium">{t.payoutStatus}</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => {
                const stored = payoutByWeek.get(w.weekStart.toISOString());
                return (
                  <tr key={w.weekStart.toISOString()} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="py-3">
                      {toYmdBerlin(w.weekStart)} – {toYmdBerlin(w.weekEnd)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(w.totals.foodCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(w.totals.commissionCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEUR(w.totals.refundedCents, locale)}</td>
                    <td className="px-3 py-3 tabular-nums font-medium">
                      {formatEUR(stored?.status === "PAID" ? stored.netPayoutCents : w.totals.netPayableCents, locale)}
                    </td>
                    <td className="px-3 py-3 text-[#64748B]">
                      {(stored?.status ?? "PENDING") === "PAID"
                        ? t.payoutPaid
                        : (stored?.status ?? "PENDING") === "FAILED"
                          ? t.payoutFailed
                          : t.payoutPending}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </RestaurantAppShell>
  );
}

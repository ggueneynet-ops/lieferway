import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { interpolate, dateLocale } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { nextPayoutMonday } from "@/lib/hours";
import { restaurantReportTotals, resolveReportRange, berlinYmd, addDaysYmd } from "@/lib/restaurant-reports";
import { isBerlinMonthOpen, recentMonthKeys } from "@/lib/invoices";

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
        <p className="mt-3 font-display text-[1.85rem] font-semibold tabular-nums tracking-tight text-[#922A49]">
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
                  className="inline-flex h-11 shrink-0 items-center rounded-xl bg-[#922A49] px-4 text-sm font-semibold text-white hover:bg-[#7A2340]"
                >
                  {t.downloadPdf}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="mb-4 rounded-2xl border border-[#F8BBD0] bg-[#FAF3EA]/70 px-4 py-3 text-sm">
        <span className="font-semibold text-[#111827]">{t.rpNextPayout}: </span>
        {next.isToday ? t.rpPayoutMonday : mondayLabel}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Block title={t.rpThisWeek} food={week.foodCents} commission={week.commissionCents} />
        <Block title={t.rpThisMonth} food={month.foodCents} commission={month.commissionCents} />
        <Block title={t.rpAllTime} food={all.foodCents} commission={all.commissionCents} />
      </div>
    </RestaurantAppShell>
  );
}

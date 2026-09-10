import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { interpolate, dateLocale } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { nextPayoutMonday } from "@/lib/hours";
import { restaurantReportTotals, resolveReportRange, berlinYmd, addDaysYmd } from "@/lib/restaurant-reports";

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
  const [week, all] = await Promise.all([
    restaurantReportTotals(restaurant.id, resolveReportRange("custom", weekFrom, berlinYmd())),
    restaurantReportTotals(restaurant.id, resolveReportRange("all")),
  ]);
  const mondayLabel = new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(next.date);
  const percent = restaurant.commissionPercent;

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
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#6B7280]">{title}</h2>
        <dl className="mt-3 space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt>{t.revenueFood}</dt>
            <dd className="font-semibold">{formatEUR(food, locale)}</dd>
          </div>
          <div className="flex justify-between text-[#6B7280]">
            <dt>{interpolate(t.rpLieferwayFee, { percent: String(percent) })}</dt>
            <dd>−{formatEUR(commission, locale)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#F3F4F6] pt-2 text-base">
            <dt className="font-semibold">{t.rpPayout}</dt>
            <dd className="font-semibold">{formatEUR(payout, locale)}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <RestaurantAppShell title={t.rpFinance} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-1 text-lg font-semibold">{t.rpFinance}</h1>
      <p className="mb-4 text-sm text-[#6B7280]">{t.rpFinanceHint}</p>
      <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm">
        <span className="font-semibold text-[#111827]">{t.rpNextPayout}: </span>
        {next.isToday ? t.rpPayoutMonday : mondayLabel}
        <span className="text-[#6B7280]"> · {t.rpPayoutMonday}</span>
      </p>
      <div className="space-y-3">
        <Block title={t.rpThisWeek} food={week.foodCents} commission={week.commissionCents} />
        <Block title={t.rpAllTime} food={all.foodCents} commission={all.commissionCents} />
      </div>
    </RestaurantAppShell>
  );
}

import { formatEUR } from "@/lib/money";
import { interpolate } from "@/lib/i18n";
import type { SettlementTotals } from "@/lib/settlement";

type Copy = {
  settleGross: string;
  revenueFood: string;
  rpLieferwayProvision: string;
  settleRefunds: string;
  settleCoupon: string;
  settleWayPointsRestaurant: string;
  settleWayPointsPlatform: string;
  settleCashCommission: string;
  settleCardPayout: string;
  settleNetPayable: string;
  settleOrders: string;
  settleCancelled: string;
};

export function SettlementBreakdown({
  totals,
  percent,
  locale,
  t,
}: {
  totals: SettlementTotals;
  percent: number;
  locale: string;
  t: Copy;
}) {
  const rows: { label: string; value: number; muted?: boolean }[] = [
    { label: t.settleGross, value: totals.grossGuestCents },
    { label: t.revenueFood, value: totals.foodCents },
    { label: interpolate(t.rpLieferwayProvision, { percent: String(percent) }), value: -totals.commissionCents },
    { label: t.settleRefunds, value: -totals.refundedCents },
    { label: t.settleCoupon, value: -totals.couponDiscountCents },
    { label: t.settleWayPointsRestaurant, value: -totals.wayPointsRestaurantCents },
    { label: t.settleWayPointsPlatform, value: -totals.wayPointsLieferwayCents, muted: true },
    { label: t.settleCashCommission, value: -totals.cashCommissionDueCents },
    { label: t.settleCardPayout, value: totals.cardPayoutCents },
  ];

  return (
    <div>
      <p className="font-display text-[1.85rem] font-semibold tabular-nums tracking-tight text-[#E91E63]">
        {formatEUR(totals.netPayableCents, locale)}
      </p>
      <p className="mt-1 text-sm font-medium text-[#0F172A]">{t.settleNetPayable}</p>
      <p className="mt-1 text-xs text-[#64748B]">
        {totals.orderCount} · {t.settleOrders}
        {totals.cancelledCount > 0 ? ` · ${totals.cancelledCount} ${t.settleCancelled}` : ""}
      </p>
      <dl className="mt-4 space-y-2 text-[14px]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-[#64748B]">
            <dt className={row.muted ? "text-[#94A3B8]" : undefined}>{row.label}</dt>
            <dd className={`tabular-nums ${row.muted ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>
              {formatEUR(row.value, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

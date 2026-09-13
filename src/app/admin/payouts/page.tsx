import { PanelShell } from "@/components/panel-shell";
import { AdminPayouts } from "@/components/admin-payouts";
import { getCopy } from "@/lib/get-locale";
import { listPayoutSummaries } from "@/lib/payouts";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const { t } = await getCopy();
  const summaries = await listPayoutSummaries();
  return (
    <PanelShell roles={["ADMIN"]} title={t.navPayouts}>
      <p className="mb-3 max-w-2xl text-sm text-text-secondary">{t.payoutHint}</p>
      <p className="mb-3 max-w-2xl text-sm text-text-secondary">{t.settleFormulaText}</p>
      <p className="mb-4 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <span className="font-semibold">{t.settleTaxTodo}</span>
        <span className="mt-1 block text-[#6B7280]">{t.settleTaxTodoHint}</span>
      </p>
      <AdminPayouts
        initial={summaries}
        labels={{
          week: t.rpThisWeek,
          restaurant: t.settleRestaurant,
          food: t.revenueFood,
          commission: t.platformCommission,
          refunds: t.settleRefunds,
          coupon: t.settleCoupon,
          wpRestaurant: t.settleWayPointsRestaurant,
          wpPlatform: t.settleWayPointsPlatform,
          net: t.settleNetPayable,
          generate: t.settleGenerate,
          generated: t.settleGenerated,
          exportCsv: t.settleExportCsv,
          paid: t.payoutPaid,
          markPaid: t.settleMarkPaid,
          empty: t.settleNoRows,
          period: t.period,
        }}
      />
    </PanelShell>
  );
}

import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { AdminPayouts } from "@/components/admin-payouts";
import { getCopy } from "@/lib/get-locale";

export default async function AdminPayoutsPage() {
  const { t } = await getCopy();
  const payouts = await prisma.payout.findMany({
    include: { restaurant: { select: { name: true } } },
    orderBy: [{ weekStart: "desc" }, { restaurant: { name: "asc" } }],
  });
  return (
    <PanelShell roles={["ADMIN"]} title={t.navPayouts}>
      <p className="mb-4 max-w-xl text-sm text-text-secondary">{t.payoutHint}</p>
      <AdminPayouts initial={JSON.parse(JSON.stringify(payouts))} />
    </PanelShell>
  );
}

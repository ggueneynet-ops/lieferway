import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { AdminPayouts } from "@/components/admin-payouts";

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payout.findMany({
    include: { restaurant: { select: { name: true } } },
    orderBy: [{ weekStart: "desc" }, { restaurant: { name: "asc" } }],
  });
  return (
    <PanelShell roles={["ADMIN"]} title="Auszahlungen">
      <p className="mb-4 max-w-xl text-sm text-text-secondary">
        Jeden Montag: Speisen minus Provision. Bar-Bestellungen: Provision wird abgezogen.
      </p>
      <AdminPayouts initial={JSON.parse(JSON.stringify(payouts))} />
    </PanelShell>
  );
}

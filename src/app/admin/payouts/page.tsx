import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { AdminPayouts } from "@/components/admin-payouts";

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payout.findMany({
    include: { restaurant: { select: { name: true } } },
    orderBy: [{ weekStart: "desc" }, { restaurant: { name: "asc" } }],
  });
  return (
    <PanelShell roles={["ADMIN"]} title="Wöchentliche Auszahlungen (Montag)">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Netto = Speisen minus Provision bei Karten-/Wallet-Zahlungen, abzüglich offener
        Bar-Provision. Liefergebühr ist nicht Teil der Restaurant-Auszahlung.
      </p>
      <AdminPayouts initial={JSON.parse(JSON.stringify(payouts))} />
    </PanelShell>
  );
}

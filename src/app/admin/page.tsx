import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/money";
import { DEFAULT_COMMISSION_PERCENT } from "@/lib/constants";

export default async function AdminHome() {
  const [users, restaurants, orders, delivered] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: {
        foodSubtotalCents: true,
        commissionCents: true,
        deliveryFeeCents: true,
        totalCents: true,
      },
    }),
  ]);

  const cards = [
    { label: "Nutzer", value: String(users) },
    { label: "Restaurants", value: String(restaurants) },
    { label: "Bestellungen", value: String(orders) },
    { label: "Standard-Provision", value: `${DEFAULT_COMMISSION_PERCENT} %` },
    { label: "Speisen (geliefert)", value: formatEUR(delivered._sum.foodSubtotalCents ?? 0) },
    { label: "Provision", value: formatEUR(delivered._sum.commissionCents ?? 0) },
    { label: "Liefergebühren", value: formatEUR(delivered._sum.deliveryFeeCents ?? 0) },
    { label: "GMV", value: formatEUR(delivered._sum.totalCents ?? 0) },
  ];

  return (
    <PanelShell roles={["ADMIN"]} title="Admin · Lieferway">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
        Kunden zahlen an die Plattform (Stripe-Mock). Restaurants erhalten wöchentlich montags
        Speisen minus Provision. Liefergebühr bleibt bei Lieferway. Bar-Bestellungen: Provision
        separat im Ledger.
      </p>
    </PanelShell>
  );
}

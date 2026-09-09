import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      restaurant: { select: { name: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <PanelShell roles={["ADMIN"]} title="Bestellungen">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-base">
          <thead className="border-b border-border bg-bg-muted text-sm text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Nr.</th>
              <th className="px-4 py-3 font-medium">Restaurant</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-4 font-medium">{o.shortCode}</td>
                <td className="px-4 py-4">
                  {o.restaurant.name}
                  <span className="block text-sm text-text-secondary">{o.customer.name}</span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-4">{formatEUR(o.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

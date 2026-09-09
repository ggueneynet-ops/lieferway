import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { AdminAssign } from "@/components/admin-assign";

export default async function AdminOrdersPage() {
  const [orders, couriers] = await Promise.all([
    prisma.order.findMany({
      include: {
        restaurant: { select: { name: true } },
        customer: { select: { name: true } },
        courier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.user.findMany({ where: { role: "COURIER" }, select: { id: true, name: true } }),
  ]);

  return (
    <PanelShell roles={["ADMIN"]} title="Bestellungen">
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Kunde</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Zahlung</th>
              <th className="px-4 py-3">Summe</th>
              <th className="px-4 py-3">Provision</th>
              <th className="px-4 py-3">Kurier</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{o.shortCode}</td>
                <td className="px-4 py-3">{o.restaurant.name}</td>
                <td className="px-4 py-3">{o.customer.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3">
                  {o.paymentMethod}
                  <br />
                  <span className="text-xs text-muted-foreground">{o.paymentStatus}</span>
                </td>
                <td className="px-4 py-3">{formatEUR(o.totalCents)}</td>
                <td className="px-4 py-3">
                  {o.commissionPercent}% · {formatEUR(o.commissionCents)}
                </td>
                <td className="px-4 py-3">
                  <AdminAssign
                    orderId={o.id}
                    current={o.courierId}
                    couriers={couriers}
                    label={o.courier?.name}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

import Link from "next/link";
import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { getCopy } from "@/lib/get-locale";

export default async function AdminOrdersPage() {
  const { t, locale } = await getCopy();
  const orders = await prisma.order.findMany({
    include: {
      restaurant: { select: { name: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <PanelShell roles={["ADMIN"]} title={t.orders}>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-base">
          <thead className="border-b border-border bg-bg-muted text-sm text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">{t.nr}</th>
              <th className="px-4 py-3 font-medium">{t.restaurants}</th>
              <th className="px-4 py-3 font-medium">{t.status}</th>
              <th className="px-4 py-3 font-medium">{t.financeGross}</th>
              <th className="px-4 py-3 font-medium">{t.platformNetCommission}</th>
              <th className="px-4 py-3 font-medium">{t.stripeFee}</th>
              <th className="px-4 py-3 font-medium">{t.restaurantNet}</th>
              <th className="px-4 py-3 font-medium">{t.paymentStatus}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-4 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    {o.shortCode}
                  </Link>
                </td>
                <td className="px-4 py-4">
                  {o.restaurant.name}
                  <span className="block text-sm text-text-secondary">{o.customer.name}</span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={o.status} locale={locale} />
                </td>
                <td className="px-4 py-4">{formatEUR(o.totalCents, locale)}</td>
                <td className="px-4 py-4">{formatEUR(o.platformNetCommissionCents || o.commissionCents, locale)}</td>
                <td className="px-4 py-4">{formatEUR(o.stripeFeeActualCents || o.stripeFeeCents, locale)}</td>
                <td className="px-4 py-4">{formatEUR(o.restaurantTransferCents || o.restaurantNetCents || o.restaurantPayoutCents, locale)}</td>
                <td className="px-4 py-4 text-sm text-text-secondary">{o.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

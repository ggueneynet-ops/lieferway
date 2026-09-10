import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { getCopy } from "@/lib/get-locale";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const { t, locale } = await getCopy();
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } },
    include: {
      restaurant: { select: { name: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <PanelShell roles={["ADMIN"]} title={t.adminLiveOrders}>
      {orders.length === 0 ? (
        <p className="rounded-2xl border bg-white p-6 text-sm text-text-secondary">{t.nothingCooking}</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="block rounded-2xl border border-border bg-white p-4 hover:bg-bg-muted"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {o.shortCode} · {o.restaurant.name}
                </p>
                <StatusBadge status={o.status} locale={locale} />
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {o.customer.name}
                {o.customer.phone ? ` · ${o.customer.phone}` : ""} · {formatEUR(o.totalCents, locale)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

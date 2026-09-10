import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { getCopy } from "@/lib/get-locale";
import { formatBerlinDateTime } from "@/lib/datetime";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, locale } = await getCopy();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      restaurant: { select: { id: true, name: true } },
      customer: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!order) notFound();
  const when = formatBerlinDateTime(order.createdAt, locale);

  return (
    <PanelShell roles={["ADMIN"]} title={`${t.orders} ${order.shortCode}`}>
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/admin/orders" className="text-sm text-primary hover:underline">
          ← {t.orders}
        </Link>
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{order.shortCode}</p>
            <StatusBadge status={order.status} locale={locale} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">{when}</p>
          <p className="mt-3 text-sm">
            <Link href={`/admin/restaurants/${order.restaurant.id}`} className="font-medium hover:underline">
              {order.restaurant.name}
            </Link>
          </p>
          <p className="mt-2 text-sm">
            {order.customer.name}
            <span className="block text-text-secondary">
              {order.customer.email}
              {order.customer.phone ? ` · ${order.customer.phone}` : ""}
            </span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {order.street}, {order.postalCode} {order.city}
          </p>
          <ul className="mt-3 text-sm">
            {order.items.map((i) => (
              <li key={i.id}>
                {i.quantity}× {i.name} · {formatEUR(i.priceCents * i.quantity, locale)}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-semibold">{formatEUR(order.totalCents, locale)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">{t.adminRefunds}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.adminRefundsStub}</p>
          <button type="button" disabled className="mt-3 h-11 rounded-xl border border-border px-4 text-sm text-text-secondary">
            {t.adminRefunds}
          </button>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">{t.adminComplaints}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.adminComplaintsStub}</p>
        </div>
      </div>
    </PanelShell>
  );
}

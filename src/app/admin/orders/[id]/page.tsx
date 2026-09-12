import { PanelShell } from "@/components/panel-shell";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { getCopy } from "@/lib/get-locale";
import { formatBerlinDateTime } from "@/lib/datetime";
import Link from "next/link";
import { AdminRefundForm } from "@/components/admin-refund-form";
import { remainingOrderTotals } from "@/lib/stripe-money";

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
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();
  const when = formatBerlinDateTime(order.createdAt, locale);
  const remaining = remainingOrderTotals(order);
  const payoutLabel =
    order.payoutStatus === "PAID"
      ? t.payoutPaid
      : order.payoutStatus === "FAILED"
        ? t.payoutFailed
        : order.payoutStatus === "PENDING"
          ? t.payoutPending
          : t.payoutNone;
  const payLabel =
    order.paymentStatus === "PAID"
      ? t.paid
      : order.paymentStatus === "REFUNDED"
        ? t.payRefunded
        : order.paymentStatus === "PARTIALLY_REFUNDED"
          ? t.payPartiallyRefunded
          : order.paymentStatus === "DISPUTED"
            ? t.payDisputed
            : order.paymentStatus === "FAILED"
              ? t.payFailed
              : order.paymentStatus === "CASH_ON_DELIVERY"
                ? t.cashOnDelivery
                : t.waitingForPayment;

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
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.financeGross}</dt>
              <dd className="tabular-nums">{formatEUR(order.totalCents, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.financeCommission}</dt>
              <dd className="tabular-nums">{formatEUR(order.commissionCents, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.stripeFee}</dt>
              <dd className="tabular-nums">{formatEUR(order.stripeFeeCents, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.restaurantNet}</dt>
              <dd className="tabular-nums font-medium">{formatEUR(order.restaurantNetCents || order.restaurantPayoutCents, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.paymentStatus}</dt>
              <dd>{payLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t.payoutStatus}</dt>
              <dd>{payoutLabel}</dd>
            </div>
            {order.refundedCents > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">{t.adminRefunds}</dt>
                <dd className="tabular-nums">−{formatEUR(order.refundedCents, locale)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">{t.adminRefunds}</h2>
          <AdminRefundForm
            orderId={order.id}
            remainingCents={remaining.remainingTotalCents}
            paymentMethod={order.paymentMethod}
          />
          {order.refunds.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-text-secondary">
              {order.refunds.map((r) => (
                <li key={r.id}>
                  {formatEUR(r.amountCents, locale)} · {r.status}
                  {r.reason ? ` · ${r.reason}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">{t.adminComplaints}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t.adminComplaintsStub}</p>
        </div>
      </div>
    </PanelShell>
  );
}

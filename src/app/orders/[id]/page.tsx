import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrderTracker } from "@/components/order-timeline";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { OrderPoller } from "@/components/order-poller";
import { getCopy } from "@/lib/get-locale";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const { t, locale } = await getCopy();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      restaurant: true,
    },
  });
  if (!order) notFound();
  if (session.role === "CUSTOMER" && order.customerId !== session.id) redirect("/orders");

  const payLabel =
    order.paymentMethod === "CASH"
      ? t.payCash
      : order.paymentMethod === "APPLE_PAY"
        ? t.payApple
        : order.paymentMethod === "GOOGLE_PAY"
          ? t.payGoogle
          : t.payCard;
  const payStatus =
    order.paymentStatus === "PAID"
      ? t.paid
      : order.paymentStatus === "CASH_ON_DELIVERY"
        ? t.cashOnDelivery
        : t.processing;

  return (
    <>
      <SiteHeader />
      <OrderPoller id={order.id} />
      <main className="lw-flow-enter mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm text-muted-foreground">{order.shortCode}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{order.restaurant.name}</h1>
            <StatusBadge status={order.status} locale={locale} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.street}, {order.postalCode} {order.city}
          </p>
          <p className="mt-4 rounded-2xl border border-primary/15 bg-primary-soft/50 px-4 py-3 text-sm leading-relaxed text-ink">
            {t.restaurantDelivers} {t.restaurantDeliversHint}
          </p>
          <div className="mt-6 rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
            <h2 className="mb-5 font-display font-semibold tracking-tight">{t.status}</h2>
            <OrderTracker orderId={order.id} initialStatus={order.status} locale={locale} />
          </div>
          <ul className="mt-6 divide-y divide-border/80 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between p-4 text-sm">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span>{formatEUR(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-white p-6 text-sm shadow-sm">
          <h2 className="font-display font-semibold tracking-tight">{t.payToPlatform}</h2>
          <p>
            {payLabel} · {payStatus}
          </p>
          <p className="flex justify-between">
            <span>{t.subtotal}</span>
            <span>{formatEUR(order.foodSubtotalCents)}</span>
          </p>
          {order.discountCents > 0 && (
            <p className="flex justify-between text-emerald-700">
              <span>
                {t.discount} {order.couponCode}
              </span>
              <span>−{formatEUR(order.discountCents)}</span>
            </p>
          )}
          <p className="flex justify-between text-muted-foreground">
            <span>{t.fee}</span>
            <span>{formatEUR(order.deliveryFeeCents)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>{t.total}</span>
            <span>{formatEUR(order.totalCents)}</span>
          </p>
        </aside>
      </main>
      <SiteFooter />
    </>
  );
}

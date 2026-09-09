import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrderTimeline } from "@/components/order-timeline";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { OrderPoller } from "@/components/order-poller";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      restaurant: true,
      courier: { select: { name: true, phone: true } },
    },
  });
  if (!order) notFound();
  if (session.role === "CUSTOMER" && order.customerId !== session.id) redirect("/orders");

  return (
    <>
      <SiteHeader />
      <OrderPoller id={order.id} />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm text-muted-foreground">{order.shortCode}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.restaurant.name}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.street}, {order.postalCode} {order.city}
          </p>
          <div className="mt-8 rounded-2xl border bg-white p-6">
            <h2 className="mb-4 font-semibold">Status</h2>
            <OrderTimeline status={order.status} />
          </div>
          <ul className="mt-6 divide-y rounded-2xl border bg-white">
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
        <aside className="h-fit space-y-4 rounded-2xl border bg-white p-5 text-sm">
          <h2 className="font-semibold">Zahlung</h2>
          <p>
            {order.paymentMethod === "CASH"
              ? "Bar bei Lieferung"
              : order.paymentMethod === "APPLE_PAY"
                ? "Apple Pay"
                : order.paymentMethod === "GOOGLE_PAY"
                  ? "Google Pay"
                  : "Kreditkarte"}{" "}
            · {order.paymentStatus === "PAID" ? "bezahlt" : order.paymentStatus === "CASH_ON_DELIVERY" ? "offen (Bar)" : "ausstehend"}
          </p>
          {order.stripePaymentIntentId && (
            <p className="break-all text-xs text-muted-foreground">{order.stripePaymentIntentId}</p>
          )}
          <p className="flex justify-between">
            <span>Speisen</span>
            <span>{formatEUR(order.foodSubtotalCents)}</span>
          </p>
          {order.discountCents > 0 && (
            <p className="flex justify-between text-emerald-700">
              <span>Rabatt {order.couponCode}</span>
              <span>−{formatEUR(order.discountCents)}</span>
            </p>
          )}
          <p className="flex justify-between text-muted-foreground">
            <span>Lieferung</span>
            <span>{formatEUR(order.deliveryFeeCents)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Gesamt</span>
            <span>{formatEUR(order.totalCents)}</span>
          </p>
          {order.courier && (
            <p className="border-t pt-3">
              Kurier: {order.courier.name}
              {order.courier.phone ? ` · ${order.courier.phone}` : ""}
            </p>
          )}
        </aside>
      </main>
      <SiteFooter />
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrderTracker } from "@/components/order-timeline";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { OrderPoller } from "@/components/order-poller";
import { ReviewForm } from "@/components/review-form";
import { getCopy } from "@/lib/get-locale";
import { interpolate } from "@/lib/i18n";
import { isPickup } from "@/lib/fulfillment";
import { Check } from "lucide-react";
import Link from "next/link";
import { OrderPayPanel } from "@/components/order-pay-panel";

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
      review: true,
    },
  });
  if (!order) notFound();
  if (session.role === "CUSTOMER" && order.customerId !== session.id) redirect("/orders");

  await prisma.customerNotice.updateMany({
    where: { orderId: order.id, userId: session.id, readAt: null },
    data: { readAt: new Date() },
  });
  const latestNotice = await prisma.customerNotice.findFirst({
    where: { orderId: order.id, userId: session.id },
    orderBy: { createdAt: "desc" },
  });

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
        ? isPickup(order.fulfillmentType)
          ? t.cashOnPickup
          : t.cashOnDelivery
        : order.paymentStatus === "REFUNDED"
          ? t.payRefunded
          : order.paymentStatus === "PARTIALLY_REFUNDED"
            ? t.payPartiallyRefunded
            : order.paymentStatus === "DISPUTED"
              ? t.payDisputed
              : order.paymentStatus === "FAILED"
                ? t.payFailed
                : order.status === "PENDING_PAYMENT"
                  ? t.waitingForPayment
                  : t.processing;

  return (
    <>
      <SiteHeader chrome="app" />
      <OrderPoller id={order.id} />
      <main className="lw-flow-enter mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          {order.status === "PENDING_PAYMENT" ? (
            <div className="mb-8 rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-[#0F172A]">
                {t.waitingForPayment}
              </h1>
              <p className="mt-2 text-sm text-[#64748B]">{t.payAwaiting}</p>
              <p className="mt-1 text-[13px] font-medium text-[#0F172A]">{order.shortCode}</p>
              <OrderPayPanel orderId={order.id} />
            </div>
          ) : null}
          {order.status === "PLACED" || order.status === "PREPARING" ? (
            <div className="mb-8 rounded-[24px] border border-[#E8E8EC] bg-white px-6 py-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E91E63] text-white">
                <Check className="size-8" strokeWidth={2.4} />
              </span>
              <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-[#0F172A]">
                {t.orderConfirmedTitle}
              </h1>
              <p className="mt-2 text-sm text-[#64748B]">{t.orderConfirmedLead}</p>
              <p className="mt-1 text-[13px] font-medium text-[#0F172A]">{order.shortCode}</p>
              <Link href="/" className="mt-5 inline-flex text-sm font-semibold text-[#E91E63]">
                {t.discoverRestaurants}
              </Link>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">{order.shortCode}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{order.restaurant.name}</h1>
            <StatusBadge status={order.status} locale={locale} fulfillmentType={order.fulfillmentType} />
          </div>
          {latestNotice ? (
            <p className="mt-4 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{latestNotice.title}</span>
              <span className="mt-1 block">{latestNotice.body}</span>
              {latestNotice.emailSent ? (
                <span className="mt-1 block text-[#6B7280]">
                  {interpolate(
                    latestNotice.emailChannel && latestNotice.emailChannel !== "demo"
                      ? t.orderNoticeEmailSent
                      : t.orderNoticeEmailDemo,
                    { email: latestNotice.emailTo },
                  )}
                </span>
              ) : null}
            </p>
          ) : null}
          {order.status !== "PENDING_PAYMENT" ? (
            <>
          <a
            href={`/api/orders/${order.id}/invoice`}
            className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
          >
            {t.invoiceDownload}
          </a>
          <p className="mt-2 text-xs text-[#6B7280]">{t.invoiceNotBon}</p>
            </>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            {isPickup(order.fulfillmentType)
              ? `${t.pickupAtCounter} · ${order.restaurant.address}, ${order.restaurant.postalCode} ${order.restaurant.city}`
              : `${order.street}, ${order.postalCode} ${order.city}`}
          </p>
          <p className="mt-4 rounded-2xl border border-primary/15 bg-primary-soft/50 px-4 py-3 text-sm leading-relaxed text-ink">
            {isPickup(order.fulfillmentType)
              ? t.pickupHint
              : `${t.restaurantDelivers} ${t.restaurantDeliversHint}`}
          </p>
          <div className="mt-6 rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.04)] sm:p-6">
            <h2 className="mb-5 font-display font-semibold tracking-tight">{t.status}</h2>
            <OrderTracker
              orderId={order.id}
              initialStatus={order.status}
              locale={locale}
              shortCode={order.shortCode}
              restaurantName={order.restaurant.name}
              fulfillmentType={order.fulfillmentType}
            />
          </div>
          {order.status === "DELIVERED" && !order.review ? (
            <div className="mt-6">
              <ReviewForm orderId={order.id} />
            </div>
          ) : null}
          {order.review ? (
            <p className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#6B7280]">
              {t.reviewAlready} · {order.review.rating}/5
              {order.review.comment ? ` — ${order.review.comment}` : ""}
            </p>
          ) : null}
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
            <span>{isPickup(order.fulfillmentType) ? t.fulfillmentPickup : t.fee}</span>
            <span>{formatEUR(order.deliveryFeeCents)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>{t.total}</span>
            <span>{formatEUR(order.totalCents)}</span>
          </p>
        </aside>
      </main>
      <SiteFooter compact />
    </>
  );
}

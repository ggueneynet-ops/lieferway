import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";
import { restaurantPhoto } from "@/lib/media";
import { getCopy } from "@/lib/get-locale";
import { formatBerlinDateTime } from "@/lib/datetime";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/orders");
  const { t, locale } = await getCopy();

  const orders = await prisma.order.findMany({
    where: session.role === "ADMIN" ? {} : { customerId: session.id },
    include: {
      restaurant: { select: { name: true, slug: true, imageUrl: true, cuisine: true } },
      review: { select: { id: true, rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const notices = await prisma.customerNotice.findMany({
    where: { userId: session.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <>
      <SiteHeader chrome="app" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">{t.orders}</h1>
        {notices.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-ink">{t.yourUpdates}</p>
            <ul className="space-y-2">
            {notices.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/orders/${n.orderId}`}
                  className="block rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3"
                >
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="mt-0.5 text-sm text-[#6B7280]">{n.body}</p>
                </Link>
              </li>
            ))}
            </ul>
          </div>
        ) : null}
        {orders.length === 0 ? (
          <p className="mt-6 rounded-2xl border bg-white p-8 text-center text-muted-foreground">
            {t.noOrders}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex gap-3 rounded-2xl border bg-white p-3 transition hover:shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={restaurantPhoto(o.restaurant.imageUrl, o.restaurant.cuisine, o.restaurant.slug)}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{o.restaurant.name}</p>
                      <StatusBadge status={o.status} locale={locale} fulfillmentType={o.fulfillmentType} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {o.shortCode} · {formatEUR(o.totalCents, locale)} ·{" "}
                      {formatBerlinDateTime(o.createdAt, locale)}
                      {o.fulfillmentType === "PICKUP" ? ` · ${t.fulfillmentPickup}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary">{t.invoiceDoc}</p>
                    {o.status === "DELIVERED" && !o.review ? (
                      <p className="mt-1 text-sm font-medium text-primary">{t.leaveReview}</p>
                    ) : null}
                    {o.review ? (
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {t.reviewAlready} · {o.review.rating}/5
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}

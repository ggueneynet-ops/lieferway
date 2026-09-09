import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/status-badge";
import { formatEUR } from "@/lib/money";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/orders");

  const orders = await prisma.order.findMany({
    where: session.role === "ADMIN" ? {} : { customerId: session.id },
    include: { restaurant: { select: { name: true, slug: true, imageUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Bestellungen</h1>
        {orders.length === 0 ? (
          <p className="mt-6 rounded-2xl border bg-white p-8 text-center text-muted-foreground">
            Noch keine Bestellungen.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex gap-4 rounded-2xl border bg-white p-4 transition hover:shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.restaurant.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{o.restaurant.name}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {o.shortCode} · {formatEUR(o.totalCents)} ·{" "}
                      {new Date(o.createdAt).toLocaleString("de-DE")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

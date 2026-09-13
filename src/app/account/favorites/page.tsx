import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { restaurantCardCopy, RestaurantCard } from "@/components/restaurant-card";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";
import { listedDeliveryFeeCents } from "@/lib/delivery-fee";

export const dynamic = "force-dynamic";

export default async function AccountFavoritesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account/favorites");
  const { t } = await getCopy();
  const cardCopy = restaurantCardCopy(t);

  const rows = await prisma.favoriteRestaurant.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    include: { restaurant: true },
  });
  const restaurants = rows
    .map((r) => r.restaurant)
    .filter((r) => r.isActive)
    .map((r) => ({ ...r, deliveryFeeCents: listedDeliveryFeeCents(r) }));

  return (
    <>
      <SiteHeader chrome="app" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t.favTitle}</h1>
          <Link href="/account" className="text-sm font-semibold text-[#E91E63]">
            {t.account}
          </Link>
        </div>
        {restaurants.length === 0 ? (
          <p className="rounded-2xl border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            {t.favEmpty}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {restaurants.map((r) => (
              <RestaurantCard key={r.id} r={r} {...cardCopy} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter compact />
    </>
  );
}

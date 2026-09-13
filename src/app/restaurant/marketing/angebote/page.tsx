import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantOffersPanel } from "@/components/restaurant-offers-panel";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RestaurantAngebotePage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.offerTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const offers = await prisma.restaurantOffer.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <RestaurantAppShell title={t.offerTitle} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantOffersPanel initial={JSON.parse(JSON.stringify(offers))} />
    </RestaurantAppShell>
  );
}

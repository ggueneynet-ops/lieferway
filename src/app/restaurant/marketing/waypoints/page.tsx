import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantWayPointsPanel } from "@/components/restaurant-waypoints-panel";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RestaurantWayPointsPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.wpMarketingTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const [rewards, menuItems] = await Promise.all([
    prisma.wayPointsReward.findMany({
      where: { restaurantId: restaurant.id },
      include: { freeMenuItem: { select: { id: true, name: true, priceCents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      select: { id: true, name: true, priceCents: true, isAvailable: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <RestaurantAppShell title={t.wpMarketingTitle} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantWayPointsPanel
        enabled={restaurant.wayPointsEnabled}
        locked={restaurant.wayPointsDisabledByAdmin}
        rewards={JSON.parse(JSON.stringify(rewards))}
        menuItems={menuItems}
      />
    </RestaurantAppShell>
  );
}

import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantOrders } from "@/components/restaurant-orders";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { serializeKitchenOrder } from "@/lib/restaurant-live";
import { prisma } from "@/lib/prisma";
import { getCopy } from "@/lib/get-locale";

export const dynamic = "force-dynamic";

export default async function RestaurantHome() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.restaurantPanel}>
        <p className="rounded-2xl bg-white p-4 text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }
  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    include: { items: true, customer: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <RestaurantAppShell title={`${restaurant.name} · ${t.restaurantOrders}`} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantOrders
        initial={orders.map(serializeKitchenOrder)}
        isOpen={restaurant.isOpen}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
    </RestaurantAppShell>
  );
}

import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantOrders } from "@/components/restaurant-orders";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { loadKitchenSnapshot } from "@/lib/restaurant-live";
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
  const snapshot = await loadKitchenSnapshot(restaurant.id);

  return (
    <RestaurantAppShell title={`${restaurant.name} · ${t.restaurantOrders}`} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantOrders
        initial={snapshot?.orders ?? []}
        isOpen={restaurant.isOpen}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
    </RestaurantAppShell>
  );
}

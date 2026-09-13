import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantOrders } from "@/components/restaurant-orders";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { loadKitchenSnapshot, type KitchenSnapshot } from "@/lib/restaurant-live";
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

  let snapshot: KitchenSnapshot | null = null;
  let loadError = false;
  try {
    snapshot = await loadKitchenSnapshot(restaurant.id);
    loadError = Boolean(snapshot?.error);
  } catch (error) {
    console.error("[restaurant] loadKitchenSnapshot failed", error);
    snapshot = null;
    loadError = true;
  }

  return (
    <RestaurantAppShell title={`${restaurant.name} · ${t.restaurantOrders}`} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      {loadError ? (
        <div
          className="mb-3 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {t.kitchenLoadError}
        </div>
      ) : null}
      <RestaurantOrders
        initial={snapshot?.orders ?? []}
        isOpen={restaurant.isOpen}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
    </RestaurantAppShell>
  );
}

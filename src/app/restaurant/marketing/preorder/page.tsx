import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantPreorderPanel } from "@/components/restaurant-preorder-panel";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { parsePreorderHours, parsePreorderWeekdays } from "@/lib/preorder";

export const dynamic = "force-dynamic";

export default async function RestaurantPreorderPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.preorderTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  return (
    <RestaurantAppShell title={t.preorderTitle} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantPreorderPanel
        initial={{
          preorderEnabled: restaurant.preorderEnabled,
          preorderMaxDaysAhead: restaurant.preorderMaxDaysAhead,
          preorderMinLeadMinutes: restaurant.preorderMinLeadMinutes,
          preorderWeekdays: parsePreorderWeekdays(restaurant.preorderWeekdaysJson),
          preorderHours: parsePreorderHours(restaurant.preorderHoursJson),
          preorderDelivery: restaurant.preorderDelivery,
          preorderPickup: restaurant.preorderPickup,
          preorderMaxConcurrent: restaurant.preorderMaxConcurrent,
        }}
      />
    </RestaurantAppShell>
  );
}

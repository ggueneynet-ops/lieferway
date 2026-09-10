import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { interpolate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function RestaurantReviewsPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.rpReviews}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  return (
    <RestaurantAppShell title={t.rpReviews} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <h1 className="mb-3 text-lg font-semibold">{t.rpReviews}</h1>
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <p className="text-3xl font-semibold">{restaurant.rating.toFixed(1)}</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          {interpolate(t.rpReviewsStub, {
            rating: restaurant.rating.toFixed(1),
            count: String(restaurant.reviewCount),
          })}
        </p>
      </div>
    </RestaurantAppShell>
  );
}

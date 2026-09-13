import { RestaurantAppShell } from "@/components/restaurant-app-shell";
import { RestaurantBannerPanel } from "@/components/restaurant-banner-panel";
import { requireOwnedRestaurant } from "@/lib/restaurant-access";
import { getCopy } from "@/lib/get-locale";
import { isBannerLive } from "@/lib/preorder";

export const dynamic = "force-dynamic";

export default async function RestaurantBannerPage() {
  const { restaurant } = await requireOwnedRestaurant();
  const { t } = await getCopy();
  if (!restaurant) {
    return (
      <RestaurantAppShell title={t.bannerTitle}>
        <p className="text-sm text-[#6B7280]">{t.noRestaurantYet}</p>
      </RestaurantAppShell>
    );
  }

  return (
    <RestaurantAppShell title={t.bannerTitle} restaurantName={restaurant.name} isOpen={restaurant.isOpen}>
      <RestaurantBannerPanel
        initial={{
          bannerText: restaurant.bannerText,
          bannerActive: restaurant.bannerActive,
          bannerStartsAt: restaurant.bannerStartsAt?.toISOString() ?? null,
          bannerEndsAt: restaurant.bannerEndsAt?.toISOString() ?? null,
          live: isBannerLive(restaurant),
        }}
      />
    </RestaurantAppShell>
  );
}
